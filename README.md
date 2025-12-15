# HNA Standings Tracker

A daily standings tracker for Hockey North America (HNA) New Jersey leagues, featuring automated data collection and a beautiful visualization dashboard.

## Features

- **Daily Automated Scraping**: GitHub Actions runs daily to capture standings snapshots
- **Historical Data**: Track team standings positions over time
- **Interactive Charts**: Line charts showing standings progression with react-chartjs-2
- **Division Toggle**: Quick switch between 4 divisions (Brodeur, Manno, Stevens North, Stevens South)
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
│   ├── scraper.ts        # Cheerio-based HNA scraper
│   ├── types.ts          # Shared TypeScript interfaces
│   └── frontend/         # React frontend
│       ├── App.tsx
│       ├── StandingsChart.tsx
│       ├── DivisionToggle.tsx
│       └── styles.css
├── data/
│   ├── index.json        # Metadata (available dates, divisions)
│   └── snapshots/        # Daily JSON snapshots
│       └── YYYY-MM-DD.json
├── .github/workflows/
│   ├── scrape.yml        # Daily scraping (6 AM UTC)
│   └── deploy.yml        # Deploy to GitHub Pages
└── dist/                 # Built frontend (auto-generated)
```

## Data Schema

Each daily snapshot contains:

```typescript
interface DailySnapshot {
  date: string;  // "2024-12-15"
  divisions: {
    "1-BRODEUR": TeamStanding[];
    "2-MANNO": TeamStanding[];
    "3-STEVENS NORTH": TeamStanding[];
    "3-STEVENS SOUTH": TeamStanding[];
  };
}

interface TeamStanding {
  team: string;      // "Stealth"
  gp: number;        // Games Played
  w: number;         // Wins
  l: number;         // Losses
  t: number;         // Ties
  otl: number;       // Overtime Losses
  pts: number;       // Points
  wpct: number;      // Win Percentage (0.000-1.000)
  position: number;  // 1-indexed standings position
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

| Command | Description |
|---------|-------------|
| `yarn scrape` | Fetch current standings and save snapshot |
| `yarn scrape:force` | Force re-scrape even if today's snapshot exists |
| `yarn dev` | Start Vite development server |
| `yarn build` | Build for production |
| `yarn preview` | Preview production build locally |

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

Data is scraped from the official HNA standings page:
https://www.hna.com/leagues/standings.cfm?leagueID=5750&clientID=2296

## License

MIT
