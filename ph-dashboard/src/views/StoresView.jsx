import { useState, useMemo } from "react";
import { C } from "../theme";
import { metricHelpers } from "../lib/format";
import { Badge, GrowthPill } from "../components/Badge";
import SectionHeader from "../components/SectionHeader";
import StoreDetailPanel from "../components/StoreDetailPanel";
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

      {selectedStore && storeDetail && (
        <StoreDetailPanel
          store={selectedStore}
          detail={storeDetail}
          metricMode={metricMode}
          onClose={() => onSelectStore(null)}
        />
      )}
    </div>
  );
}
