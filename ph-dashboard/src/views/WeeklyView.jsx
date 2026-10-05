import { C } from "../theme";
import { metricHelpers } from "../lib/format";
import { GrowthPill } from "../components/Badge";
import KPI from "../components/KPI";
import SectionHeader from "../components/SectionHeader";
import BoxPlotChart from "../components/BoxPlotChart";

export default function WeeklyView({
  weeklyData,
  metricMode,
}) {
  const { metricLabel, fmtVal } = metricHelpers(metricMode);

  return (
    <div>
      <SectionHeader
        title="Weekly Store Performance Distribution"
        subtitle={`Box plots showing CY vs PY1 store ${metricLabel.toLowerCase()} distribution per week (P10–P90)`}
      />
      {weeklyData.length > 0 &&
        (() => {
          const cyWins = weeklyData.filter(
            (d) => d.cy_median > d.py_median,
          ).length;
          const totalWeeks = weeklyData.length;
          const avgCyMedian =
            weeklyData.reduce((s, d) => s + (d.cy_median || 0), 0) /
            totalWeeks;
          const avgPyMedian =
            weeklyData.reduce((s, d) => s + (d.py_median || 0), 0) /
            totalWeeks;
          return (
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              <KPI label="Weeks" value={totalWeeks} />
              <KPI
                label={`Avg Median CY ${metricLabel}`}
                value={fmtVal(avgCyMedian)}
                color={C.teal}
              />
              <KPI label={`Avg Median PY1 ${metricLabel}`} value={fmtVal(avgPyMedian)} />
              <KPI
                label="CY > PY1 Weeks"
                value={`${cyWins} / ${totalWeeks}`}
                color={cyWins > totalWeeks / 2 ? C.teal : C.accent}
                sub={`${((cyWins / totalWeeks) * 100).toFixed(0)}% of weeks`}
              />
            </div>
          );
        })()}
      <BoxPlotChart data={weeklyData} height={420} metricMode={metricMode} />
      {weeklyData.length > 0 && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: "hidden",
            marginTop: 20,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
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
                  "Week",
                  "Stores",
                  "CY Median",
                  "CY IQR",
                  "PY1 Median",
                  "PY1 IQR",
                  "Median Δ",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
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
              {weeklyData.map((d, i) => {
                const wk =
                  d.week_start instanceof Date
                    ? d.week_start.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : new Date(d.week_start).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                return (
                  <tr
                    key={i}
                    style={{ borderTop: `1px solid ${C.border}` }}
                  >
                    <td
                      style={{
                        padding: "7px 12px",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {wk}
                    </td>
                    <td style={{ padding: "7px 12px", color: C.muted }}>
                      {d.store_count}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        color: C.teal,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {fmtVal(d.cy_median)}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        color: C.textSub,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {fmtVal(d.cy_p25)} – {fmtVal(d.cy_p75)}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {fmtVal(d.py_median)}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        color: C.textSub,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {fmtVal(d.py_p25)} – {fmtVal(d.py_p75)}
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      <GrowthPill cy={d.cy_median} py={d.py_median} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
