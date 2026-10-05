import { C } from "../theme";

// Pill-style single choice, e.g. £ Sales / # Txns. options: [{ value, label }]
export default function SegmentedToggle({ options, value, onChange, style }) {
  return (
    <div
      style={{
        display: "flex",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: 3,
        gap: 3,
        ...style,
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            background: value === o.value ? C.accent : "transparent",
            color: value === o.value ? "#fff" : C.muted,
            border: "none",
            borderRadius: 4,
            padding: "4px 12px",
            cursor: "pointer",
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            transition: "all 0.15s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
