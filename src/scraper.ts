import * as cheerio from 'cheerio';
import { DailySnapshot, TeamStanding, DIVISION_NAMES } from './types';

const HNA_STANDINGS_URL =
  'https://www.hna.com/leagues/standings.cfm?leagueID=5750&clientID=2296';

/**
 * Fetch and parse HNA standings using Cheerio
 */
export async function scrapeStandings(): Promise<DailySnapshot> {
  console.log('Fetching HNA standings page...');

  const response = await fetch(HNA_STANDINGS_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch standings: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('Parsing standings data...');

  const divisions: Record<string, TeamStanding[]> = {};

  // Tables appear in the same order as divisions on the page
  // Find all tables with standings data (tables with 8+ columns of team data)
  const standingsTables: ReturnType<typeof $>[] = [];

  $('table').each(function() {
    const tbody = $(this).find('tbody');
    const rows = tbody.find('tr');

    // Check if this looks like a standings table (has rows with 8 cells)
    let hasStandingsData = false;
    rows.each(function() {
      const cells = $(this).find('td');
      if (cells.length >= 8) {
        hasStandingsData = true;
        return false; // break
      }
    });

    if (hasStandingsData) {
      standingsTables.push($(this));
    }
  });

  console.log(`Found ${standingsTables.length} standings tables`);

  // Match tables to divisions in order
  DIVISION_NAMES.forEach((divisionName, index) => {
    const teams: TeamStanding[] = [];

    if (index < standingsTables.length) {
      const table = standingsTables[index];
      const rows = table.find('tbody tr');

      rows.each(function() {
        const cells = $(this).find('td');

        if (cells.length >= 8) {
          // Get team name from the link inside the first cell
          // Structure: <a><span class="d-sm-inline">Full Name</span><span class="d-sm-none">ABBR</span></a>
          const teamCell = cells.eq(0);
          const teamLink = teamCell.find('a');
          let teamName = '';

          if (teamLink.length > 0) {
            // Try to get the full name from the d-sm-inline span
            const fullNameSpan = teamLink.find('span.d-sm-inline');
            if (fullNameSpan.length > 0) {
              teamName = fullNameSpan.text().trim();
            } else {
              // Fallback to link text
              teamName = teamLink.text().trim();
            }
          } else {
            // Fallback to cell text if no link
            teamName = teamCell.text().trim();
          }

          // Skip if it looks like a header
          if (!teamName || teamName.toLowerCase() === 'team') {
            return;
          }

          teams.push({
            team: teamName,
            gp: parseInt(cells.eq(1).text().trim(), 10) || 0,
            w: parseInt(cells.eq(2).text().trim(), 10) || 0,
            l: parseInt(cells.eq(3).text().trim(), 10) || 0,
            t: parseInt(cells.eq(4).text().trim(), 10) || 0,
            otl: parseInt(cells.eq(5).text().trim(), 10) || 0,
            pts: parseInt(cells.eq(6).text().trim(), 10) || 0,
            wpct: parseFloat(cells.eq(7).text().trim()) || 0,
            position: teams.length + 1, // 1-indexed position
          });
        }
      });
    }

    divisions[divisionName] = teams;
    console.log(`  ${divisionName}: ${teams.length} teams`);
  });

  const snapshot: DailySnapshot = {
    date: getTodayISO(),
    divisions,
  };

  return snapshot;
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
function getTodayISO(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export { getTodayISO };
