import { C } from "../theme";
import { fmtPct, growthColor } from "../lib/format";

export function Badge({ label, color }) {
  return (
    <span
      style={{
        background: color + "22",
        color,
        border: `1px solid ${color}44`,
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function GrowthPill({ cy, py }) {
  if (!py || py === 0) return <Badge label="NEW" color={C.teal} />;
  const pct = ((cy - py) / py) * 100;
  const color = growthColor(pct);
  return <Badge label={fmtPct(pct)} color={color} />;
}
