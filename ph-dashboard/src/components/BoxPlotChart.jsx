import { useState, useEffect, useRef } from "react";
import { C } from "../theme";
import { fmt, fmtTxn } from "../lib/format";

export default function BoxPlotChart({ data, height = 400, metricMode = "sales" }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const margin = { top: 20, right: 20, bottom: 60, left: 70 };

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0)
    return (
      <div style={{ color: C.muted, fontSize: 13 }}>
        No weekly data available
      </div>
    );

  const chartWidth = Math.max(containerWidth, 600);
  const innerW = chartWidth - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const allVals = data
    .flatMap((d) => [d.cy_p90, d.py_p90, d.cy_p10, d.py_p10])
    .filter((v) => v != null);
  const yMax = Math.max(...allVals) * 1.05;
  const yMin = Math.min(0, Math.min(...allVals) * 1.05);
  const yScale = (v) =>
    margin.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const weekWidth = innerW / data.length;
  const boxW = weekWidth * 0.28;
  const gap = 4;

  const yTicks = [];
  const step = (yMax - yMin) / 5;
  for (let i = 0; i <= 5; i++) yTicks.push(yMin + step * i);

  return (
    <div
      ref={containerRef}
      style={{
        overflowX: "auto",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "16px 0",
      }}
    >
      <svg
        width={chartWidth}
        height={height}
        style={{ display: "block" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={margin.left}
              x2={chartWidth - margin.right}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke={C.border}
              strokeDasharray="3 3"
            />
            <text
              x={margin.left - 8}
              y={yScale(v) + 4}
              textAnchor="end"
              fill={C.muted}
              fontSize={10}
              fontFamily="'DM Mono', monospace"
            >
              {metricMode === "transactions" ? "" : "£"}{(v / 1000).toFixed(0)}k
            </text>
          </g>
        ))}

        {/* Zero line */}
        {yMin < 0 && (
          <line
            x1={margin.left}
            x2={chartWidth - margin.right}
            y1={yScale(0)}
            y2={yScale(0)}
            stroke={C.muted}
            strokeWidth={1}
          />
        )}

        {/* Box plots */}
        {data.map((d, i) => {
          const cx = margin.left + (i + 0.5) * (innerW / data.length);
          const cyLeft = cx - gap - boxW;
          const pyLeft = cx + gap;

          const weekLabel =
            d.week_start instanceof Date
              ? d.week_start.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })
              : new Date(d.week_start).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                });

          return (
            <g
              key={i}
              onMouseEnter={(e) =>
                setTooltip({ x: e.clientX, y: e.clientY, d, weekLabel })
              }
              onMouseMove={(e) =>
                setTooltip((t) =>
                  t ? { ...t, x: e.clientX, y: e.clientY } : null,
                )
              }
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer" }}
            >
              {/* CY box */}
              <line
                x1={cyLeft + boxW / 2}
                x2={cyLeft + boxW / 2}
                y1={yScale(d.cy_p90)}
                y2={yScale(d.cy_p10)}
                stroke={C.teal}
                strokeWidth={1}
              />
              <line
                x1={cyLeft}
                x2={cyLeft + boxW}
                y1={yScale(d.cy_p90)}
                y2={yScale(d.cy_p90)}
                stroke={C.teal}
                strokeWidth={1}
              />
              <line
                x1={cyLeft}
                x2={cyLeft + boxW}
                y1={yScale(d.cy_p10)}
                y2={yScale(d.cy_p10)}
                stroke={C.teal}
                strokeWidth={1}
              />
              <rect
                x={cyLeft}
                y={yScale(d.cy_p75)}
                width={boxW}
                height={Math.max(1, yScale(d.cy_p25) - yScale(d.cy_p75))}
                fill={C.teal + "55"}
                stroke={C.teal}
                strokeWidth={1.5}
                rx={2}
              />
              <line
                x1={cyLeft}
                x2={cyLeft + boxW}
                y1={yScale(d.cy_median)}
                y2={yScale(d.cy_median)}
                stroke={C.teal}
                strokeWidth={2.5}
              />

              {/* PY box */}
              <line
                x1={pyLeft + boxW / 2}
                x2={pyLeft + boxW / 2}
                y1={yScale(d.py_p90)}
                y2={yScale(d.py_p10)}
                stroke={C.muted}
                strokeWidth={1}
              />
              <line
                x1={pyLeft}
                x2={pyLeft + boxW}
                y1={yScale(d.py_p90)}
                y2={yScale(d.py_p90)}
                stroke={C.muted}
                strokeWidth={1}
              />
              <line
                x1={pyLeft}
                x2={pyLeft + boxW}
                y1={yScale(d.py_p10)}
                y2={yScale(d.py_p10)}
                stroke={C.muted}
                strokeWidth={1}
              />
              <rect
                x={pyLeft}
                y={yScale(d.py_p75)}
                width={boxW}
                height={Math.max(1, yScale(d.py_p25) - yScale(d.py_p75))}
                fill={C.muted + "33"}
                stroke={C.muted}
                strokeWidth={1.5}
                rx={2}
              />
              <line
                x1={pyLeft}
                x2={pyLeft + boxW}
                y1={yScale(d.py_median)}
                y2={yScale(d.py_median)}
                stroke={C.muted}
                strokeWidth={2.5}
              />

              {/* Week label */}
              <text
                x={cx}
                y={height - margin.bottom + 16}
                textAnchor="middle"
                fill={C.textSub}
                fontSize={10}
                fontFamily="'DM Mono', monospace"
              >
                {weekLabel}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <rect
          x={margin.left}
          y={height - 20}
          width={10}
          height={10}
          fill={C.teal + "55"}
          stroke={C.teal}
          rx={2}
        />
        <text
          x={margin.left + 14}
          y={height - 11}
          fill={C.textSub}
          fontSize={11}
          fontFamily="'DM Mono', monospace"
        >
          CY
        </text>
        <rect
          x={margin.left + 50}
          y={height - 20}
          width={10}
          height={10}
          fill={C.muted + "33"}
          stroke={C.muted}
          rx={2}
        />
        <text
          x={margin.left + 64}
          y={height - 11}
          fill={C.textSub}
          fontSize={11}
          fontFamily="'DM Mono', monospace"
        >
          PY1
        </text>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            color: C.text,
            zIndex: 1000,
            pointerEvents: "none",
            minWidth: 180,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {tooltip.weekLabel}
          </div>
          <div style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>
            {tooltip.d.store_count} stores
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr 1fr",
              gap: "2px 10px",
              fontSize: 11,
            }}
          >
            <span></span>
            <span style={{ color: C.teal, fontWeight: 600 }}>CY</span>
            <span style={{ color: C.muted, fontWeight: 600 }}>PY1</span>
            <span style={{ color: C.textSub }}>P90</span>
            <span>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.cy_p90)}</span>
            <span>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.py_p90)}</span>
            <span style={{ color: C.textSub }}>P75</span>
            <span>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.cy_p75)}</span>
            <span>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.py_p75)}</span>
            <span style={{ color: C.textSub }}>Med</span>
            <span style={{ fontWeight: 700 }}>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.cy_median)}</span>
            <span style={{ fontWeight: 700 }}>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.py_median)}</span>
            <span style={{ color: C.textSub }}>P25</span>
            <span>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.cy_p25)}</span>
            <span>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.py_p25)}</span>
            <span style={{ color: C.textSub }}>P10</span>
            <span>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.cy_p10)}</span>
            <span>{(metricMode === "transactions" ? fmtTxn : fmt)(tooltip.d.py_p10)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
