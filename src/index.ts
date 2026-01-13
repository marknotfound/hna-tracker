import * as fs from "fs";
import * as path from "path";
import { scrapeStandings } from "./scraper";
import { scrapePlayerStats } from "./playerStatsScraper";
import { scrapeGoalieStats } from "./goalieStatsScraper";
import {
  DailySnapshot,
  SnapshotIndex,
  DIVISION_NAMES,
  PlayerStatsSnapshot,
  PlayerStatsIndex,
  GoalieStatsSnapshot,
  GoalieStatsIndex,
} from "./types";

const DATA_DIR = path.join(__dirname, "..", "data");
const SNAPSHOTS_DIR = path.join(DATA_DIR, "snapshots");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

// Player stats directories
const PLAYER_STATS_DIR = path.join(DATA_DIR, "player-stats");
const PLAYER_STATS_SNAPSHOTS_DIR = path.join(PLAYER_STATS_DIR, "snapshots");
const PLAYER_STATS_INDEX_FILE = path.join(PLAYER_STATS_DIR, "index.json");

// Goalie stats directories
const GOALIE_STATS_DIR = path.join(DATA_DIR, "goalie-stats");
const GOALIE_STATS_SNAPSHOTS_DIR = path.join(GOALIE_STATS_DIR, "snapshots");
const GOALIE_STATS_INDEX_FILE = path.join(GOALIE_STATS_DIR, "index.json");

/**
 * Ensure the data directories exist
 */
function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PLAYER_STATS_DIR)) {
    fs.mkdirSync(PLAYER_STATS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PLAYER_STATS_SNAPSHOTS_DIR)) {
    fs.mkdirSync(PLAYER_STATS_SNAPSHOTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(GOALIE_STATS_DIR)) {
    fs.mkdirSync(GOALIE_STATS_DIR, { recursive: true });
  }
  if (!fs.existsSync(GOALIE_STATS_SNAPSHOTS_DIR)) {
    fs.mkdirSync(GOALIE_STATS_SNAPSHOTS_DIR, { recursive: true });
  }
}

/**
 * Load the current index file or create a new one
 */
function loadIndex(): SnapshotIndex {
  if (fs.existsSync(INDEX_FILE)) {
    const content = fs.readFileSync(INDEX_FILE, "utf-8");
    return JSON.parse(content);
  }
  return {
    divisions: [...DIVISION_NAMES],
    dates: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Load the player stats index file or create a new one
 */
function loadPlayerStatsIndex(): PlayerStatsIndex {
  if (fs.existsSync(PLAYER_STATS_INDEX_FILE)) {
    const content = fs.readFileSync(PLAYER_STATS_INDEX_FILE, "utf-8");
    return JSON.parse(content);
  }
  return {
    divisions: [...DIVISION_NAMES],
    dates: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Load the goalie stats index file or create a new one
 */
function loadGoalieStatsIndex(): GoalieStatsIndex {
  if (fs.existsSync(GOALIE_STATS_INDEX_FILE)) {
    const content = fs.readFileSync(GOALIE_STATS_INDEX_FILE, "utf-8");
    return JSON.parse(content);
  }
  return {
    divisions: [...DIVISION_NAMES],
    dates: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save snapshot to disk and update the index
 */
function saveSnapshot(snapshot: DailySnapshot): void {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${snapshot.date}.json`);

  // Write the snapshot file
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`Saved snapshot to: ${snapshotPath}`);

  // Update the index
  const index = loadIndex();

  // Add date if not already present
  if (!index.dates.includes(snapshot.date)) {
    index.dates.push(snapshot.date);
    // Sort dates in descending order (newest first)
    index.dates.sort((a, b) => b.localeCompare(a));
  }

  index.lastUpdated = new Date().toISOString();

  // Write the updated index
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Updated index file: ${INDEX_FILE}`);
}

/**
 * Save player stats snapshot to disk and update the index
 */
function savePlayerStatsSnapshot(snapshot: PlayerStatsSnapshot): void {
  const snapshotPath = path.join(
    PLAYER_STATS_SNAPSHOTS_DIR,
    `${snapshot.date}.json`,
  );

  // Write the snapshot file
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`Saved player stats snapshot to: ${snapshotPath}`);

  // Update the index
  const index = loadPlayerStatsIndex();

  // Add date if not already present
  if (!index.dates.includes(snapshot.date)) {
    index.dates.push(snapshot.date);
    // Sort dates in descending order (newest first)
    index.dates.sort((a, b) => b.localeCompare(a));
  }

  index.lastUpdated = new Date().toISOString();

  // Write the updated index
  fs.writeFileSync(PLAYER_STATS_INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Updated player stats index file: ${PLAYER_STATS_INDEX_FILE}`);
}

/**
 * Save goalie stats snapshot to disk and update the index
 */
function saveGoalieStatsSnapshot(snapshot: GoalieStatsSnapshot): void {
  const snapshotPath = path.join(
    GOALIE_STATS_SNAPSHOTS_DIR,
    `${snapshot.date}.json`,
  );

  // Write the snapshot file
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`Saved goalie stats snapshot to: ${snapshotPath}`);

  // Update the index
  const index = loadGoalieStatsIndex();

  // Add date if not already present
  if (!index.dates.includes(snapshot.date)) {
    index.dates.push(snapshot.date);
    // Sort dates in descending order (newest first)
    index.dates.sort((a, b) => b.localeCompare(a));
  }

  index.lastUpdated = new Date().toISOString();

  // Write the updated index
  fs.writeFileSync(GOALIE_STATS_INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Updated goalie stats index file: ${GOALIE_STATS_INDEX_FILE}`);
}

/**
 * Check if today's snapshot already exists
 */
function snapshotExists(date: string): boolean {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${date}.json`);
  return fs.existsSync(snapshotPath);
}

/**
 * Check if today's player stats snapshot already exists
 */
function playerStatsSnapshotExists(date: string): boolean {
  const snapshotPath = path.join(PLAYER_STATS_SNAPSHOTS_DIR, `${date}.json`);
  return fs.existsSync(snapshotPath);
}

/**
 * Check if today's goalie stats snapshot already exists
 */
function goalieStatsSnapshotExists(date: string): boolean {
  const snapshotPath = path.join(GOALIE_STATS_SNAPSHOTS_DIR, `${date}.json`);
  return fs.existsSync(snapshotPath);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log("HNA Standings Tracker - Daily Scraper");
  console.log("=====================================\n");

  // Ensure directories exist
  ensureDirectories();

  // Check for --force flag
  const forceRun = process.argv.includes("--force");

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Check if we already have today's snapshots
  const standingsExist = snapshotExists(today);
  const playerStatsExist = playerStatsSnapshotExists(today);
  const goalieStatsExist = goalieStatsSnapshotExists(today);

  if (!forceRun && standingsExist && playerStatsExist && goalieStatsExist) {
    console.log(
      `All snapshots for ${today} already exist. Use --force to overwrite.`,
    );
    return;
  }

  try {
    // Scrape standings if needed
    if (forceRun || !standingsExist) {
      console.log("Scraping HNA standings...");
      const snapshot = await scrapeStandings();

      // Validate that we got data
      const totalTeams = Object.values(snapshot.divisions).reduce(
        (sum, teams) => sum + teams.length,
        0,
      );

      if (totalTeams === 0) {
        console.error("Error: No teams found in standings data!");
        process.exit(1);
      }

      console.log(
        `\nFound ${totalTeams} teams across ${
          Object.keys(snapshot.divisions).length
        } divisions:`,
      );
      for (const [division, teams] of Object.entries(snapshot.divisions)) {
        console.log(`  - ${division}: ${teams.length} teams`);
      }

      // Save the snapshot
      console.log("\nSaving standings snapshot...");
      saveSnapshot(snapshot);
    } else {
      console.log(`Standings snapshot for ${today} already exists, skipping.`);
    }

    // Scrape player stats if needed
    if (forceRun || !playerStatsExist) {
      console.log("\nScraping HNA player stats...");
      const playerStatsSnapshot = await scrapePlayerStats();

      // Validate that we got data
      const totalPlayers = Object.values(playerStatsSnapshot.divisions).reduce(
        (sum, players) => sum + players.length,
        0,
      );

      if (totalPlayers === 0) {
        console.error("Warning: No players found in stats data!");
      } else {
        console.log(
          `\nFound ${totalPlayers} players across ${
            Object.keys(playerStatsSnapshot.divisions).length
          } divisions:`,
        );
        for (const [division, players] of Object.entries(
          playerStatsSnapshot.divisions,
        )) {
          console.log(`  - ${division}: ${players.length} players`);
        }
      }

      // Save the player stats snapshot
      console.log("\nSaving player stats snapshot...");
      savePlayerStatsSnapshot(playerStatsSnapshot);
    } else {
      console.log(
        `Player stats snapshot for ${today} already exists, skipping.`,
      );
    }

    // Scrape goalie stats if needed
    if (forceRun || !goalieStatsExist) {
      console.log("\nScraping HNA goalie stats...");
      const goalieStatsSnapshot = await scrapeGoalieStats();

      // Validate that we got data
      const totalGoalies = Object.values(goalieStatsSnapshot.divisions).reduce(
        (sum, goalies) => sum + goalies.length,
        0,
      );

      if (totalGoalies === 0) {
        console.error("Warning: No goalies found in stats data!");
      } else {
        console.log(
          `\nFound ${totalGoalies} goalies across ${
            Object.keys(goalieStatsSnapshot.divisions).length
          } divisions:`,
        );
        for (const [division, goalies] of Object.entries(
          goalieStatsSnapshot.divisions,
        )) {
          console.log(`  - ${division}: ${goalies.length} goalies`);
        }
      }

      // Save the goalie stats snapshot
      console.log("\nSaving goalie stats snapshot...");
      saveGoalieStatsSnapshot(goalieStatsSnapshot);
    } else {
      console.log(
        `Goalie stats snapshot for ${today} already exists, skipping.`,
      );
    }

    console.log("\nDone!");
  } catch (error) {
    console.error("Error scraping data:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});


