import React from "react";
import { DivisionName } from "./types";

interface DivisionToggleProps {
  divisions: DivisionName[];
  selected: DivisionName;
  onChange: (division: DivisionName) => void;
}

// Short display names for the toggle buttons
const DIVISION_SHORT_NAMES: Record<DivisionName, string> = {
  "1-BRODEUR": "Brodeur",
  "2-MANNO": "Manno",
  "3-STEVENS NORTH": "Stevens N",
  "3-STEVENS SOUTH": "Stevens S",
};

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
      {divisions.map((division) => (
        <button
          key={division}
          role="tab"
          aria-selected={selected === division}
          className={`toggle-button ${selected === division ? "active" : ""}`}
          onClick={() => onChange(division)}
        >
          <span className="toggle-number">{division.split("-")[0]}</span>
          <span className="toggle-name">{DIVISION_SHORT_NAMES[division]}</span>
        </button>
      ))}
    </div>
  );
}

export default DivisionToggle;
