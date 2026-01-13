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
  GoalieStatsSnapshot,
  DailySnapshot,
  DivisionName,
  GoalieStats,
  GoalieStatType,
  GOALIE_MIN_GP,
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

interface GoalieStatsChartProps {
  snapshots: GoalieStatsSnapshot[];
  standingsSnapshots: DailySnapshot[]; // For team name mapping
  division: DivisionName;
  statType: GoalieStatType;
  topN?: number; // Show top N goalies, default 10
}

// Distinctive goalie colors - each goalie gets a unique color
const GOALIE_COLORS = [
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

// Generate a consistent color index from a name (hash-based)
function getColorIndex(name: string, colorCount: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % colorCount;
}

const STAT_LABELS: Record<GoalieStatType, string> = {
  so: "Shutout Leaders",
  gaa: "Goals Against Average Leaders",
  svPct: "Save Percentage Leaders",
};

const STAT_KEYS: Record<GoalieStatType, keyof GoalieStats> = {
  so: "so",
  gaa: "gaa",
  svPct: "svPct",
};

// For GAA, lower is better (sort ascending). For SO and SV%, higher is better (sort descending).
const STAT_SORT_ASCENDING: Record<GoalieStatType, boolean> = {
  so: false, // Higher SO = better = rank 1
  gaa: true, // Lower GAA = better = rank 1
  svPct: false, // Higher SV% = better = rank 1
};

function GoalieStatsChart({
  snapshots,
  standingsSnapshots,
  division,
  statType,
  topN = 10,
}: GoalieStatsChartProps) {
  // Get stat value for a goalie
  const getStatValue = (goalie: GoalieStats): number => {
    return goalie[STAT_KEYS[statType]] as number;
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

  // Calculate rankings based on stat type for each snapshot, filtering by minimum GP
  const rankedSnapshots = useMemo(() => {
    return snapshots.map((snapshot) => {
      const divisionData = snapshot.divisions[division] || [];

      // Filter goalies with minimum games played
      const qualified = divisionData.filter((g) => g.gp >= GOALIE_MIN_GP);

      // Sort based on stat type (ascending for GAA, descending for others)
      const sortAsc = STAT_SORT_ASCENDING[statType];
      const sorted = [...qualified].sort((a, b) => {
        const valA = getStatValue(a);
        const valB = getStatValue(b);
        // Secondary sort by name for consistency when values are equal
        if (valA === valB) {
          return a.name.localeCompare(b.name);
        }
        return sortAsc ? valA - valB : valB - valA;
      });

      const ranked = sorted.map((goalie, index) => ({
        ...goalie,
        statRank: index + 1,
        statValue: getStatValue(goalie),
      }));

      return {
        date: snapshot.date,
        goalies: ranked,
      };
    });
  }, [snapshots, division, statType]);

  const chartData = useMemo(() => {
    if (rankedSnapshots.length === 0) {
      return null;
    }

    // Get all unique goalie names that appear in top N at any point
    const topGoalies = new Set<string>();
    rankedSnapshots.forEach((snapshot) => {
      snapshot.goalies.slice(0, topN).forEach((goalie) => {
        topGoalies.add(goalie.name);
      });
    });

    // Sort goalies by their most recent rank (for legend order)
    const mostRecentSnapshot = rankedSnapshots[rankedSnapshots.length - 1];
    const goalieList = Array.from(topGoalies).sort((a, b) => {
      const rankA =
        mostRecentSnapshot.goalies.find((g) => g.name === a)?.statRank ??
        Infinity;
      const rankB =
        mostRecentSnapshot.goalies.find((g) => g.name === b)?.statRank ??
        Infinity;
      return rankA - rankB;
    });

    // Create labels (dates)
    const labels = rankedSnapshots.map((s) =>
      format(parseISO(s.date), "MMM d"),
    );

    // Create datasets (one per goalie)
    const datasets = goalieList.map((goalieName) => {
      const data = rankedSnapshots.map((snapshot) => {
        const goalieData = snapshot.goalies.find((g) => g.name === goalieName);
        // Only show if goalie is in top N for this snapshot
        if (goalieData && goalieData.statRank <= topN) {
          return goalieData.statRank;
        }
        return null;
      });

      // Use hash-based color so goalie color stays consistent regardless of position
      const colorIndex = getColorIndex(goalieName, GOALIE_COLORS.length);
      return {
        label: goalieName,
        data,
        borderColor: GOALIE_COLORS[colorIndex],
        backgroundColor: GOALIE_COLORS[colorIndex] + "20",
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: GOALIE_COLORS[colorIndex],
        pointBorderColor: "#1a1a2e",
        pointBorderWidth: 2,
        tension: 0.3,
        fill: false,
        spanGaps: false, // Don't connect points when goalie drops out of top N
      };
    });

    return { labels, datasets };
  }, [rankedSnapshots, topN]);

  // Store detailed data for tooltip
  const tooltipData = useMemo(() => {
    const data: Record<
      string,
      Record<string, GoalieStats & { statRank: number; statValue: number }>
    > = {};
    rankedSnapshots.forEach((snapshot) => {
      data[snapshot.date] = {};
      snapshot.goalies.forEach((goalie) => {
        data[snapshot.date][goalie.name] = goalie;
      });
    });
    return data;
  }, [rankedSnapshots]);

  // Format stat value for display
  const formatStatValue = (value: number, type: GoalieStatType): string => {
    switch (type) {
      case "svPct":
        return value.toFixed(3);
      case "gaa":
        return value.toFixed(2);
      case "so":
        return value.toString();
      default:
        return value.toString();
    }
  };

  // Calculate the actual max rank to display (based on available goalies, not topN)
  const actualMaxRank = useMemo(() => {
    let maxRank = 0;
    rankedSnapshots.forEach((snapshot) => {
      const count = Math.min(snapshot.goalies.length, topN);
      if (count > maxRank) maxRank = count;
    });
    return maxRank || topN;
  }, [rankedSnapshots, topN]);

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: true,
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
              const goalieName = item.dataset.label || "";
              const rank = item.raw as number;
              const snapshot = rankedSnapshots[item.dataIndex];

              if (!snapshot) return `${goalieName}: #${rank}`;

              const goalieData = tooltipData[snapshot.date]?.[goalieName];
              if (!goalieData) return `${goalieName}: #${rank}`;

              // Use full team name from mapping, fallback to abbreviation
              const teamName = teamNameMap[goalieData.team] || goalieData.team;
              const statLabel =
                statType === "svPct"
                  ? "SV%"
                  : statType === "gaa"
                    ? "GAA"
                    : "SO";
              return [
                `${goalieName}: #${rank}`,
                `  ${statLabel}: ${formatStatValue(goalieData.statValue, statType)} | GP: ${goalieData.gp}`,
                `  Team: ${teamName} | W: ${goalieData.w} L: ${goalieData.l} T: ${goalieData.t}`,
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
          max: actualMaxRank + 1,
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
              if (value < 1 || value > actualMaxRank) return "";
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
    [statType, rankedSnapshots, tooltipData, actualMaxRank, teamNameMap],
  );

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <div className="chart-empty">
        <p>
          No goalies with {GOALIE_MIN_GP}+ games played in this division yet.
        </p>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <Line data={chartData} options={options} />
    </div>
  );
}

export default GoalieStatsChart;
