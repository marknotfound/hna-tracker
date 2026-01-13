import * as cheerio from "cheerio";
import {
  GoalieStatsSnapshot,
  GoalieStats,
  DIVISION_NAMES,
  DivisionName,
} from "./types";
import { buildGoalieStatsUrl } from "./config";

/**
 * Fetch and parse goalie stats for a specific division
 */
async function scrapeDivisionGoalieStats(
  divisionName: DivisionName,
): Promise<GoalieStats[]> {
  const url = buildGoalieStatsUrl(divisionName);

  console.log(`  Fetching ${divisionName} goalie stats...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch goalie stats for ${divisionName}: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const goalies: GoalieStats[] = [];

  // Find the goalie stats table with class "leaders"
  const table = $("table.leaders");

  if (table.length > 0) {
    // Find all data rows in tbody
    const rows = table.find("tbody tr");

    rows.each(function (index) {
      const cells = $(this).find("td");

      // Goalie stats tables have 19 columns (including empty first column):
      // [empty], Goalie, Team, GP, W, L, T, OTL, SO, MP, GA, GAA, GSAA, SA, SV, SV%, G, A, PIM
      if (cells.length >= 16) {
        // Get goalie name - the cell is at index 1 (after empty column)
        // Look for the desktop version (d-none d-sm-block span)
        const goalieCell = cells.eq(1);
        const desktopNameSpan = goalieCell.find("span.d-none.d-sm-block a, span.d-sm-block a");
        let goalieName = desktopNameSpan.length > 0
          ? desktopNameSpan.text().trim()
          : goalieCell.text().trim();

        // If we didn't find the desktop name, try the mobile name
        if (!goalieName) {
          const mobileNameSpan = goalieCell.find("span.d-sm-none a");
          goalieName = mobileNameSpan.length > 0
            ? mobileNameSpan.text().trim()
            : goalieCell.text().trim();
        }

        // Skip header rows or empty names
        if (
          !goalieName ||
          goalieName.toLowerCase() === "goalie" ||
          goalieName === ""
        ) {
          return;
        }

        // Get team abbreviation - at index 2
        // The cell has two spans with the same text, just get the first one
        const teamCell = cells.eq(2);
        const teamAbbrSpan = teamCell.find("span").first();
        const team = teamAbbrSpan.length > 0
          ? teamAbbrSpan.text().trim()
          : teamCell.text().trim();

        // Parse SV% - comes as ".876" format, keep as decimal
        // SV% is at index 15 (column 16 in 1-indexed terms)
        const svPctText = cells.eq(15).text().trim();
        const svPct = parseFloat(svPctText) || 0;

        const goalie: GoalieStats = {
          rank: index + 1, // 1-indexed position
          name: goalieName,
          team,
          gp: parseInt(cells.eq(3).text().trim(), 10) || 0,
          w: parseInt(cells.eq(4).text().trim(), 10) || 0,
          l: parseInt(cells.eq(5).text().trim(), 10) || 0,
          t: parseInt(cells.eq(6).text().trim(), 10) || 0,
          otl: parseInt(cells.eq(7).text().trim(), 10) || 0,
          so: parseInt(cells.eq(8).text().trim(), 10) || 0,
          mp: parseInt(cells.eq(9).text().trim(), 10) || 0,
          ga: parseInt(cells.eq(10).text().trim(), 10) || 0,
          gaa: parseFloat(cells.eq(11).text().trim()) || 0,
          gsaa: parseFloat(cells.eq(12).text().trim()) || 0,
          sa: parseInt(cells.eq(13).text().trim(), 10) || 0,
          sv: parseInt(cells.eq(14).text().trim(), 10) || 0,
          svPct,
          goals: parseInt(cells.eq(16).text().trim(), 10) || 0,
          assists: parseInt(cells.eq(17).text().trim(), 10) || 0,
          pim: parseInt(cells.eq(18).text().trim(), 10) || 0,
        };

        goalies.push(goalie);
      }
    });
  }

  console.log(`    Found ${goalies.length} goalies`);
  return goalies;
}

/**
 * Fetch and parse HNA goalie stats for all divisions
 */
export async function scrapeGoalieStats(): Promise<GoalieStatsSnapshot> {
  console.log("Fetching HNA goalie stats...");

  const divisions: Record<string, GoalieStats[]> = {};

  // Scrape each division's stats
  for (const divisionName of DIVISION_NAMES) {
    try {
      const stats = await scrapeDivisionGoalieStats(divisionName);
      divisions[divisionName] = stats;
    } catch (error) {
      console.error(`  Error scraping ${divisionName} goalie stats:`, error);
      divisions[divisionName] = [];
    }
  }

  const snapshot: GoalieStatsSnapshot = {
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
