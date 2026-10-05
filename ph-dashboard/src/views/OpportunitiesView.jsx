import { C } from "../theme";
import { metricHelpers } from "../lib/format";
import { Badge, GrowthPill } from "../components/Badge";
import { classifyStores } from "../lib/stores";

export default function OpportunitiesView({
  storeRows,
  metricMode,
}) {
  const { metricLabel, fmtVal } = metricHelpers(metricMode);
  const { growingStores, decliningStores, newStores } = classifyStores(storeRows);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Declining stores */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Declining vs PY1
            </h3>
            <Badge
              label={`${decliningStores.length} stores`}
              color={C.accent}
            />
          </div>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
            CY {metricLabel.toLowerCase()} below prior year — investigate root cause
          </p>
          <div>
            {decliningStores.slice(0, 10).map((s) => (
              <div
                key={`${s.STORE_ID}-${s.FRANCHISE}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {s.STORE_NAME}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {s.FRANCHISE}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <GrowthPill cy={s.cy} py={s.py1} />
                  <div
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      fontFamily: "'DM Mono', monospace",
                      marginTop: 2,
                    }}
                  >
                    {fmtVal(s.cy, 2)} vs {fmtVal(s.py1, 2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growing stars */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 16 }}>🚀</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Top Performers vs PY1
            </h3>
            <Badge
              label={`${growingStores.length} stores`}
              color={C.teal}
            />
          </div>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
            Strong YoY growth — identify replicable practices
          </p>
          <div>
            {growingStores.slice(0, 10).map((s) => (
              <div
                key={`${s.STORE_ID}-${s.FRANCHISE}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {s.STORE_NAME}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {s.FRANCHISE}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <GrowthPill cy={s.cy} py={s.py1} />
                  <div
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      fontFamily: "'DM Mono', monospace",
                      marginTop: 2,
                    }}
                  >
                    {fmtVal(s.cy, 2)} vs {fmtVal(s.py1, 2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New stores */}
      {newStores.length > 0 && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 16 }}>✨</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              New Trading Stores (no PY1)
            </h3>
            <Badge label={`${newStores.length} stores`} color={C.gold} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            {newStores.map((s) => (
              <div
                key={`${s.STORE_ID}-${s.FRANCHISE}`}
                style={{
                  background: C.surface,
                  borderRadius: 8,
                  padding: "10px 14px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {s.STORE_NAME}
                </div>
                <div
                  style={{
                    color: C.teal,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                  }}
                >
                  {fmtVal(s.cy, 2)}
                </div>
                <div style={{ color: C.muted, fontSize: 11 }}>
                  {s.FRANCHISE}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
