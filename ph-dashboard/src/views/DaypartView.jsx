import { C, DAYPART_ORDER } from "../theme";
import { fmtPct, metricHelpers } from "../lib/format";

const DAY_NAME_ORDER = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

export default function DaypartView({ daypartHeatmapData, metricMode }) {
  const { metricLabel } = metricHelpers(metricMode);
  const dayOrder = (name) => DAY_NAME_ORDER[name.toLowerCase()] ?? 99;
  const dayNames = [
    ...new Set(daypartHeatmapData.map((r) => r.DAYNAME)),
  ];
  const days = dayNames.sort((a, b) => dayOrder(a) - dayOrder(b));
  const dayparts = DAYPART_ORDER.filter((dp) =>
    daypartHeatmapData.some((r) => r.DAY_PART === dp),
  );

  const lookup = {};
  for (const r of daypartHeatmapData)
    lookup[`${r.DAYNAME}__${r.DAY_PART}`] = r;

  const heatColor = (pct) => {
    if (pct == null) return C.card;
    if (pct > 10) return "#0f4c35";
    if (pct > 5) return "#166534";
    if (pct > 0) return "#14532d";
    if (pct > -5) return "#7c2d12";
    if (pct > -10) return "#991b1b";
    return "#7f1d1d";
  };
  const textColor = (pct) => {
    if (pct == null) return C.muted;
    return pct >= 0 ? C.teal : C.accent;
  };

  if (!daypartHeatmapData.length)
    return (
      <div style={{ color: C.muted, fontSize: 13 }}>
        No data available
      </div>
    );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            marginBottom: 4,
          }}
        >
          Daypart Heatmap
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>
          CY {metricLabel.toLowerCase()}, vs PY1 % and {metricMode === "transactions" ? "" : "£"}variance by day and daypart
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: C.muted,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          vs PY1:
        </span>
        {[
          { label: ">+10%", color: "#0f4c35" },
          { label: "+5–10%", color: "#166534" },
          { label: "0–5%", color: "#14532d" },
          { label: "-5–0%", color: "#7c2d12" },
          { label: "-10–-5%", color: "#991b1b" },
          { label: "<-10%", color: "#7f1d1d" },
        ].map((l) => (
          <div
            key={l.label}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: l.color,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: C.muted,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {l.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 3,
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: 110,
                  padding: "6px 8px",
                  textAlign: "left",
                  fontSize: 11,
                  color: C.muted,
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 400,
                }}
              />
              {days.map((d) => (
                <th
                  key={d}
                  style={{
                    padding: "6px 8px",
                    textAlign: "center",
                    fontSize: 11,
                    color: C.muted,
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.slice(0, 3).toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayparts.map((dp) => (
              <tr key={dp}>
                <td
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    color: C.muted,
                    fontFamily: "'DM Mono', monospace",
                    whiteSpace: "nowrap",
                    verticalAlign: "middle",
                  }}
                >
                  {dp}
                </td>
                {days.map((day) => {
                  const cell = lookup[`${day}__${dp}`];
                  const pct = cell?.growth_py1 ?? null;
                  const cy = cell?.cy ?? 0;
                  const diff = cell ? cell.cy - cell.py1 : 0;
                  return (
                    <td key={day} style={{ padding: 0 }}>
                      <div
                        style={{
                          background: heatColor(pct),
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          padding: "8px 10px",
                          textAlign: "center",
                          minWidth: 110,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: C.text,
                            fontFamily: "'DM Mono', monospace",
                            marginBottom: 3,
                          }}
                        >
                          {cy > 0
                            ? `${metricMode === "transactions" ? "" : "£"}${(cy / 1000).toFixed(1)}k`
                            : "—"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: textColor(pct),
                            fontFamily: "'DM Mono', monospace",
                            marginBottom: 2,
                          }}
                        >
                          {fmtPct(pct)}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          {diff !== 0
                            ? `${diff >= 0 ? "+" : "-"}${metricMode === "transactions" ? "" : "£"}${(Math.abs(diff) / 1000).toFixed(1)}k`
                            : "—"}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
