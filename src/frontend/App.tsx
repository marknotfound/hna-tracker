import React, { useState, useEffect, useCallback } from "react";
import {
  DivisionName,
  DIVISION_NAMES,
  DailySnapshot,
  SnapshotIndex,
  PlayerStatsSnapshot,
  PlayerStatsIndex,
} from "./types";
import StandingsChart from "./StandingsChart";
import PlayerStatsChart from "./PlayerStatsChart";
import DivisionToggle from "./DivisionToggle";

// Data base URL - use relative path that works in both dev and production
const DATA_BASE_URL = "./data";
const PLAYER_STATS_BASE_URL = "./data/player-stats";

function App() {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [playerStatsSnapshots, setPlayerStatsSnapshots] = useState<
    PlayerStatsSnapshot[]
  >([]);
  const [selectedDivision, setSelectedDivision] =
    useState<DivisionName>("1-BRODEUR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          Hockey North America - New Jersey Division Standings Over Time
        </p>
      </header>

      <main className="main">
        <DivisionToggle
          divisions={DIVISION_NAMES as unknown as DivisionName[]}
          selected={selectedDivision}
          onChange={handleDivisionChange}
        />

        <div className="chart-container">
          <StandingsChart snapshots={snapshots} division={selectedDivision} />
        </div>

        {playerStatsSnapshots.length > 0 && (
          <>
            <h2 className="section-title">Player Statistics</h2>

            <div className="chart-container">
              <PlayerStatsChart
                snapshots={playerStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="goals"
                topN={10}
              />
            </div>

            <div className="chart-container">
              <PlayerStatsChart
                snapshots={playerStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="assists"
                topN={10}
              />
            </div>

            <div className="chart-container">
              <PlayerStatsChart
                snapshots={playerStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="points"
                topN={10}
              />
            </div>
          </>
        )}

        <div className="stats-summary">
          <p>
            <strong>{snapshots.length}</strong> standings snapshots from{" "}
            <strong>{snapshots[0]?.date || "N/A"}</strong> to{" "}
            <strong>{snapshots[snapshots.length - 1]?.date || "N/A"}</strong>
            {playerStatsSnapshots.length > 0 && (
              <>
                {" "}
                | <strong>{playerStatsSnapshots.length}</strong> player stats
                snapshots
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
          . Updated daily via GitHub Actions.
        </p>
      </footer>
    </div>
  );
}

export default App;
