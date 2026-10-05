import { useState, useMemo } from "react";
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
import { Badge, GrowthPill } from "../components/Badge";
import KPI from "../components/KPI";
import SectionHeader from "../components/SectionHeader";
import ChannelMixBar from "../components/ChannelMixBar";

export default function StoresView({
  storeRows,
  storeChannelMap,
  storeDetail,
  selectedStoreId,
  onSelectStore,
  metricMode,
}) {
  const { metricLabel, fmtVal } = metricHelpers(metricMode);
  const [sortField, setSortField] = useState("cy");
  const [sortDir, setSortDir] = useState("desc");

  const sortedStoreRows = useMemo(() => {
    const mult = sortDir === "desc" ? -1 : 1;
    return [...storeRows].sort((a, b) => {
      const av = a[sortField] ?? -Infinity;
      const bv = b[sortField] ?? -Infinity;
      return av < bv ? -mult : av > bv ? mult : 0;
    });
  }, [storeRows, sortField, sortDir]);

  // Looked up from the current rows so its figures follow the filters
  const selectedStore =
    storeRows.find((s) => s.STORE_ID === selectedStoreId) ?? null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <SectionHeader
          title="Store Performance"
          subtitle={`${storeRows.length} stores`}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["cy", `CY ${metricLabel}`],
            ["growth_py1", "vs PY1 %"],
            ["py1", `PY1 ${metricLabel}`],
          ].map(([f, l]) => (
            <button
              key={f}
              onClick={() => {
                if (sortField === f)
                  setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                else {
                  setSortField(f);
                  setSortDir("desc");
                }
              }}
              style={{
                background: sortField === f ? C.accent + "33" : C.card,
                border: `1px solid ${sortField === f ? C.accent : C.border}`,
                color: sortField === f ? C.accent : C.muted,
                borderRadius: 6,
                padding: "5px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {l}{" "}
              {sortField === f ? (sortDir === "desc" ? "↓" : "↑") : ""}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
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
                background: C.surface,
                color: C.muted,
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
              }}
            >
              {[
                "Store",
                "Franchise",
                "Type",
                "Status",
                `CY ${metricLabel}`,
                `PY1 ${metricLabel}`,
                `PY2 ${metricLabel}`,
                "vs PY1",
                "vs PY2",
                "Channel Mix",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedStoreRows.map((s) => (
              <tr
                key={`${s.STORE_ID}-${s.FRANCHISE}`}
                onClick={() =>
                  onSelectStore(
                    s.STORE_ID === selectedStoreId ? null : s.STORE_ID,
                  )
                }
                style={{
                  borderTop: `1px solid ${C.border}`,
                  cursor: "pointer",
                  background:
                    selectedStore?.STORE_ID === s.STORE_ID
                      ? C.accent + "15"
                      : "transparent",
                  transition: "background 0.1s",
                }}
              >
                <td
                  style={{
                    padding: "9px 12px",
                    color: C.text,
                    fontWeight: 600,
                  }}
                >
                  {s.STORE_NAME}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    color: C.textSub,
                    fontSize: 11,
                    maxWidth: 140,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.FRANCHISE}
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <Badge
                    label={s.CHANNEL_TYPE}
                    color={s.CHANNEL_TYPE === "DINE IN" ? C.gold : C.teal}
                  />
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <Badge
                    label={s.AIS_STORE_STATUS}
                    color={
                      s.AIS_STORE_STATUS === "Open"
                        ? "#22C55E"
                        : s.AIS_STORE_STATUS === "Closed"
                          ? C.accent
                          : C.gold
                    }
                  />
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontFamily: "'DM Mono', monospace",
                    color: C.teal,
                  }}
                >
                  {fmtVal(s.cy, 2)}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontFamily: "'DM Mono', monospace",
                    color: C.muted,
                  }}
                >
                  {fmtVal(s.py1, 2)}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontFamily: "'DM Mono', monospace",
                    color: C.muted,
                  }}
                >
                  {fmtVal(s.py2, 2)}
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <GrowthPill cy={s.cy} py={s.py1} />
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <GrowthPill cy={s.cy} py={s.py2} />
                </td>
                <td style={{ padding: "9px 12px", minWidth: 100 }}>
                  <ChannelMixBar
                    data={storeChannelMap[s.STORE_ID] || []}
                    metricMode={metricMode}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Store Detail Drawer */}
      {selectedStore && storeDetail && (
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
                {selectedStore.STORE_NAME}
                <span
                  style={{
                    color: C.muted,
                    fontWeight: 400,
                    fontSize: 14,
                    marginLeft: 10,
                  }}
                >
                  #{selectedStore.STORE_ID}
                </span>
              </h3>
              <p style={{ margin: "4px 0 0", color: C.textSub }}>
                {selectedStore.FRANCHISE}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Badge
                  label={selectedStore.AIS_STORE_STATUS}
                  color={
                    selectedStore.AIS_STORE_STATUS === "Open"
                      ? "#22C55E"
                      : C.accent
                  }
                />
                <Badge
                  label={selectedStore.CHANNEL_TYPE}
                  color={C.gold}
                />
              </div>
            </div>
            <button
              onClick={() => onSelectStore(null)}
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
              value={fmtVal(selectedStore.cy, 2)}
              color={C.teal}
            />
            <KPI label={`PY1 ${metricLabel}`} value={fmtVal(selectedStore.py1, 2)} />
            <KPI label={`PY2 ${metricLabel}`} value={fmtVal(selectedStore.py2, 2)} />
            <KPI
              label="vs PY1"
              value={fmtPct(selectedStore.growth_py1)}
              color={growthColor(selectedStore.growth_py1)}
            />
            <KPI
              label="vs PY2"
              value={fmtPct(selectedStore.growth_py2)}
              color={growthColor(selectedStore.growth_py2)}
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
                <BarChart data={storeDetail.channelBreakdown}>
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
                    {storeDetail.channelBreakdown.map((d) => (
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
                <BarChart data={storeDetail.daypartBreakdown}>
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
      )}
    </div>
  );
}
