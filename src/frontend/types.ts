// Frontend types (mirrored from backend for browser use)

export interface TeamStanding {
  team: string;
  abbr?: string; // Team abbreviation (e.g., "KNKL", "RNGD")
  gp: number;
  w: number;
  l: number;
  t: number;
  otl: number;
  pts: number;
  wpct: number;
  position: number;
}

export interface DailySnapshot {
  date: string;
  divisions: {
    [divisionName: string]: TeamStanding[];
  };
}

export interface SnapshotIndex {
  divisions: string[];
  dates: string[];
  lastUpdated: string;
}

// Division names vary by season, so a division is just a string key into the
// per-season snapshot data. The available divisions for a season come from the
// seasons manifest / that season's index.json.
export type DivisionName = string;

// Seasons manifest (data/seasons.json) describing every season available to
// view. Each season's data lives under data/seasons/<id>/.
export interface SeasonInfo {
  id: string;
  label: string;
  leagueId: string;
  current: boolean;
  divisions: string[];
}

export interface SeasonsManifest {
  defaultSeason: string;
  seasons: SeasonInfo[];
}

// Chart data structure
export interface ChartDataPoint {
  date: string;
  position: number;
  stats: TeamStanding;
}

export interface TeamChartData {
  team: string;
  data: ChartDataPoint[];
  color: string;
}

// Player statistics interface
export interface PlayerStats {
  rank: number;
  name: string;
  jerseyNumber: string;
  position: string;
  team: string;
  gp: number;
  goals: number;
  assists: number;
  points: number;
  pointsPerGame: number;
  ppg: number;
  ppa: number;
  shg: number;
  sha: number;
  gwg: number;
  pim: number;
}

export interface PlayerStatsSnapshot {
  date: string;
  divisions: {
    [divisionName: string]: PlayerStats[];
  };
}

export interface PlayerStatsIndex {
  divisions: string[];
  dates: string[];
  lastUpdated: string;
}

// Player stats chart types
export type PlayerStatType = "goals" | "assists" | "points";

// Goalie statistics interface
export interface GoalieStats {
  rank: number;
  name: string;
  team: string;
  gp: number;
  w: number;
  l: number;
  t: number;
  otl: number;
  so: number; // Shutouts
  mp: number;
  ga: number;
  gaa: number; // Goals Against Average
  gsaa: number;
  sa: number;
  sv: number;
  svPct: number; // Save Percentage (e.g., 0.876)
  goals: number;
  assists: number;
  pim: number;
}

export interface GoalieStatsSnapshot {
  date: string;
  divisions: {
    [divisionName: string]: GoalieStats[];
  };
}

export interface GoalieStatsIndex {
  divisions: string[];
  dates: string[];
  lastUpdated: string;
}

// Goalie stats chart types
export type GoalieStatType = "so" | "gaa" | "svPct";

// Minimum games played to display in goalie charts (standard leagues).
export const GOALIE_MIN_GP = 6;

// The summer league plays a shorter season, so goalies qualify with fewer games.
export const SUMMER_GOALIE_MIN_GP = 2;

// Resolve the minimum games-played threshold for a season. Summer seasons use a
// lower minimum than the standard leagues.
export function goalieMinGp(seasonId: string | undefined): number {
  return seasonId?.startsWith("summer") ? SUMMER_GOALIE_MIN_GP : GOALIE_MIN_GP;
}


