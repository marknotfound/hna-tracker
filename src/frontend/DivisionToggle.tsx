import React from "react";
import { DivisionName } from "./types";

interface DivisionToggleProps {
  divisions: DivisionName[];
  selected: DivisionName;
  onChange: (division: DivisionName) => void;
}

// Derive a leading number (if the division is named like "1-BRODEUR") and a
// readable label from a division name. Works for any season's divisions.
function formatDivision(division: DivisionName): {
  number: string;
  name: string;
} {
  const match = division.match(/^(\d+)\s*-\s*(.+)$/);
  if (match) {
    return { number: match[1], name: titleCase(match[2]) };
  }
  return { number: "", name: titleCase(division) };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function DivisionToggle({
  divisions,
  selected,
  onChange,
}: DivisionToggleProps) {
  return (
    <div
      className="division-toggle"
      role="tablist"
      aria-label="Select division"
    >
      {divisions.map((division) => {
        const { number, name } = formatDivision(division);
        return (
          <button
            key={division}
            role="tab"
            aria-selected={selected === division}
            className={`toggle-button ${selected === division ? "active" : ""}`}
            onClick={() => onChange(division)}
          >
            {number && <span className="toggle-number">{number}</span>}
            <span className="toggle-name">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DivisionToggle;
