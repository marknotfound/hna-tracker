import assert from "node:assert/strict";
import test from "node:test";
import { fetchHnaPage, HNA_USER_AGENT } from "./seasons";

const url =
  "https://www.hna.com/leagues/standings.cfm?leagueID=5750&clientID=2296";

test("fetches league HTML with the configured user agent and a timeout", async (t) => {
  const html =
    "<html><body><table><tr><td>Ice Pack</td></tr></table></body></html>";
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string, init: RequestInit) => {
      assert.equal(input, url);
      assert.deepEqual(init.headers, { "User-Agent": HNA_USER_AGENT });
      assert.ok(init.signal instanceof AbortSignal);
      return new Response(html, { headers: { "content-type": "text/html" } });
    },
  );

  assert.equal(await fetchHnaPage(url), html);
});

for (const status of [403, 429, 500]) {
  test(`rejects HTTP ${status} without retrying or returning its body`, async (t) => {
    const fetchMock = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response("<html><body>Error</body></html>", { status }),
    );

    await assert.rejects(fetchHnaPage(url), (error: Error) => {
      assert.match(error.message, new RegExp(String(status)));
      assert.ok(error.message.includes(url));
      if (status === 403 || status === 429) {
        assert.match(error.message, /denying or limiting access/);
      }
      return true;
    });
    assert.equal(fetchMock.mock.callCount(), 1);
  });
}

for (const apostrophe of ["'", "&#39;", "’"]) {
  test(`rejects HTTP-200 robot verification with ${apostrophe}`, async (t) => {
    t.mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response(`
      <html><head><title>JavaScript is disabled</title></head><body>
        <h1>JavaScript is disabled</h1>
        <p>In order to continue, we need to verify that you${apostrophe}re not a robot.</p>
        <p>This requires JavaScript. Enable JavaScript and then reload the page.</p>
      </body></html>
    `),
    );

    await assert.rejects(
      fetchHnaPage(url),
      /robot-verification page.*HTTP 200/s,
    );
  });
}

test("does not treat verification text inside scripts as a blocked page", async (t) => {
  const html = `<html><body><table><tr><td>Ice Pack</td></tr></table>
    <script>const message = "verify that you're not a robot";</script></body></html>`;
  t.mock.method(globalThis, "fetch", async () => new Response(html));

  assert.equal(await fetchHnaPage(url), html);
});

test("propagates a network failure instead of returning empty data", async (t) => {
  const error = new Error("connection failed");
  t.mock.method(globalThis, "fetch", async () => {
    throw error;
  });

  await assert.rejects(fetchHnaPage(url), error);
});
