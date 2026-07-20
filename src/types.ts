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

// Division names vary by season (see src/seasons.ts), so a division is just a
// string key into the per-season snapshot data.
export type DivisionName = string;

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

// Goalie statistics interface - all columns from the goalie stats table
export interface GoalieStats {
  rank: number; // Position in standings
  name: string; // Goalie name
  team: string; // Team abbreviation
  gp: number; // Games Played
  w: number; // Wins
  l: number; // Losses
  t: number; // Ties
  otl: number; // Overtime Losses
  so: number; // Shutouts
  mp: number; // Minutes Played
  ga: number; // Goals Against
  gaa: number; // Goals Against Average
  gsaa: number; // Goals Saved Above Average
  sa: number; // Shots Against
  sv: number; // Saves
  svPct: number; // Save Percentage (e.g., 0.876)
  goals: number; // Goals (scored by goalie)
  assists: number; // Assists
  pim: number; // Penalties in Minutes
}

export interface GoalieStatsSnapshot {
  date: string; // ISO date: "2024-12-15"
  divisions: {
    [divisionName: string]: GoalieStats[];
  };
}

export interface GoalieStatsIndex {
  divisions: string[];
  dates: string[];
  lastUpdated: string;
}

// Minimum games played to display in goalie charts (standard leagues).
export const GOALIE_MIN_GP = 6;

// The summer league plays a shorter season, so goalies qualify with fewer games.
export const SUMMER_GOALIE_MIN_GP = 3;

// Resolve the minimum games-played threshold for a season. Summer seasons use a
// lower minimum than the standard leagues.
export function goalieMinGp(seasonId: string | undefined): number {
  return seasonId?.startsWith("summer") ? SUMMER_GOALIE_MIN_GP : GOALIE_MIN_GP;
}


