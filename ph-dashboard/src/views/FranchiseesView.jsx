import { C } from "../theme";
import { growthColor, metricHelpers } from "../lib/format";
import { GrowthPill } from "../components/Badge";
import SectionHeader from "../components/SectionHeader";

export default function FranchiseesView({
  franchiseeRows,
  metricMode,
}) {
  const { metricLabel, fmtVal } = metricHelpers(metricMode);

  return (
    <div>
      <SectionHeader
        title="Franchisee Performance"
        subtitle={`${franchiseeRows.length} franchise groups`}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
        }}
      >
        {franchiseeRows.map((f) => {
          const totalStores = f.store_count;
          const growPct =
            f.py1 > 0 ? ((f.cy - f.py1) / f.py1) * 100 : null;
          const healthScore =
            f.py1 > 0
              ? (f.growing / Math.max(f.growing + f.declining, 1)) * 100
              : 50;
          return (
            <div
              key={f.FRANCHISE}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 18,
                borderLeft: `3px solid ${growPct === null ? C.muted : growthColor(growPct)}`,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 4,
                  color: C.text,
                }}
              >
                {f.FRANCHISE}
              </div>
              <div
                style={{
                  color: C.muted,
                  fontSize: 11,
                  fontFamily: "'DM Mono', monospace",
                  marginBottom: 12,
                }}
              >
                {totalStores} store{totalStores !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <div>
                  <div
                    style={{
                      color: C.muted,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    CY {metricLabel}
                  </div>
                  <div
                    style={{
                      color: C.teal,
                      fontWeight: 700,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {fmtVal(f.cy, 2)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      color: C.muted,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    vs PY1
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    <GrowthPill cy={f.cy} py={f.py1} />
                  </div>
                </div>
              </div>
              {/* Health bar */}
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: C.muted, fontSize: 10 }}>
                    Store health
                  </span>
                  <span
                    style={{
                      color: C.muted,
                      fontSize: 10,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {f.growing}↑ {f.declining}↓
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: C.border,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${healthScore}%`,
                      background:
                        healthScore > 60
                          ? C.teal
                          : healthScore > 40
                            ? C.gold
                            : C.accent,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
