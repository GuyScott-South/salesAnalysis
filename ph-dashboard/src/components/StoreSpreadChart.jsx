import { useState, useEffect, useRef, useMemo } from "react";
import { C } from "../theme";
import { fmtPct, growthColor, metricHelpers } from "../lib/format";

const WIDE_STEP = 14; // px per store in "wide" mode, enough for a rotated name
const MAX_LABEL = 24;

// Round a raw tick interval up to 1, 2, 2.5 or 5 × 10^k
function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

// One box per store, worst to best. Box = middle 50% of days (P25–P75),
// whiskers = P5–P95, line = median day, dot = the store's overall % change.
export default function StoreSpreadChart({
  rows,
  businessGrowth,
  wide,
  metricMode,
  granularity,
  selectedStoreId,
  onSelectStore,
  height = 460,
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [hover, setHover] = useState(null); // { i, x, y }
  const { fmtVal } = metricHelpers(metricMode);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const margin = { top: 16, right: 24, bottom: wide ? 150 : 36, left: 56 };
    const n = Math.max(rows.length, 1);
    const fitStep = (containerWidth - margin.left - margin.right) / n;
    const step = wide ? Math.max(WIDE_STEP, fitStep) : fitStep;
    const width = wide
      ? margin.left + margin.right + step * n
      : containerWidth;
    const innerH = height - margin.top - margin.bottom;

    const vals = rows.flatMap((r) => [r.p05, r.p95, r.growth]);
    vals.push(0);
    if (businessGrowth != null) vals.push(businessGrowth);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const tick = niceStep(Math.max(hi - lo, 1) / 6);
    const yMin = Math.floor(lo / tick) * tick;
    const yMax = Math.ceil(hi / tick) * tick;
    const y = (v) =>
      margin.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
    const ticks = [];
    for (let v = yMin; v <= yMax + tick / 2; v += tick) ticks.push(v);

    return { margin, step, width, innerH, y, ticks };
  }, [rows, businessGrowth, wide, containerWidth, height]);

  const { margin, step, width, innerH, y, ticks } = geo;
  const xOf = (i) => margin.left + (i + 0.5) * step;

  // Boxes don't depend on hover, so mousemove doesn't redraw ~400 of them
  const boxes = useMemo(() => {
    const bw = Math.max(1, step * 0.7);
    const detailed = bw >= 3;
    return rows.map((r, i) => {
      const cx = margin.left + (i + 0.5) * step;
      const color = growthColor(r.growth);
      return (
        <g key={r.STORE_ID}>
          <line
            x1={cx}
            x2={cx}
            y1={y(r.p95)}
            y2={y(r.p05)}
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={1}
          />
          <rect
            x={cx - bw / 2}
            y={y(r.p75)}
            width={bw}
            height={Math.max(1, y(r.p25) - y(r.p75))}
            fill={color + (detailed ? "66" : "AA")}
            stroke={detailed ? color : "none"}
            strokeWidth={1}
            rx={detailed ? 1.5 : 0}
          />
          {detailed && (
            <line
              x1={cx - bw / 2}
              x2={cx + bw / 2}
              y1={y(r.median)}
              y2={y(r.median)}
              stroke={C.text}
              strokeWidth={1.5}
            />
          )}
          <circle
            cx={cx}
            cy={y(r.growth)}
            r={Math.min(3, Math.max(1.4, bw / 2.2))}
            fill="#fff"
            stroke={C.bg}
            strokeWidth={detailed ? 1 : 0}
          />
        </g>
      );
    });
  }, [rows, step, margin, y]);

  const handleMove = (e) => {
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - margin.left) / step);
    if (i < 0 || i >= rows.length) return setHover(null);
    setHover({ i, x: e.clientX, y: e.clientY });
  };

  const selectedIndex = rows.findIndex((r) => r.STORE_ID === selectedStoreId);
  const hovered = hover ? rows[hover.i] : null;
  const unit = granularity === "week" ? "weeks" : "days";
  const tipLeft =
    hover && hover.x > window.innerWidth - 300 ? hover.x - 280 : hover?.x + 14;

  return (
    <div
      ref={containerRef}
      style={{
        overflowX: wide ? "auto" : "hidden",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "12px 0",
      }}
    >
      <svg width={width} height={height} style={{ display: "block" }}>
        {/* Y grid */}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={y(v)}
              y2={y(v)}
              stroke={C.border}
              strokeDasharray={v === 0 ? undefined : "3 3"}
            />
            <text
              x={margin.left - 8}
              y={y(v) + 4}
              textAnchor="end"
              fill={C.muted}
              fontSize={10}
              fontFamily="'DM Mono', monospace"
            >
              {v > 0 ? "+" : ""}
              {+v.toFixed(1)}%
            </text>
          </g>
        ))}

        {/* Selected / hovered store bands */}
        {selectedIndex >= 0 && (
          <rect
            x={xOf(selectedIndex) - step / 2}
            y={margin.top}
            width={step}
            height={innerH}
            fill={C.accent + "33"}
          />
        )}
        {hover && (
          <rect
            x={xOf(hover.i) - step / 2}
            y={margin.top}
            width={step}
            height={innerH}
            fill={C.text + "14"}
          />
        )}

        {/* Zero line */}
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={y(0)}
          y2={y(0)}
          stroke={C.textSub}
          strokeWidth={1.25}
        />

        {boxes}

        {/* Whole-business % change */}
        {businessGrowth != null && (
          <g>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={y(businessGrowth)}
              y2={y(businessGrowth)}
              stroke={C.gold}
              strokeWidth={1.25}
              strokeDasharray="6 4"
            />
            <text
              x={width - margin.right}
              y={y(businessGrowth) - 5}
              textAnchor="end"
              fill={C.gold}
              fontSize={10}
              fontFamily="'DM Mono', monospace"
              stroke={C.card}
              strokeWidth={3}
              paintOrder="stroke"
            >
              Business {fmtPct(businessGrowth)}
            </text>
          </g>
        )}

        {/* X axis */}
        {wide ? (
          rows.map((r, i) => (
            <text
              key={r.STORE_ID}
              transform={`translate(${xOf(i) + 3}, ${margin.top + innerH + 6}) rotate(-90)`}
              textAnchor="end"
              fill={i === hover?.i ? C.text : C.muted}
              fontSize={9}
              fontFamily="'DM Mono', monospace"
            >
              {r.STORE_NAME?.length > MAX_LABEL
                ? r.STORE_NAME.slice(0, MAX_LABEL - 1) + "…"
                : r.STORE_NAME}
            </text>
          ))
        ) : (
          <text
            x={margin.left + (width - margin.left - margin.right) / 2}
            y={height - 10}
            textAnchor="middle"
            fill={C.muted}
            fontSize={11}
            fontFamily="'DM Mono', monospace"
          >
            ← worst · {rows.length} stores ranked by % vs PY1 · best →
          </text>
        )}

        {/* Mouse target over the plot area */}
        <rect
          x={margin.left}
          y={margin.top}
          width={Math.max(0, width - margin.left - margin.right)}
          height={innerH}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          onClick={() =>
            hovered &&
            onSelectStore(
              hovered.STORE_ID === selectedStoreId ? null : hovered.STORE_ID,
            )
          }
        />
      </svg>

      {hovered && (
        <div
          style={{
            position: "fixed",
            left: tipLeft,
            top: hover.y + 14,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            color: C.text,
            zIndex: 1000,
            pointerEvents: "none",
            width: 260,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
            {hovered.STORE_NAME}
            <span style={{ color: C.muted, fontWeight: 400 }}>
              {" "}
              #{hovered.STORE_ID}
            </span>
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>
            {hovered.FRANCHISE} · rank {hover.i + 1} of {rows.length}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "3px 12px",
              fontSize: 11,
            }}
          >
            <span style={{ color: C.textSub }}>Period vs PY1</span>
            <span style={{ color: growthColor(hovered.growth), fontWeight: 700 }}>
              {fmtPct(hovered.growth)}
            </span>
            <span style={{ color: C.textSub }}>CY / PY1</span>
            <span>
              {fmtVal(hovered.cy)} / {fmtVal(hovered.py1)}
            </span>
            <span style={{ color: C.textSub }}>
              Median {granularity}
            </span>
            <span>{fmtPct(hovered.median)}</span>
            <span style={{ color: C.textSub }}>Middle 50%</span>
            <span>
              {fmtPct(hovered.p25)} to {fmtPct(hovered.p75)}
            </span>
            <span style={{ color: C.textSub }}>5th–95th</span>
            <span>
              {fmtPct(hovered.p05)} to {fmtPct(hovered.p95)}
            </span>
            <span style={{ color: C.textSub }}>Comparable {unit}</span>
            <span>{hovered.n}</span>
          </div>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 8 }}>
            Click to {hovered.STORE_ID === selectedStoreId ? "close" : "open"}{" "}
            store detail
          </div>
        </div>
      )}
    </div>
  );
}
