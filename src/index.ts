import * as fs from "fs";
import * as path from "path";
import { scrapeStandings } from "./scraper";
import { DailySnapshot, SnapshotIndex, DIVISION_NAMES } from "./types";

const DATA_DIR = path.join(__dirname, "..", "data");
const SNAPSHOTS_DIR = path.join(DATA_DIR, "snapshots");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

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
 * Check if today's snapshot already exists
 */
function snapshotExists(date: string): boolean {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${date}.json`);
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

  // Check if we already have today's snapshot
  if (!forceRun && snapshotExists(today)) {
    console.log(
      `Snapshot for ${today} already exists. Use --force to overwrite.`
    );
    return;
  }

  try {
    // Scrape the standings
    console.log("Scraping HNA standings...");
    const snapshot = await scrapeStandings();

    // Validate that we got data
    const totalTeams = Object.values(snapshot.divisions).reduce(
      (sum, teams) => sum + teams.length,
      0
    );

    if (totalTeams === 0) {
      console.error("Error: No teams found in standings data!");
      process.exit(1);
    }

    console.log(
      `\nFound ${totalTeams} teams across ${
        Object.keys(snapshot.divisions).length
      } divisions:`
    );
    for (const [division, teams] of Object.entries(snapshot.divisions)) {
      console.log(`  - ${division}: ${teams.length} teams`);
    }

    // Save the snapshot
    console.log("\nSaving snapshot...");
    saveSnapshot(snapshot);

    console.log("\nDone!");
  } catch (error) {
    console.error("Error scraping standings:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
