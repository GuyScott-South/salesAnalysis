import { C } from "../theme";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "stores", label: "Stores" },
  { id: "franchisees", label: "Franchisees" },
  { id: "opportunities", label: "Opportunities" },
  { id: "weekly", label: "Weekly" },
  { id: "spread", label: "Store Spread" },
  { id: "daypart", label: "Daypart" },
  { id: "geography", label: "Geography" },
];

export default function Header({ fileName, view, onViewChange, onLoadNew }) {
  return (
    <div
      style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          height: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 28 }} />
          <span
            style={{
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "-0.02em",
            }}
          >
            PH UK Performance
          </span>
          {fileName && (
            <span
              style={{
                color: C.muted,
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {fileName}
            </span>
          )}
        </div>
        <nav style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          {NAV_ITEMS.map((n) => (
            <button
              key={n.id}
              onClick={() => onViewChange(n.id)}
              style={{
                background: view === n.id ? C.accent : "transparent",
                color: view === n.id ? "#fff" : C.textSub,
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                transition: "all 0.15s",
              }}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            onClick={onLoadNew}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.muted,
              borderRadius: 6,
              padding: "5px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Load new CSV
          </button>
        </div>
      </div>
    </div>
  );
}
