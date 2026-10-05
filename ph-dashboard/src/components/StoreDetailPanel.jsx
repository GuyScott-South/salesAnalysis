import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { C, CHANNEL_COLORS } from "../theme";
import { fmtPct, growthColor, metricHelpers } from "../lib/format";
import { Badge } from "./Badge";
import KPI from "./KPI";

// Headline figures plus channel / daypart breakdown for one store.
// `store` is a row from useDashboardData's storeRows; `detail` comes from useStoreDetail.
export default function StoreDetailPanel({ store, detail, metricMode, onClose }) {
  const { metricLabel, fmtVal } = metricHelpers(metricMode);

  return (
    <div
      style={{
        marginTop: 20,
        background: C.card,
        border: `1px solid ${C.accent}44`,
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            {store.STORE_NAME}
            <span
              style={{
                color: C.muted,
                fontWeight: 400,
                fontSize: 14,
                marginLeft: 10,
              }}
            >
              #{store.STORE_ID}
            </span>
          </h3>
          <p style={{ margin: "4px 0 0", color: C.textSub }}>
            {store.FRANCHISE}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Badge
              label={store.AIS_STORE_STATUS}
              color={
                store.AIS_STORE_STATUS === "Open"
                  ? "#22C55E"
                  : C.accent
              }
            />
            <Badge
              label={store.CHANNEL_TYPE}
              color={C.gold}
            />
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            fontSize: 20,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <KPI
          label={`CY ${metricLabel}`}
          value={fmtVal(store.cy, 2)}
          color={C.teal}
        />
        <KPI label={`PY1 ${metricLabel}`} value={fmtVal(store.py1, 2)} />
        <KPI label={`PY2 ${metricLabel}`} value={fmtVal(store.py2, 2)} />
        <KPI
          label="vs PY1"
          value={fmtPct(store.growth_py1)}
          color={growthColor(store.growth_py1)}
        />
        <KPI
          label="vs PY2"
          value={fmtPct(store.growth_py2)}
          color={growthColor(store.growth_py2)}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Channel Breakdown
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={detail.channelBreakdown}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.border}
                vertical={false}
              />
              <XAxis
                dataKey="CHANNEL"
                tick={{ fill: C.muted, fontSize: 9 }}
              />
              <YAxis tick={{ fill: C.muted, fontSize: 9 }} />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  fontSize: 11,
                }}
                formatter={(v) => fmtVal(v, 2)}
              />
              <Bar
                dataKey="cy"
                name="CY"
                fill={C.teal}
                radius={[3, 3, 0, 0]}
              >
                {detail.channelBreakdown.map((d) => (
                  <Cell
                    key={d.CHANNEL}
                    fill={CHANNEL_COLORS[d.CHANNEL] || C.muted}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Daypart Breakdown
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={detail.daypartBreakdown}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.border}
                vertical={false}
              />
              <XAxis
                dataKey="DAY_PART"
                tick={{ fill: C.muted, fontSize: 8 }}
              />
              <YAxis tick={{ fill: C.muted, fontSize: 9 }} />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  fontSize: 11,
                }}
                formatter={(v) => fmtVal(v, 2)}
              />
              <Bar
                dataKey="cy"
                name="CY"
                fill={C.gold}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="py1"
                name="PY1"
                fill="#6B7280"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
