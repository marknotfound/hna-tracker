import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format, parseISO } from "date-fns";
import {
  PlayerStatsSnapshot,
  DailySnapshot,
  DivisionName,
  PlayerStats,
  PlayerStatType,
} from "./types";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface PlayerStatsChartProps {
  snapshots: PlayerStatsSnapshot[];
  standingsSnapshots: DailySnapshot[]; // For team name mapping
  division: DivisionName;
  statType: PlayerStatType;
  topN?: number; // Show top N players, default 10
}

// Distinctive player colors - each player gets a unique color
const PLAYER_COLORS = [
  "#00D4FF", // Cyan
  "#FF6B6B", // Coral Red
  "#4ADE80", // Emerald
  "#FBBF24", // Amber
  "#A78BFA", // Violet
  "#F472B6", // Pink
  "#60A5FA", // Sky Blue
  "#FB923C", // Orange
  "#2DD4BF", // Teal
  "#E879F9", // Fuchsia
  "#84CC16", // Lime
  "#F43F5E", // Rose
  "#22D3EE", // Cyan-400
  "#C084FC", // Purple-400
  "#34D399", // Emerald-400
];

const STAT_LABELS: Record<PlayerStatType, string> = {
  goals: "Goal Leaders",
  assists: "Assist Leaders",
  points: "Point Leaders",
};

const STAT_KEYS: Record<PlayerStatType, keyof PlayerStats> = {
  goals: "goals",
  assists: "assists",
  points: "points",
};

function PlayerStatsChart({
  snapshots,
  standingsSnapshots,
  division,
  statType,
  topN = 10,
}: PlayerStatsChartProps) {
  // Get stat value for a player
  const getStatValue = (player: PlayerStats): number => {
    return player[STAT_KEYS[statType]] as number;
  };

  // Build team abbreviation to full name mapping from standings data
  const teamNameMap = useMemo(() => {
    const mapping: Record<string, string> = {};
    // Use the most recent standings snapshot that has abbreviations
    for (let i = standingsSnapshots.length - 1; i >= 0; i--) {
      const snapshot = standingsSnapshots[i];
      Object.values(snapshot.divisions).forEach((teams) => {
        teams.forEach((team) => {
          if (team.abbr && !mapping[team.abbr]) {
            mapping[team.abbr] = team.team;
          }
        });
      });
      // If we found mappings, we can stop
      if (Object.keys(mapping).length > 0) break;
    }
    return mapping;
  }, [standingsSnapshots]);

  // Calculate rankings based on stat type for each snapshot
  const rankedSnapshots = useMemo(() => {
    return snapshots.map((snapshot) => {
      const divisionData = snapshot.divisions[division] || [];
      // Sort players by the selected stat (descending) and assign ranks
      const sorted = [...divisionData].sort(
        (a, b) => getStatValue(b) - getStatValue(a),
      );
      const ranked = sorted.map((player, index) => ({
        ...player,
        statRank: index + 1,
        statValue: getStatValue(player),
      }));
      return {
        date: snapshot.date,
        players: ranked,
      };
    });
  }, [snapshots, division, statType]);

  const chartData = useMemo(() => {
    if (rankedSnapshots.length === 0) {
      return null;
    }

    // Get all unique player names that appear in top N at any point
    const topPlayers = new Set<string>();
    rankedSnapshots.forEach((snapshot) => {
      snapshot.players.slice(0, topN).forEach((player) => {
        topPlayers.add(player.name);
      });
    });

    const playerList = Array.from(topPlayers).sort();

    // Create labels (dates)
    const labels = rankedSnapshots.map((s) =>
      format(parseISO(s.date), "MMM d"),
    );

    // Create datasets (one per player)
    const datasets = playerList.map((playerName, index) => {
      const data = rankedSnapshots.map((snapshot) => {
        const playerData = snapshot.players.find((p) => p.name === playerName);
        // Only show if player is in top N for this snapshot
        if (playerData && playerData.statRank <= topN) {
          return playerData.statRank;
        }
        return null;
      });

      return {
        label: playerName,
        data,
        borderColor: PLAYER_COLORS[index % PLAYER_COLORS.length],
        backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length] + "20",
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length],
        pointBorderColor: "#1a1a2e",
        pointBorderWidth: 2,
        tension: 0.3,
        fill: false,
        spanGaps: false, // Don't connect points when player drops out of top N
      };
    });

    return { labels, datasets };
  }, [rankedSnapshots, topN]);

  // Store detailed data for tooltip
  const tooltipData = useMemo(() => {
    const data: Record<
      string,
      Record<string, PlayerStats & { statRank: number; statValue: number }>
    > = {};
    rankedSnapshots.forEach((snapshot) => {
      data[snapshot.date] = {};
      snapshot.players.forEach((player) => {
        data[snapshot.date][player.name] = player;
      });
    });
    return data;
  }, [rankedSnapshots]);

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#e5e5e5",
            font: {
              family: "JetBrains Mono, monospace",
              size: 11,
            },
            padding: 15,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        title: {
          display: true,
          text: STAT_LABELS[statType],
          color: "#ffffff",
          font: {
            family: "Outfit, sans-serif",
            size: 18,
            weight: "600",
          },
          padding: {
            bottom: 20,
          },
        },
        tooltip: {
          backgroundColor: "rgba(26, 26, 46, 0.95)",
          titleColor: "#ffffff",
          bodyColor: "#e5e5e5",
          borderColor: "#00D4FF",
          borderWidth: 1,
          padding: 12,
          titleFont: {
            family: "Outfit, sans-serif",
            size: 14,
            weight: "600",
          },
          bodyFont: {
            family: "JetBrains Mono, monospace",
            size: 12,
          },
          itemSort: (a: TooltipItem<"line">, b: TooltipItem<"line">) => {
            // Sort tooltip items by rank (ascending)
            const rankA = a.raw as number;
            const rankB = b.raw as number;
            return rankA - rankB;
          },
          callbacks: {
            title: (items: TooltipItem<"line">[]) => {
              if (items.length === 0) return "";
              const index = items[0].dataIndex;
              const snapshot = rankedSnapshots[index];
              return snapshot
                ? format(parseISO(snapshot.date), "EEEE, MMMM d, yyyy")
                : "";
            },
            label: (item: TooltipItem<"line">) => {
              const playerName = item.dataset.label || "";
              const rank = item.raw as number;
              const snapshot = rankedSnapshots[item.dataIndex];

              if (!snapshot) return `${playerName}: #${rank}`;

              const playerData = tooltipData[snapshot.date]?.[playerName];
              if (!playerData) return `${playerName}: #${rank}`;

              // Use full team name from mapping, fallback to abbreviation
              const teamName = teamNameMap[playerData.team] || playerData.team;
              return [
                `${playerName}: #${rank}`,
                `  ${statType.charAt(0).toUpperCase() + statType.slice(1)}: ${playerData.statValue} | GP: ${playerData.gp}`,
                `  Team: ${teamName} | G: ${playerData.goals} A: ${playerData.assists} P: ${playerData.points}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
          ticks: {
            color: "#a3a3a3",
            font: {
              family: "JetBrains Mono, monospace",
              size: 11,
            },
          },
        },
        y: {
          reverse: true, // Rank 1 at top
          min: 0,
          max: topN + 1,
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
          ticks: {
            color: "#a3a3a3",
            font: {
              family: "JetBrains Mono, monospace",
              size: 11,
            },
            stepSize: 1,
            callback: (value) => {
              if (value < 1 || value > topN) return "";
              return `#${value}`;
            },
          },
          title: {
            display: true,
            text: "Rank",
            color: "#a3a3a3",
            font: {
              family: "Outfit, sans-serif",
              size: 13,
            },
          },
        },
      },
    }),
    [statType, rankedSnapshots, tooltipData, topN, teamNameMap],
  );

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <div className="chart-empty">
        <p>No player stats available for this division yet.</p>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <Line data={chartData} options={options} />
    </div>
  );
}

export default PlayerStatsChart;
