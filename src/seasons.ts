/**
 * HNA Tracker Season Configuration
 *
 * Single source of truth for every season the tracker knows about. Each season
 * maps to a distinct HNA leagueID with its own set of divisions and division
 * IDs. When a new season starts, add an entry here, flip `current` to the new
 * season, and the daily scraper will start tracking it automatically.
 *
 * Standings column layouts differ between seasons (for example, the summer
 * league has no OTL column), so each season declares the cell index for every
 * standings field it exposes.
 */

// Client ID is shared across every HNA league for this organization.
export const CLIENT_ID = "2296";

// Base URL for HNA league pages.
export const HNA_BASE_URL = "https://www.hna.com/leagues";

// Browser-like User-Agent. HNA returns 403 to requests without one.
export const HNA_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface SeasonDivision {
  /** Division name as used everywhere in the data (snapshot keys, URL hash). */
  name: string;
  /** HNA division ID used to fetch player/goalie stats for this division. */
  divId: string;
}

/**
 * Zero-based cell indices for each standings column. `otl` is null for leagues
 * that don't track overtime losses (e.g. the summer league).
 */
export interface StandingsColumns {
  gp: number;
  w: number;
  l: number;
  t: number;
  otl: number | null;
  pts: number;
  wpct: number;
}

export interface SeasonConfig {
  /** Stable identifier, also used as the data directory name. */
  id: string;
  /** Human-friendly label shown in the season selector. */
  label: string;
  /** HNA leagueID for this season. */
  leagueId: string;
  /** The season the daily scraper actively tracks. Exactly one should be true. */
  current: boolean;
  /** Divisions in the order they appear on the standings page. */
  divisions: SeasonDivision[];
  /** Column layout of the standings table for this season. */
  standingsColumns: StandingsColumns;
}

export const SEASONS: SeasonConfig[] = [
  {
    id: "summer-2026",
    label: "Summer 2026",
    leagueId: "6205",
    current: true,
    divisions: [
      { name: "Canes", divId: "134870" },
      { name: "Habs", divId: "134879" },
      { name: "Knights", divId: "134871" },
    ],
    // Summer standings: Team, GP, W, L, T, PTS, P%, GF, GA, DIFF, ... (no OTL)
    standingsColumns: { gp: 1, w: 2, l: 3, t: 4, otl: null, pts: 5, wpct: 6 },
  },
  {
    id: "winter-2025-2026",
    label: "Winter 2025–2026",
    leagueId: "5750",
    current: false,
    divisions: [
      { name: "1-BRODEUR", divId: "129531" },
      { name: "2-MANNO", divId: "129533" },
      { name: "3-STEVENS NORTH", divId: "129532" },
      { name: "3-STEVENS SOUTH", divId: "130945" },
    ],
    // Winter standings: Team, GP, W, L, T, OTL, PTS, WPCT
    standingsColumns: { gp: 1, w: 2, l: 3, t: 4, otl: 5, pts: 6, wpct: 7 },
  },
];

/** The season the daily scraper tracks. */
export function getCurrentSeason(): SeasonConfig {
  const current = SEASONS.find((s) => s.current);
  if (!current) {
    throw new Error("No current season configured in SEASONS");
  }
  return current;
}

export function getSeason(id: string): SeasonConfig | undefined {
  return SEASONS.find((s) => s.id === id);
}

/** Standings page URL for a season. */
export function buildStandingsUrl(season: SeasonConfig): string {
  return `${HNA_BASE_URL}/standings.cfm?leagueID=${season.leagueId}&clientID=${CLIENT_ID}`;
}

/** Player (scoring) stats URL for a division. */
export function buildPlayerStatsUrl(
  season: SeasonConfig,
  divId: string,
): string {
  return `${HNA_BASE_URL}/stats_hockey.cfm?leagueID=${season.leagueId}&clientID=${CLIENT_ID}&printPage=1&divID=${divId}`;
}

/** Goalie stats URL for a division. */
export function buildGoalieStatsUrl(
  season: SeasonConfig,
  divId: string,
): string {
  return `${HNA_BASE_URL}/stats_hockey.cfm?clientid=${CLIENT_ID}&leagueID=${season.leagueId}&divID=${divId}&statType=goalie&printPage=0`;
}

/** Fetch a page with the headers HNA expects, throwing on non-2xx. */
export async function fetchHnaPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": HNA_USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}
