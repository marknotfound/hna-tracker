import * as cheerio from "cheerio";
import {
  PlayerStatsSnapshot,
  PlayerStats,
  DIVISION_NAMES,
  DIVISION_IDS,
  DivisionName,
} from "./types";

const HNA_STATS_BASE_URL =
  "https://www.hna.com/leagues/stats_hockey.cfm?leagueID=5750&clientID=2296&printPage=1";

/**
 * Fetch and parse player stats for a specific division
 */
async function scrapeDivisionStats(
  divisionName: DivisionName,
): Promise<PlayerStats[]> {
  const divisionId = DIVISION_IDS[divisionName];
  const url = `${HNA_STATS_BASE_URL}&divID=${divisionId}`;

  console.log(`  Fetching ${divisionName} stats...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch stats for ${divisionName}: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const players: PlayerStats[] = [];

  // Find the stats table - it should have a header row with "Player", "GP", "G", "A", etc.
  $("table").each(function () {
    const table = $(this);
    const headerRow = table.find("thead tr, tr").first();
    const headerText = headerRow.text().toLowerCase();

    // Check if this looks like the player stats table
    if (
      headerText.includes("player") &&
      headerText.includes("gp") &&
      headerText.includes("pts")
    ) {
      // Find all data rows in tbody or after header
      const rows = table.find("tbody tr");

      rows.each(function (index) {
        const cells = $(this).find("td");

        // Stats tables have 16 columns: Rank, Player, #, Pos, Team, GP, G, A, PTS, P/G, PPG, PPA, SHG, SHA, GWG, PIM
        if (cells.length >= 16) {
          // Get player name - it's in the second cell (index 1), usually in an anchor
          const playerCell = cells.eq(1);
          const playerLink = playerCell.find("a");
          const playerName = playerLink.length > 0
            ? playerLink.text().trim()
            : playerCell.text().trim();

          // Skip header rows or empty names
          if (
            !playerName ||
            playerName.toLowerCase() === "player" ||
            playerName === ""
          ) {
            return;
          }

          const player: PlayerStats = {
            rank: index + 1, // 1-indexed position
            name: playerName,
            jerseyNumber: cells.eq(2).text().trim(),
            position: cells.eq(3).text().trim(),
            team: cells.eq(4).text().trim(),
            gp: parseInt(cells.eq(5).text().trim(), 10) || 0,
            goals: parseInt(cells.eq(6).text().trim(), 10) || 0,
            assists: parseInt(cells.eq(7).text().trim(), 10) || 0,
            points: parseInt(cells.eq(8).text().trim(), 10) || 0,
            pointsPerGame: parseFloat(cells.eq(9).text().trim()) || 0,
            ppg: parseInt(cells.eq(10).text().trim(), 10) || 0,
            ppa: parseInt(cells.eq(11).text().trim(), 10) || 0,
            shg: parseInt(cells.eq(12).text().trim(), 10) || 0,
            sha: parseInt(cells.eq(13).text().trim(), 10) || 0,
            gwg: parseInt(cells.eq(14).text().trim(), 10) || 0,
            pim: parseInt(cells.eq(15).text().trim(), 10) || 0,
          };

          players.push(player);
        }
      });
    }
  });

  console.log(`    Found ${players.length} players`);
  return players;
}

/**
 * Fetch and parse HNA player stats for all divisions
 */
export async function scrapePlayerStats(): Promise<PlayerStatsSnapshot> {
  console.log("Fetching HNA player stats...");

  const divisions: Record<string, PlayerStats[]> = {};

  // Scrape each division's stats
  for (const divisionName of DIVISION_NAMES) {
    try {
      const stats = await scrapeDivisionStats(divisionName);
      divisions[divisionName] = stats;
    } catch (error) {
      console.error(`  Error scraping ${divisionName}:`, error);
      divisions[divisionName] = [];
    }
  }

  const snapshot: PlayerStatsSnapshot = {
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
