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
import { DailySnapshot, DivisionName, TeamStanding } from "./types";

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

interface StandingsChartProps {
  snapshots: DailySnapshot[];
  division: DivisionName;
}

// Distinctive team colors - each team gets a unique color
const TEAM_COLORS = [
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
];

function StandingsChart({ snapshots, division }: StandingsChartProps) {
  const chartData = useMemo(() => {
    if (snapshots.length === 0) {
      return null;
    }

    // Get unique team names for this division
    const teams = new Set<string>();
    snapshots.forEach((snapshot) => {
      const divisionData = snapshot.divisions[division];
      if (divisionData) {
        divisionData.forEach((team) => teams.add(team.team));
      }
    });

    // Sort teams by their most recent standings position (for legend order)
    const mostRecentSnapshot = snapshots[snapshots.length - 1];
    const mostRecentDivision = mostRecentSnapshot?.divisions[division] || [];
    const teamList = Array.from(teams).sort((a, b) => {
      const posA = mostRecentDivision.find((t) => t.team === a)?.position ?? Infinity;
      const posB = mostRecentDivision.find((t) => t.team === b)?.position ?? Infinity;
      return posA - posB;
    });

    // Create labels (dates)
    const labels = snapshots.map((s) => format(parseISO(s.date), "MMM d"));

    // Create datasets (one per team)
    const datasets = teamList.map((teamName, index) => {
      const data = snapshots.map((snapshot) => {
        const divisionData = snapshot.divisions[division];
        if (!divisionData) return null;

        const teamData = divisionData.find((t) => t.team === teamName);
        return teamData ? teamData.position : null;
      });

      return {
        label: teamName,
        data,
        borderColor: TEAM_COLORS[index % TEAM_COLORS.length],
        backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length] + "20",
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: TEAM_COLORS[index % TEAM_COLORS.length],
        pointBorderColor: "#1a1a2e",
        pointBorderWidth: 2,
        tension: 0.3,
        fill: false,
      };
    });

    return { labels, datasets };
  }, [snapshots, division]);

  // Store original data for tooltip
  const tooltipData = useMemo(() => {
    const data: Record<string, Record<string, TeamStanding>> = {};
    snapshots.forEach((snapshot) => {
      const divisionData = snapshot.divisions[division];
      if (divisionData) {
        data[snapshot.date] = {};
        divisionData.forEach((team) => {
          data[snapshot.date][team.team] = team;
        });
      }
    });
    return data;
  }, [snapshots, division]);

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
              size: 12,
            },
            padding: 20,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        title: {
          display: true,
          text: `Standings Over Time`,
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
            // Sort tooltip items by position (ascending)
            const posA = a.raw as number;
            const posB = b.raw as number;
            return posA - posB;
          },
          callbacks: {
            title: (items: TooltipItem<"line">[]) => {
              if (items.length === 0) return "";
              const index = items[0].dataIndex;
              const snapshot = snapshots[index];
              return snapshot
                ? format(parseISO(snapshot.date), "EEEE, MMMM d, yyyy")
                : "";
            },
            label: (item: TooltipItem<"line">) => {
              const teamName = item.dataset.label || "";
              const position = item.raw as number;
              const snapshot = snapshots[item.dataIndex];

              if (!snapshot) return `${teamName}: #${position}`;

              const teamStats = tooltipData[snapshot.date]?.[teamName];
              if (!teamStats) return `${teamName}: #${position}`;

              return [
                `${teamName}: #${position}`,
                `  Record: ${teamStats.w}-${teamStats.l}-${teamStats.t}-${teamStats.otl}`,
                `  Points: ${teamStats.pts} | W%: ${teamStats.wpct.toFixed(3)}`,
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
          reverse: true, // Position 1 at top
          min: 0, // Add padding above position 1
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
              // Hide the 0 label, only show integer positions
              if (value < 1) return "";
              return `#${value}`;
            },
          },
          title: {
            display: true,
            text: "Position",
            color: "#a3a3a3",
            font: {
              family: "Outfit, sans-serif",
              size: 13,
            },
          },
        },
      },
    }),
    [division, snapshots, tooltipData],
  );

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <div className="chart-empty">
        <p>No data available for this division yet.</p>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <Line data={chartData} options={options} />
    </div>
  );
}

export default StandingsChart;
