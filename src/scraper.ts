import * as cheerio from "cheerio";
import { DailySnapshot, TeamStanding } from "./types";
import {
  SeasonConfig,
  buildStandingsUrl,
  fetchHnaPage,
  getCurrentSeason,
} from "./seasons";

/**
 * Fetch and parse HNA standings for a season using Cheerio.
 *
 * Standings tables appear in the same order as the season's divisions, and the
 * column layout (which differs between seasons) comes from the season config.
 */
export async function scrapeStandings(
  season: SeasonConfig = getCurrentSeason(),
): Promise<DailySnapshot> {
  console.log(`Fetching HNA standings page for ${season.label}...`);

  const html = await fetchHnaPage(buildStandingsUrl(season));
  const $ = cheerio.load(html);

  console.log("Parsing standings data...");

  const cols = season.standingsColumns;
  // A standings row needs at least as many cells as the highest column index
  // we read, plus the team name in cell 0.
  const minCells =
    Math.max(
      cols.gp,
      cols.w,
      cols.l,
      cols.t,
      cols.otl ?? 0,
      cols.pts,
      cols.wpct,
    ) + 1;

  const divisions: Record<string, TeamStanding[]> = {};

  // Find all tables that look like standings tables (rows with enough cells).
  const standingsTables: ReturnType<typeof $>[] = [];

  $("table").each(function () {
    const rows = $(this).find("tbody tr");

    let hasStandingsData = false;
    rows.each(function () {
      if ($(this).find("td").length >= minCells) {
        hasStandingsData = true;
        return false; // break
      }
    });

    if (hasStandingsData) {
      standingsTables.push($(this));
    }
  });

  console.log(`Found ${standingsTables.length} standings tables`);

  // Table order determines division assignment. A missing or additional table
  // would shift teams into the wrong division, so do not save a partial result.
  if (standingsTables.length !== season.divisions.length) {
    const title = $("title").text().replace(/\s+/g, " ").trim().slice(0, 120);
    throw new Error(
      `Invalid standings page for ${season.label}: expected ` +
        `${season.divisions.length} division tables, found ${standingsTables.length} ` +
        `usable standings tables out of ${$("table").length} HTML tables ` +
        `(rows require at least ${minCells} cells). ` +
        `Page title: ${JSON.stringify(title || "(none)")}. ` +
        `Source: ${buildStandingsUrl(season)}. No standings snapshot will be saved.`,
    );
  }

  // Match tables to divisions in order.
  season.divisions.forEach((division, index) => {
    const teams: TeamStanding[] = [];

    if (index < standingsTables.length) {
      const table = standingsTables[index];
      const rows = table.find("tbody tr");

      rows.each(function () {
        const cells = $(this).find("td");

        if (cells.length >= minCells) {
          // Get team name and abbreviation from the link inside the first cell.
          // Structure: <a><span class="d-sm-inline">Full Name</span><span class="d-sm-none">ABBR</span></a>
          const teamCell = cells.eq(0);
          const teamLink = teamCell.find("a");
          let teamName = "";
          let teamAbbr = "";

          if (teamLink.length > 0) {
            const fullNameSpan = teamLink.find("span.d-sm-inline");
            if (fullNameSpan.length > 0) {
              teamName = fullNameSpan.text().trim();
            } else {
              teamName = teamLink.text().trim();
            }

            const abbrSpan = teamLink.find("span.d-sm-none");
            if (abbrSpan.length > 0) {
              teamAbbr = abbrSpan.text().trim();
            }
          } else {
            teamName = teamCell.text().trim();
          }

          // Skip if it looks like a header.
          if (!teamName || teamName.toLowerCase() === "team") {
            return;
          }

          teams.push({
            team: teamName,
            abbr: teamAbbr || undefined,
            gp: parseInt(cells.eq(cols.gp).text().trim(), 10) || 0,
            w: parseInt(cells.eq(cols.w).text().trim(), 10) || 0,
            l: parseInt(cells.eq(cols.l).text().trim(), 10) || 0,
            t: parseInt(cells.eq(cols.t).text().trim(), 10) || 0,
            otl:
              cols.otl === null
                ? 0
                : parseInt(cells.eq(cols.otl).text().trim(), 10) || 0,
            pts: parseInt(cells.eq(cols.pts).text().trim(), 10) || 0,
            wpct: parseFloat(cells.eq(cols.wpct).text().trim()) || 0,
            position: teams.length + 1, // 1-indexed position
          });
        }
      });
    }

    divisions[division.name] = teams;
    console.log(`  ${division.name}: ${teams.length} teams`);
  });

  const emptyDivisions = season.divisions
    .filter((division) => divisions[division.name].length === 0)
    .map((division) => division.name);
  if (emptyDivisions.length > 0) {
    throw new Error(
      `No teams parsed for ${emptyDivisions.join(", ")}. ` +
        "No standings snapshot will be saved.",
    );
  }

  const snapshot: DailySnapshot = {
    date: getTodayISO(),
    divisions,
  };

  return snapshot;
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
function getTodayISO(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export { getTodayISO };
