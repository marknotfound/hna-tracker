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

export const DIVISION_NAMES = [
  "1-BRODEUR",
  "2-MANNO",
  "3-STEVENS NORTH",
  "3-STEVENS SOUTH",
] as const;

export type DivisionName = (typeof DIVISION_NAMES)[number];

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

