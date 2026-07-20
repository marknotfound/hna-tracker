import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  DivisionName,
  DailySnapshot,
  SnapshotIndex,
  PlayerStatsSnapshot,
  PlayerStatsIndex,
  GoalieStatsSnapshot,
  GoalieStatsIndex,
  goalieMinGp,
  SeasonInfo,
  SeasonsManifest,
} from "./types";
import StandingsChart from "./StandingsChart";
import PlayerStatsChart from "./PlayerStatsChart";
import GoalieStatsChart from "./GoalieStatsChart";
import DivisionToggle from "./DivisionToggle";
import { useIsMobile } from "./useIsMobile";
import { sampleSnapshots } from "./sampleSnapshots";

// Data base URL - use relative path that works in both dev and production
const DATA_BASE_URL = "./data";

// Per-season data lives under data/seasons/<id>/.
function seasonBaseUrl(seasonId: string): string {
  return `${DATA_BASE_URL}/seasons/${seasonId}`;
}

// Parse the URL hash into a season + division selection. Format:
//   #<seasonId>/<division>
function parseHash(): { seasonId?: string; division?: string } {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};
  const slash = hash.indexOf("/");
  if (slash === -1) {
    // Legacy hash with just a division name.
    return { division: decodeURIComponent(hash) };
  }
  return {
    seasonId: decodeURIComponent(hash.slice(0, slash)),
    division: decodeURIComponent(hash.slice(slash + 1)),
  };
}

function App() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [divisions, setDivisions] = useState<DivisionName[]>([]);
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [playerStatsSnapshots, setPlayerStatsSnapshots] = useState<
    PlayerStatsSnapshot[]
  >([]);
  const [goalieStatsSnapshots, setGoalieStatsSnapshots] = useState<
    GoalieStatsSnapshot[]
  >([]);
  const [selectedDivision, setSelectedDivision] = useState<DivisionName>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const selectedSeason = useMemo(
    () => seasons.find((s) => s.id === selectedSeasonId),
    [seasons, selectedSeasonId],
  );

  // Minimum goalie games played for the selected season (summer uses a lower bar).
  const goalieMin = useMemo(
    () => goalieMinGp(selectedSeasonId),
    [selectedSeasonId],
  );

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

  // Load the seasons manifest, then the default (or hash-selected) season.
  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      setLoading(true);
      setError(null);

      const manifestResponse = await fetch(`${DATA_BASE_URL}/seasons.json`);
      if (!manifestResponse.ok) {
        throw new Error(
          "No data available yet. Run the scraper first: yarn scrape",
        );
      }

      const manifest: SeasonsManifest = await manifestResponse.json();
      if (!manifest.seasons || manifest.seasons.length === 0) {
        throw new Error("No seasons available yet. Run: yarn scrape");
      }

      setSeasons(manifest.seasons);

      // Default to the current season (manifest.defaultSeason), unless the URL
      // hash points at a specific season.
      const { seasonId: hashSeasonId, division: hashDivision } = parseHash();
      const initialSeason =
        manifest.seasons.find((s) => s.id === hashSeasonId) ??
        manifest.seasons.find((s) => s.id === manifest.defaultSeason) ??
        manifest.seasons[0];

      await loadSeasonData(initialSeason, hashDivision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonData = async (
    season: SeasonInfo,
    preferredDivision?: string,
  ) => {
    setSelectedSeasonId(season.id);
    const base = seasonBaseUrl(season.id);

    // Load the standings index for this season.
    const indexResponse = await fetch(`${base}/index.json`);
    if (!indexResponse.ok) {
      throw new Error(`No data available yet for ${season.label}.`);
    }

    const index: SnapshotIndex = await indexResponse.json();

    // Divisions come from the season's index (falling back to the manifest).
    const seasonDivisions =
      index.divisions && index.divisions.length > 0
        ? index.divisions
        : season.divisions;
    setDivisions(seasonDivisions);

    // Pick the division to show: the requested one if it exists this season,
    // otherwise the first division.
    const division =
      preferredDivision && seasonDivisions.includes(preferredDivision)
        ? preferredDivision
        : seasonDivisions[0];
    setSelectedDivision(division);
    updateHash(season.id, division);

    // Load all standings snapshots in parallel.
    const loadedSnapshots = await Promise.all(
      index.dates.map(async (date) => {
        const response = await fetch(`${base}/snapshots/${date}.json`);
        if (!response.ok) {
          console.warn(`Failed to load snapshot for ${date}`);
          return null;
        }
        return response.json() as Promise<DailySnapshot>;
      }),
    );
    const validSnapshots = loadedSnapshots
      .filter((s): s is DailySnapshot => s !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    setSnapshots(validSnapshots);

    // Load player stats (may not exist for a season yet).
    setPlayerStatsSnapshots(
      await loadStatsSnapshots<PlayerStatsSnapshot>(`${base}/player-stats`),
    );

    // Load goalie stats (may not exist for a season yet).
    setGoalieStatsSnapshots(
      await loadStatsSnapshots<GoalieStatsSnapshot>(`${base}/goalie-stats`),
    );
  };

  // Generic loader for the player/goalie stats index + snapshots of a season.
  async function loadStatsSnapshots<
    T extends PlayerStatsSnapshot | GoalieStatsSnapshot,
  >(base: string): Promise<T[]> {
    try {
      const indexResponse = await fetch(`${base}/index.json`);
      if (!indexResponse.ok) return [];

      const index: PlayerStatsIndex | GoalieStatsIndex =
        await indexResponse.json();
      if (!index.dates || index.dates.length === 0) return [];

      const loaded = await Promise.all(
        index.dates.map(async (date) => {
          const response = await fetch(`${base}/snapshots/${date}.json`);
          if (!response.ok) {
            console.warn(`Failed to load stats for ${date}`);
            return null;
          }
          return response.json() as Promise<T>;
        }),
      );

      return loaded
        .filter((s): s is T => s !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      console.warn("Stats not available yet:", err);
      return [];
    }
  }

  const updateHash = (seasonId: string, division: string) => {
    window.location.hash = `${encodeURIComponent(seasonId)}/${encodeURIComponent(
      division,
    )}`;
  };

  const handleSeasonChange = useCallback(
    async (seasonId: string) => {
      const season = seasons.find((s) => s.id === seasonId);
      if (!season) return;
      try {
        setLoading(true);
        setError(null);
        await loadSeasonData(season);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [seasons],
  );

  const handleDivisionChange = useCallback(
    (division: DivisionName) => {
      setSelectedDivision(division);
      if (selectedSeasonId) {
        updateHash(selectedSeasonId, division);
      }
    },
    [selectedSeasonId],
  );

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
            <button onClick={initialize} className="retry-button">
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  const standingsUrl = selectedSeason
    ? `https://www.hna.com/leagues/standings.cfm?leagueID=${selectedSeason.leagueId}&clientID=2296`
    : "https://www.hna.com/leagues/standings.cfm?clientID=2296";

  return (
    <div className="app">
      <header className="header">
        <h1>HNA Standings Tracker</h1>
        <p className="subtitle">New Jersey Standings Over Time</p>
      </header>

      <main className="main">
        {seasons.length > 1 && (
          <div className="season-selector">
            <label htmlFor="season-select">Season</label>
            <select
              id="season-select"
              value={selectedSeasonId}
              onChange={(e) => handleSeasonChange(e.target.value)}
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label}
                  {season.current ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <DivisionToggle
          divisions={divisions}
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
              Only goalies with minimum {goalieMin} games played in the selected
              division are represented.
            </p>

            <div className="chart-container">
              <GoalieStatsChart
                snapshots={sampledGoalieStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="svPct"
                topN={10}
                minGp={goalieMin}
              />
            </div>

            <div className="chart-container">
              <GoalieStatsChart
                snapshots={sampledGoalieStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="gaa"
                topN={10}
                minGp={goalieMin}
              />
            </div>

            <div className="chart-container">
              <GoalieStatsChart
                snapshots={sampledGoalieStatsSnapshots}
                standingsSnapshots={snapshots}
                division={selectedDivision}
                statType="so"
                topN={10}
                minGp={goalieMin}
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
            href={standingsUrl}
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
