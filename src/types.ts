// Shared types for HNA Standings Tracker

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
  date: string; // ISO date: "2024-12-15"
  divisions: {
    [divisionName: string]: TeamStanding[];
  };
}

export interface SnapshotIndex {
  divisions: string[];
  dates: string[];
  lastUpdated: string;
}

// Division names as they appear on the HNA website
export const DIVISION_NAMES = [
  "1-BRODEUR",
  "2-MANNO",
  "3-STEVENS NORTH",
  "3-STEVENS SOUTH",
] as const;

export type DivisionName = (typeof DIVISION_NAMES)[number];

// Player statistics interface - all columns from the stats table
export interface PlayerStats {
  rank: number; // Position in standings
  name: string; // Player name
  jerseyNumber: string; // Jersey number (can be empty)
  position: string; // Position (F, D, or empty)
  team: string; // Team abbreviation
  gp: number; // Games Played
  goals: number; // Goals
  assists: number; // Assists
  points: number; // Points (G + A)
  pointsPerGame: number; // Points per Game
  ppg: number; // Power Play Goals
  ppa: number; // Power Play Assists
  shg: number; // Short-handed Goals
  sha: number; // Short-handed Assists
  gwg: number; // Game-Winning Goals
  pim: number; // Penalties in Minutes
}

export interface PlayerStatsSnapshot {
  date: string; // ISO date: "2024-12-15"
  divisions: {
    [divisionName: string]: PlayerStats[];
  };
}

export interface PlayerStatsIndex {
  divisions: string[];
  dates: string[];
  lastUpdated: string;
}

// Division IDs for player stats scraping
export const DIVISION_IDS: Record<DivisionName, string> = {
  "1-BRODEUR": "129531",
  "2-MANNO": "129533",
  "3-STEVENS NORTH": "129532",
  "3-STEVENS SOUTH": "130945",
};

