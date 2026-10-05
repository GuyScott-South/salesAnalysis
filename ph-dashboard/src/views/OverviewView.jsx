import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { C } from "../theme";
import { fmtPct, growthColor, metricHelpers } from "../lib/format";
import { GrowthPill } from "../components/Badge";
import KPI from "../components/KPI";
import SectionHeader from "../components/SectionHeader";
import { classifyStores } from "../lib/stores";

export default function OverviewView({
  kpis,
  channelData,
  daypartData,
  storeRows,
  metricMode,
  onSelectStore,
}) {
  const { metricLabel, fmtVal } = metricHelpers(metricMode);
  const { decliningStores } = classifyStores(storeRows);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <KPI
          label={`Total CY ${metricLabel}`}
          value={fmtVal(kpis.total_cy)}
          sub={`PY1: ${fmtVal(kpis.total_py1)}`}
          color={C.teal}
        />
        <KPI
          label="vs PY1"
          value={fmtPct(
            kpis.total_py1 > 0
              ? ((kpis.total_cy - kpis.total_py1) / kpis.total_py1) * 100
              : null,
          )}
          color={growthColor(
            kpis.total_py1 > 0
              ? ((kpis.total_cy - kpis.total_py1) / kpis.total_py1) * 100
              : 0,
          )}
        />
        <KPI
          label="vs PY2"
          value={fmtPct(
            kpis.total_py2 > 0
              ? ((kpis.total_cy - kpis.total_py2) / kpis.total_py2) * 100
              : null,
          )}
        />
        <KPI
          label="Active Stores"
          value={kpis.active_stores}
          sub={`of ${kpis.total_stores} total`}
        />
        <KPI
          label="Growing Stores"
          value={kpis.growing_stores}
          color={C.teal}
        />
        <KPI
          label="Declining Stores"
          value={kpis.declining_stores}
          color={C.accent}
        />
        <KPI label="Franchisees" value={kpis.total_franchises} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* Channel chart */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <SectionHeader
            title={`${metricLabel} by Channel`}
            subtitle="CY vs PY1 vs PY2"
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={channelData}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.border}
                vertical={false}
              />
              <XAxis
                dataKey="CHANNEL"
                tick={{
                  fill: C.muted,
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                }}
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 10 }}
                tickFormatter={(v) => `${metricMode === "transactions" ? "" : "£"}${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                }}
                formatter={(v, n) => [fmtVal(v, 2), n]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: C.textSub }} />
              <Bar
                dataKey="cy"
                name="CY"
                fill={C.teal}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="py1"
                name="PY1"
                fill="#6B7280"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="py2"
                name="PY2"
                fill="#4B5563"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daypart chart */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <SectionHeader title={`${metricLabel} by Daypart`} subtitle="CY vs PY1" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={daypartData}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.border}
                vertical={false}
              />
              <XAxis
                dataKey="DAY_PART"
                tick={{
                  fill: C.muted,
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                }}
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 10 }}
                tickFormatter={(v) => `${metricMode === "transactions" ? "" : "£"}${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                }}
                formatter={(v, n) => [fmtVal(v, 2), n]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: C.textSub }} />
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

      {/* Top / Bottom stores quick view */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <SectionHeader title={`🏆 Top 10 Stores by CY ${metricLabel}`} />
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  color: C.muted,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "4px 0" }}>Store</th>
                <th>CY</th>
                <th>vs PY1</th>
              </tr>
            </thead>
            <tbody>
              {[...storeRows]
                .sort((a, b) => b.cy - a.cy)
                .slice(0, 10)
                .map((s, i) => (
                  <tr
                    key={`${s.STORE_ID}-${s.FRANCHISE}`}
                    onClick={() => onSelectStore(s.STORE_ID)}
                    style={{
                      cursor: "pointer",
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    <td style={{ padding: "7px 0", color: C.text }}>
                      <span style={{ color: C.muted, marginRight: 8 }}>
                        {i + 1}
                      </span>
                      {s.STORE_NAME}
                    </td>
                    <td
                      style={{
                        color: C.teal,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {fmtVal(s.cy, 2)}
                    </td>
                    <td>
                      <GrowthPill cy={s.cy} py={s.py1} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <SectionHeader title="⚠️ Biggest Declines vs PY1" />
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  color: C.muted,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "4px 0" }}>Store</th>
                <th>CY</th>
                <th>PY1</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {decliningStores.slice(0, 10).map((s) => (
                <tr
                  key={`${s.STORE_ID}-${s.FRANCHISE}`}
                  onClick={() => onSelectStore(s.STORE_ID)}
                  style={{
                    cursor: "pointer",
                    borderTop: `1px solid ${C.border}`,
                  }}
                >
                  <td style={{ padding: "7px 0", color: C.text }}>
                    {s.STORE_NAME}
                  </td>
                  <td
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      color: C.muted,
                    }}
                  >
                    {fmtVal(s.cy, 2)}
                  </td>
                  <td
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      color: C.muted,
                    }}
                  >
                    {fmtVal(s.py1, 2)}
                  </td>
                  <td>
                    <GrowthPill cy={s.cy} py={s.py1} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
