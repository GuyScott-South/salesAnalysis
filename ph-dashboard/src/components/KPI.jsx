import { C } from "../theme";

export default function KPI({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 20px",
        minWidth: 140,
      }}
    >
      <div
        style={{
          color: C.textSub,
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: color || C.text,
          fontSize: 26,
          fontWeight: 700,
          fontFamily: "'Syne', sans-serif",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}
