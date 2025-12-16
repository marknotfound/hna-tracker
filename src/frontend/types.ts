// Frontend types (mirrored from backend for browser use)

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
