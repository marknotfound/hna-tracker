/**
 * HNA Tracker URL Configuration
 *
 * All HNA URLs are centralized here for easy updates when a new season starts.
 * When the season changes, update the LEAGUE_ID and DIVISION_IDS as needed.
 */

import { DIVISION_IDS, DivisionName } from "./types";

// Base URL for HNA stats pages
export const HNA_BASE_URL = "https://www.hna.com/leagues/stats_hockey.cfm";

// League and client IDs - update these when a new season starts
export const LEAGUE_ID = "5750";
export const CLIENT_ID = "2296";

/**
 * Build goalie stats URL for a division
 * URL format: {BASE}?clientid={CLIENT_ID}&leagueID={LEAGUE_ID}&divID={DIV_ID}&statType=goalie&printPage=0
 */
export function buildGoalieStatsUrl(divisionName: DivisionName): string {
  const divID = DIVISION_IDS[divisionName];
  return `${HNA_BASE_URL}?clientid=${CLIENT_ID}&leagueID=${LEAGUE_ID}&divID=${divID}&statType=goalie&printPage=0`;
}
