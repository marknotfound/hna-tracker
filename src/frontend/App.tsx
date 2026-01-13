import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  DivisionName,
  DIVISION_NAMES,
  DailySnapshot,
  SnapshotIndex,
  PlayerStatsSnapshot,
  PlayerStatsIndex,
  GoalieStatsSnapshot,
  GoalieStatsIndex,
  GOALIE_MIN_GP,
} from "./types";
import StandingsChart from "./StandingsChart";
import PlayerStatsChart from "./PlayerStatsChart";
import GoalieStatsChart from "./GoalieStatsChart";
import DivisionToggle from "./DivisionToggle";
import { useIsMobile } from "./useIsMobile";
import { sampleSnapshots } from "./sampleSnapshots";

// Data base URL - use relative path that works in both dev and production
const DATA_BASE_URL = "./data";
const PLAYER_STATS_BASE_URL = "./data/player-stats";
const GOALIE_STATS_BASE_URL = "./data/goalie-stats";

// Check for goalie stats feature flag in URL query string
const urlParams = new URLSearchParams(window.location.search);

function App() {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [playerStatsSnapshots, setPlayerStatsSnapshots] = useState<
    PlayerStatsSnapshot[]
  >([]);
  const [goalieStatsSnapshots, setGoalieStatsSnapshots] = useState<
    GoalieStatsSnapshot[]
  >([]);
  const [selectedDivision, setSelectedDivision] =
    useState<DivisionName>("1-BRODEUR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Sample snapshots for chart display (28 on desktop, 14 on mobile)
  const sampledSnapshots = useMemo(
    () => sampleSnapshots(snapshots, isMobile),
    [snapshots, isMobile],
  );
  const sampledPlayerStatsSnapshots = useMemo(
    () => sampleSnapshots(playerStatsSnapshots, isMobile),
    [playerStatsSnapshots, isMobile],
  );
  const sampledGoalieStatsSnapshots = useMemo(
    () => sampleSnapshots(goalieStatsSnapshots, isMobile),
    [goalieStatsSnapshots, isMobile],
  );

  // Load data on mount
  useEffect(() => {
    loadData();

    // Handle URL hash for division selection
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && DIVISION_NAMES.includes(hash as DivisionName)) {
        setSelectedDivision(hash as DivisionName);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try to load the standings index
      const indexResponse = await fetch(`${DATA_BASE_URL}/index.json`);

      if (!indexResponse.ok) {
        throw new Error(
          "No data available yet. Run the scraper first: yarn scrape",
        );
      }

      const index: SnapshotIndex = await indexResponse.json();

      if (index.dates.length === 0) {
        throw new Error("No snapshots available yet. Run: yarn scrape");
      }

      // Load all standings snapshots in parallel
      const snapshotPromises = index.dates.map(async (date) => {
        const response = await fetch(`${DATA_BASE_URL}/snapshots/${date}.json`);
        if (!response.ok) {
          console.warn(`Failed to load snapshot for ${date}`);
          return null;
        }
        return response.json() as Promise<DailySnapshot>;
      });

      const loadedSnapshots = await Promise.all(snapshotPromises);
      const validSnapshots = loadedSnapshots.filter(
        (s): s is DailySnapshot => s !== null,
      );

      // Sort by date ascending for chart display
      validSnapshots.sort((a, b) => a.date.localeCompare(b.date));

      setSnapshots(validSnapshots);

      // Try to load player stats (may not exist yet)
      try {
        const playerStatsIndexResponse = await fetch(
          `${PLAYER_STATS_BASE_URL}/index.json`,
        );

        if (playerStatsIndexResponse.ok) {
          const playerStatsIndex: PlayerStatsIndex =
            await playerStatsIndexResponse.json();

          if (playerStatsIndex.dates.length > 0) {
            // Load all player stats snapshots in parallel
            const playerStatsPromises = playerStatsIndex.dates.map(
              async (date) => {
                const response = await fetch(
                  `${PLAYER_STATS_BASE_URL}/snapshots/${date}.json`,
                );
                if (!response.ok) {
                  console.warn(`Failed to load player stats for ${date}`);
                  return null;
                }
                return response.json() as Promise<PlayerStatsSnapshot>;
              },
            );

            const loadedPlayerStats = await Promise.all(playerStatsPromises);
            const validPlayerStats = loadedPlayerStats.filter(
              (s): s is PlayerStatsSnapshot => s !== null,
            );

            // Sort by date ascending for chart display
            validPlayerStats.sort((a, b) => a.date.localeCompare(b.date));

            setPlayerStatsSnapshots(validPlayerStats);
          }
        }
      } catch (playerStatsErr) {
        // Player stats not available yet, that's okay
        console.warn("Player stats not available yet:", playerStatsErr);
      }

      // Try to load goalie stats if feature flag is enabled (may not exist yet)
      try {
        const goalieStatsIndexResponse = await fetch(
          `${GOALIE_STATS_BASE_URL}/index.json`,
        );

        if (goalieStatsIndexResponse.ok) {
          const goalieStatsIndex: GoalieStatsIndex =
            await goalieStatsIndexResponse.json();

          if (goalieStatsIndex.dates.length > 0) {
            // Load all goalie stats snapshots in parallel
            const goalieStatsPromises = goalieStatsIndex.dates.map(
              async (date) => {
                const response = await fetch(
                  `${GOALIE_STATS_BASE_URL}/snapshots/${date}.json`,
                );
                if (!response.ok) {
                  console.warn(`Failed to load goalie stats for ${date}`);
                  return null;
                }
                return response.json() as Promise<GoalieStatsSnapshot>;
              },
            );

            const loadedGoalieStats = await Promise.all(goalieStatsPromises);
            const validGoalieStats = loadedGoalieStats.filter(
              (s): s is GoalieStatsSnapshot => s !== null,
            );

            // Sort by date ascending for chart display
            validGoalieStats.sort((a, b) => a.date.localeCompare(b.date));

            setGoalieStatsSnapshots(validGoalieStats);
          }
        }
      } catch (goalieStatsErr) {
        // Goalie stats not available yet, that's okay
        console.warn("Goalie stats not available yet:", goalieStatsErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDivisionChange = useCallback((division: DivisionName) => {
    setSelectedDivision(division);
    window.location.hash = division;
  }, []);

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>HNA Standings Tracker</h1>
        </header>
        <main className="main">
          <div className="loading">
            <div className="loading-spinner" />
            <p>Loading standings data...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="header">
          <h1>HNA Standings Tracker</h1>
        </header>
        <main className="main">
          <div className="error">
            <h2>Unable to Load Data</h2>
            <p>{error}</p>
            <button onClick={loadData} className="retry-button">
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>HNA Standings Tracker</h1>
        <p className="subtitle">
          New Jersey Standings Over Time
        </p>
      </header>

      <main className="main">
        <DivisionToggle
          divisions={DIVISION_NAMES as unknown as DivisionName[]}
          selected={selectedDivision}
          onChange={handleDivisionChange}
        />

        <div className="chart-container">
          <StandingsChart snapshots={sampledSnapshots} division={selectedDivision} />
        </div>

        {playerStatsSnapshots.length > 0 && (
          <>
            <h2 className="section-title">Player Statistics</h2>

            <div className="chart-container">
              <PlayerStatsChart
                snapshots={sampledPlayerStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="goals"
                topN={10}
              />
            </div>

            <div className="chart-container">
              <PlayerStatsChart
                snapshots={sampledPlayerStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="assists"
                topN={10}
              />
            </div>

            <div className="chart-container">
              <PlayerStatsChart
                snapshots={sampledPlayerStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="points"
                topN={10}
              />
            </div>
          </>
        )}

        {goalieStatsSnapshots.length > 0 && (
          <>
            <h2 className="section-title">Goalie Statistics</h2>
            <p className="stats-note">
              Only goalies with minimum {GOALIE_MIN_GP} games played in the selected
              division are represented.
            </p>

            <div className="chart-container">
              <GoalieStatsChart
                snapshots={sampledGoalieStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="svPct"
                topN={10}
              />
            </div>

            <div className="chart-container">
              <GoalieStatsChart
                snapshots={sampledGoalieStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="gaa"
                topN={10}
              />
            </div>

            <div className="chart-container">
              <GoalieStatsChart
                snapshots={sampledGoalieStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="so"
                topN={10}
              />
            </div>
          </>
        )}

        <div className="stats-summary">
          <p>
            Showing <strong>{sampledSnapshots.length}</strong> of{" "}
            <strong>{snapshots.length}</strong> snapshots from{" "}
            <strong>{sampledSnapshots[0]?.date || "N/A"}</strong> to{" "}
            <strong>{sampledSnapshots[sampledSnapshots.length - 1]?.date || "N/A"}</strong>
            {sampledPlayerStatsSnapshots.length > 0 && (
              <>
                {" "}
                | <strong>{sampledPlayerStatsSnapshots.length}</strong> player stats
                data points
              </>
            )}
          </p>
        </div>
      </main>

      <footer className="footer">
        <p>
          Data sourced from{" "}
          <a
            href="https://www.hna.com/leagues/standings.cfm?leagueID=5750&clientID=2296"
            target="_blank"
            rel="noopener noreferrer"
          >
            Hockey North America
          </a>
          .
        </p>
        <div className="social-links">
          <a
            href="https://github.com/marknotfound/hna-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            aria-label="View source on GitHub"
          >
            <svg
              height="24"
              width="24"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/themarkdunphy/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            aria-label="Connect on LinkedIn"
          >
            <svg
              height="24"
              width="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
