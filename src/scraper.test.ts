import assert from "node:assert/strict";
import test, { TestContext } from "node:test";
import { scrapeStandings } from "./scraper";
import { getCurrentSeason, getSeason } from "./seasons";

// Synthetic fixtures reproduce the documented table layout. They are not a
// capture of HNA's currently inaccessible response or a live-access test.
function table(team: string, stats = [4, 2, 1, 0, 1, 5, 0.625]): string {
  return `<table><thead><tr><th>Team</th><th>GP</th></tr></thead><tbody><tr>
    <td><a><span class="d-sm-inline">${team}</span><span class="d-sm-none">ABC</span></a></td>
    ${stats.map((value) => `<td>${value}</td>`).join("")}
    </tr></tbody></table>`;
}

function respondWith(t: TestContext, html: string): void {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(html, {
        headers: { "content-type": "text/html" },
      }),
  );
}

test("parses every winter division and preserves standings values", async (t) => {
  const season = getCurrentSeason();
  respondWith(t, season.divisions.map((d) => table(d.name)).join(""));

  const snapshot = await scrapeStandings(season);
  assert.match(snapshot.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(
    Object.keys(snapshot.divisions),
    season.divisions.map((d) => d.name),
  );
  for (const division of season.divisions) {
    assert.deepEqual(snapshot.divisions[division.name], [
      {
        team: division.name,
        abbr: "ABC",
        gp: 4,
        w: 2,
        l: 1,
        t: 0,
        otl: 1,
        pts: 5,
        wpct: 0.625,
        position: 1,
      },
    ]);
  }
});

test("preserves the summer column layout without OTL", async (t) => {
  const season = getSeason("summer-2026")!;
  respondWith(
    t,
    season.divisions.map((d) => table(d.name, [4, 2, 1, 1, 5, 0.625])).join(""),
  );

  const snapshot = await scrapeStandings(season);
  assert.equal(snapshot.divisions.Canes[0].otl, 0);
  assert.equal(snapshot.divisions.Canes[0].pts, 5);
  assert.equal(snapshot.divisions.Canes[0].wpct, 0.625);
});

test("reports actual versus usable table counts when the layout is unexpected", async (t) => {
  respondWith(
    t,
    "<title>HNA unavailable</title><table><tr><td>No data</td></tr></table>",
  );

  await assert.rejects(scrapeStandings(), (error: Error) => {
    assert.match(
      error.message,
      /expected 5 division tables, found 0 usable standings tables out of 1 HTML tables/,
    );
    assert.match(error.message, /rows require at least 8 cells/);
    assert.match(error.message, /HNA unavailable/);
    assert.match(error.message, /No standings snapshot will be saved/);
    return true;
  });
});

for (const count of [0, 4, 6]) {
  test(`rejects ${count} division tables rather than misassigning or saving partial data`, async (t) => {
    respondWith(
      t,
      Array.from({ length: count }, (_, i) => table(`Team ${i}`)).join(""),
    );

    await assert.rejects(
      scrapeStandings(),
      /Invalid standings page.*expected 5 division tables/,
    );
  });
}

test("rejects a division with no real team rows", async (t) => {
  respondWith(
    t,
    [
      table("Team"),
      ...Array.from({ length: 4 }, (_, i) => table(`Club ${i}`)),
    ].join(""),
  );

  await assert.rejects(scrapeStandings(), /No teams parsed for 1-BRODEUR/);
});

test("rejects a verification page before attempting to parse standings", async (t) => {
  respondWith(
    t,
    "<body>In order to continue, we need to verify that you're not a robot.</body>",
  );

  await assert.rejects(scrapeStandings(), /robot-verification page/);
});
