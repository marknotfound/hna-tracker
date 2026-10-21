# HNA Standings Tracker

This project is 100% vibecoded, please don't judge me on code quality if you're a potential employer ;) Go Ice Pack.

A daily standings tracker for HNA New Jersey ice hockey leagues.

## Features

- **Daily Automated Scraping**: GitHub Actions runs daily to capture standings snapshots
- **Historical Data**: Track team standings positions over time
- **Interactive Charts**: Line charts showing standings progression with react-chartjs-2
- **Division Toggle**: Quick switch between divisions (Winter 2026–2027: Brodeur, Manno North, Manno South, Stevens North, Stevens South)
- **Dark Theme UI**: Modern, responsive design with distinctive aesthetics
- **URL Hash Support**: Shareable links to specific divisions

## Tech Stack

- **Scraper**: Node.js + Cheerio (fast HTML parsing, no browser needed)
- **Frontend**: React 18 + Vite + TypeScript
- **Charts**: Chart.js / react-chartjs-2
- **Storage**: JSON files in repository (committed via GitHub Actions)
- **Hosting**: GitHub Pages (automatic deployment)

## Project Structure

```
hna-tracker/
├── src/
│   ├── index.ts          # Scraper CLI entry point
│   ├── seasons.ts        # Season config (leagueIDs, divisions, columns)
│   ├── scraper.ts        # Cheerio-based HNA scraper
│   ├── types.ts          # Shared TypeScript interfaces
│   └── frontend/         # React frontend
│       ├── App.tsx
│       ├── StandingsChart.tsx
│       ├── DivisionToggle.tsx
│       └── styles.css
├── data/
│   ├── seasons.json      # Manifest of available seasons + default season
│   └── seasons/
│       └── <season-id>/  # e.g. winter-2026-2027, summer-2026
│           ├── index.json        # Metadata (available dates, divisions)
│           ├── snapshots/         # Daily standings snapshots (YYYY-MM-DD.json)
│           ├── player-stats/      # Daily player stats snapshots
│           └── goalie-stats/      # Daily goalie stats snapshots
├── .github/workflows/
│   ├── scrape.yml        # Daily scraping (6 AM UTC)
│   └── deploy.yml        # Deploy to GitHub Pages
└── dist/                 # Built frontend (auto-generated)
```

## Seasons

The tracker is season-aware. Every season the app knows about is defined in
`src/seasons.ts` (its HNA `leagueID`, divisions, division IDs, and standings
column layout). The daily scraper tracks whichever season is marked `current`
and writes its snapshots under `data/seasons/<season-id>/`.

Previous seasons remain available to view via the season selector in the UI.
The default view is the current season (`defaultSeason` in `data/seasons.json`,
generated from the season config on each scrape).

To roll over to a new season: add a new entry to `SEASONS` in
`src/seasons.ts`, set its `current` flag to `true`, and clear it on the old
season. The standings column indices can be customized per season because
different HNA leagues expose different columns (for example, the summer league
has no OTL column).

## Data Schema

Each daily snapshot contains:

```typescript
interface DailySnapshot {
  date: string; // "2024-12-15"
  divisions: {
    "1-BRODEUR": TeamStanding[];
    "2-MANNO NORTH": TeamStanding[];
    "2-MANNO SOUTH": TeamStanding[];
    "3-STEVENS NORTH": TeamStanding[];
    "3-STEVENS SOUTH": TeamStanding[];
  };
}

interface TeamStanding {
  team: string; // "Stealth"
  gp: number; // Games Played
  w: number; // Wins
  l: number; // Losses
  t: number; // Ties
  otl: number; // Overtime Losses
  pts: number; // Points
  wpct: number; // Win Percentage (0.000-1.000)
  position: number; // 1-indexed standings position
}
```

## Local Development

### Prerequisites

- Node.js 20+
- Yarn 4.x

### Setup

```bash
# Install dependencies
yarn install

# Run the scraper to get initial data
yarn scrape

# Start development server
yarn dev
```

The frontend will be available at http://localhost:3000

### Available Scripts

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `yarn scrape`       | Fetch current standings and save snapshot       |
| `yarn scrape:force` | Force re-scrape even if today's snapshot exists |
| `yarn dev`          | Start Vite development server                   |
| `yarn build`        | Build for production                            |
| `yarn preview`      | Preview production build locally                |
| `yarn test`         | Run offline scraper regression tests            |
| `yarn typecheck`    | Type-check scraper code and tests                |

### Troubleshooting failed scrapes

An HTTP 200 response does not guarantee league data: HNA can return a
JavaScript robot-verification page instead. The scraper rejects that response
with an explicit access error. It also reports the final response URL, status,
content type, and size; an unexpected standings layout reports the page title
and total versus usable table counts. Missing or additional division tables,
or a division without teams, fail before saving a standings snapshot.

These checks do not restore access if HNA blocks automated requests. For a
403 or verification response, HNA must permit the runner's automated access or
provide a supported data source before daily scraping can resume. Do not
replace valid historical data with empty results or fabricate missing days.
The offline tests use synthetic HTML fixtures and do not verify live access.

## Deployment

### GitHub Pages Setup

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Set Source to "GitHub Actions"
4. The `deploy.yml` workflow will automatically deploy on push to `main`

### GitHub Actions Permissions

For the scraper workflow to commit data:

1. Go to **Settings → Actions → General**
2. Under "Workflow permissions", select "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

## Data Source

Data is scraped from the official HNA standings pages. Each season uses its own
`leagueID` (see `src/seasons.ts`). Note that HNA reuses the winter league's
`leagueID` (5750) every year and serves whichever winter season is newest, so
only the current winter season can be scraped live:

- Winter 2026–2027: https://www.hna.com/leagues/standings.cfm?leagueID=5750&clientID=2296
- Summer 2026: https://www.hna.com/leagues/standings.cfm?leagueID=6205&clientID=2296
- Winter 2025–2026: https://www.hna.com/leagues/standings.cfm?leagueID=5750&clientID=2296

## License

MIT
