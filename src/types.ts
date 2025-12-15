// Shared types for HNA Standings Tracker

export interface TeamStanding {
  team: string;
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
  '1-BRODEUR',
  '2-MANNO',
  '3-STEVENS NORTH',
  '3-STEVENS SOUTH',
] as const;

export type DivisionName = (typeof DIVISION_NAMES)[number];

