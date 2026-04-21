import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as LeafletTooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

// ─── Colour System ──────────────────────────────────────────────────────────
const C = {
  bg: "#0D0F14",
  surface: "#151820",
  card: "#1C2030",
  border: "#252A3A",
  accent: "#E8331C", // PH red
  accentLt: "#FF5A45",
  gold: "#F5A623",
  teal: "#22D3C8",
  muted: "#6B7280",
  text: "#E8EAF0",
  textSub: "#9CA3AF",
};

const CHANNEL_COLORS = {
  "UBER EATS": "#06B6D4",
  DELIVEROO: "#10B981",
  "JUST EAT": "#F59E0B",
  DELIVERY: "#8B5CF6",
  COLLECTION: "#F472B6",
  "DINE IN": "#60A5FA",
  DAAS: "#A78BFA",
};

const DAYPART_ORDER = [
  "LUNCH",
  "AFTERNOON",
  "EARLY EVENING",
  "MID EVENING",
  "LATE EVENING",
  "LATE NIGHT",
];

// ─── DuckDB loader ──────────────────────────────────────────────────────────
async function loadDuckDB() {
  // Use cdn-delivered duckdb-wasm
  const JSDELIVR =
    "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/dist/";
  const duckdb =
    await import("https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm");
  const BUNDLES = {
    mvp: {
      mainModule: JSDELIVR + "duckdb-mvp.wasm",
      mainWorker: JSDELIVR + "duckdb-browser-mvp.worker.js",
    },
    eh: {
      mainModule: JSDELIVR + "duckdb-eh.wasm",
      mainWorker: JSDELIVR + "duckdb-browser-eh.worker.js",
    },
  };
  const bundle = await duckdb.selectBundle(BUNDLES);
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    }),
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule);
  return db;
}

// ─── Utility ────────────────────────────────────────────────────────────────
const fmt = (v, dec = 0) =>
  v == null
    ? "—"
    : `£${Number(v).toLocaleString("en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
const fmtTxn = (v, dec = 0) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtPct = (v) =>
  v == null || isNaN(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const growthColor = (v) =>
  v > 5 ? C.teal : v > 0 ? "#86EFAC" : v > -5 ? C.gold : C.accent;

// ─── Components ─────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 20px",
        minWidth: 140,
      }}
    >
      <div
        style={{
          color: C.textSub,
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: color || C.text,
          fontSize: 26,
          fontWeight: 700,
          fontFamily: "'Syne', sans-serif",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span
      style={{
        background: color + "22",
        color,
        border: `1px solid ${color}44`,
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function GrowthPill({ cy, py }) {
  if (!py || py === 0) return <Badge label="NEW" color={C.teal} />;
  const pct = ((cy - py) / py) * 100;
  const color = growthColor(pct);
  return <Badge label={fmtPct(pct)} color={color} />;
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "'Syne', sans-serif",
          fontSize: 18,
          color: C.text,
          fontWeight: 700,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 13 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Multi-Select Filter ─────────────────────────────────────────────────────
function MultiSelect({ label, selected, onChange, opts, format }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (opt) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt],
    );
  };

  const displayLabel =
    selected.length === 0
      ? `All ${label}s`
      : selected.length === 1
        ? format
          ? format(selected[0])
          : selected[0]
        : `${selected.length} ${label}s`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: C.card,
          border: `1px solid ${selected.length > 0 ? C.teal : C.border}`,
          color: selected.length > 0 ? C.text : C.muted,
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 12,
          fontFamily: "'DM Mono', monospace",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {displayLabel} ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 1000,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "4px 0",
            minWidth: 200,
            maxHeight: 280,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {selected.length > 0 && (
            <div
              onClick={() => onChange([])}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                color: C.accent,
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                borderBottom: `1px solid ${C.border}`,
                marginBottom: 4,
              }}
            >
              Clear selection
            </div>
          )}
          {opts.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                cursor: "pointer",
                color: selected.includes(opt) ? C.text : C.muted,
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                style={{ accentColor: C.teal, cursor: "pointer" }}
              />
              {format ? format(opt) : opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Channel Mix Bar ─────────────────────────────────────────────────────────
function ChannelMixBar({ data, metricMode = "sales" }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const total = data.reduce((s, d) => s + d.cy, 0);
  if (!total)
    return <span style={{ color: C.muted, fontSize: 12 }}>No CY {metricMode === "transactions" ? "transactions" : "sales"}</span>;
  const filtered = data.filter((d) => d.cy > 0).sort((a, b) => b.cy - a.cy);
  return (
    <div style={{ position: "relative" }}>
      <div
        onMouseEnter={(e) => {
          setPos({ x: e.clientX, y: e.clientY });
          setHovered(true);
        }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          gap: 1,
          cursor: "default",
        }}
      >
        {filtered.map((d) => (
          <div
            key={d.channel}
            style={{
              flex: d.cy,
              background: CHANNEL_COLORS[d.channel] || C.muted,
            }}
          />
        ))}
      </div>
      {hovered && (
        <div
          style={{
            position: "fixed",
            left: pos.x + 12,
            top: pos.y + 12,
            zIndex: 9999,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 16px",
            minWidth: 200,
            pointerEvents: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginBottom: 10,
              fontFamily: "'DM Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Channel Mix
          </div>
          <div
            style={{
              display: "flex",
              height: 12,
              borderRadius: 4,
              overflow: "hidden",
              gap: 1,
              marginBottom: 12,
            }}
          >
            {filtered.map((d) => (
              <div
                key={d.channel}
                style={{
                  flex: d.cy,
                  background: CHANNEL_COLORS[d.channel] || C.muted,
                }}
              />
            ))}
          </div>
          {filtered.map((d) => {
            const pct = ((d.cy / total) * 100).toFixed(1);
            return (
              <div
                key={d.channel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: CHANNEL_COLORS[d.channel] || C.muted,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: C.text,
                    flex: 1,
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {d.channel}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {pct}%
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.teal,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {metricMode === "transactions" ? fmtTxn(d.cy) : fmt(d.cy)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Box Plot Chart ──────────────────────────────────────────────────────────
function BoxPlotChart({ data, height = 400, metricMode = "sales" }) {
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

// ─── Main App ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [db, setDb] = useState(null);
  const [conn, setConn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);

  // Metric mode
  const [metricMode, setMetricMode] = useState("sales"); // sales | transactions

  // Filters
  const [view, setView] = useState("overview"); // overview | stores | franchisees | opportunities
  const [filterFranchise, setFilterFranchise] = useState([]);
  const [filterChannel, setFilterChannel] = useState([]);
  const [filterDaypart, setFilterDaypart] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterBusiness, setFilterBusiness] = useState([]);
  const [sortField, setSortField] = useState("cy");
  const [sortDir, setSortDir] = useState("desc");
  const [storeSearch, setStoreSearch] = useState("");
  const [storeOptions, setStoreOptions] = useState([]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState(null);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const storeSearchRef = useRef(null);
  const [filterWeek, setFilterWeek] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);

  // Data
  const [kpis, setKpis] = useState(null);
  const [storeRows, setStoreRows] = useState([]);
  const [franchiseeRows, setFranchiseeRows] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [daypartData, setDaypartData] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [channels, setChannels] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [storeChannelMap, setStoreChannelMap] = useState({});
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeDetail, setStoreDetail] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [daypartHeatmapData, setDaypartHeatmapData] = useState([]);
  const [geoData, setGeoData] = useState([]);
  const [geocodeCache, setGeocodeCache] = useState({});
  const [geoLoading, setGeoLoading] = useState(false);

  // Init DuckDB
  useEffect(() => {
    let cancelled = false;
    loadDuckDB()
      .then(async (database) => {
        const c = await database.connect();
        if (!cancelled) {
          setDb(database);
          setConn(c);
        }
      })
      .catch((e) => {
        if (!cancelled) setError("Failed to load DuckDB: " + e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCSV = useCallback(
    async (file) => {
      if (!db || !conn) return;
      setLoading(true);
      setError(null);
      try {
        const text = await file.text();
        const blob = new Blob([text], { type: "text/csv" });
        await db.registerFileHandle(
          "sales.csv",
          blob,
          2 /* BROWSER_BUFFER */,
          true,
        );
        await conn.query(`DROP TABLE IF EXISTS sales`);
        await conn.query(`
        CREATE TABLE sales AS
        WITH raw AS (
          SELECT
            BUSINESS_DATE::DATE AS BUSINESS_DATE,
            DAYNAME,
            STORE_ID::VARCHAR AS STORE_ID,
            STORE_NAME,
            FRANCHISE,
            POSTAL_CODE,
            AIS_STORE_STATUS,
            CASE
              WHEN CHANNEL = 'DAAS' THEN 'DELIVERY'
              WHEN CHANNEL = 'SLICE' THEN 'COLLECTION'
              WHEN CHANNEL = 'AGGREGATOR' THEN 'UBER EATS'
              WHEN CHANNEL LIKE 'IN-STORE%' THEN 'DELIVERY'
              WHEN CHANNEL LIKE 'AGGR%' THEN 'JUST EAT'
              WHEN CHANNEL LIKE 'DELIVERY->UE%' THEN 'UBER EATS'
              WHEN CHANNEL LIKE 'DELIVERY->JE%' THEN 'JUST EAT'
              WHEN CHANNEL LIKE 'DELIVERY->DV%' THEN 'DELIVERY'
              ELSE CHANNEL
            END AS CHANNEL,
            CHANNEL_TYPE,
            DAY_PART,
            TRY_CAST(CY_NET_SALES_BASE AS DOUBLE) AS CY,
            TRY_CAST(PY_1_NET_SALES_BASE AS DOUBLE) AS PY1,
            TRY_CAST(PY_2_NET_SALES_BASE AS DOUBLE) AS PY2,
            TRY_CAST(CY_TRANSACTION_CNT AS DOUBLE) AS TXN_CY,
            TRY_CAST(PY_1_TRANSACTION_CNT AS DOUBLE) AS TXN_PY1,
            TRY_CAST(PY_2_TRANSACTION_CNT AS DOUBLE) AS TXN_PY2
          FROM read_csv_auto('sales.csv', header=true)
        ),
        latest_franchise AS (
          SELECT STORE_ID, FRANCHISE
          FROM (
            SELECT STORE_ID, FRANCHISE,
              ROW_NUMBER() OVER (PARTITION BY STORE_ID ORDER BY BUSINESS_DATE DESC) AS rn
            FROM raw
          )
          WHERE rn = 1
        )
        SELECT r.BUSINESS_DATE, r.DAYNAME, r.STORE_ID, r.STORE_NAME,
          lf.FRANCHISE, r.POSTAL_CODE, r.AIS_STORE_STATUS,
          r.CHANNEL, r.CHANNEL_TYPE, r.DAY_PART, r.CY, r.PY1, r.PY2,
          r.TXN_CY, r.TXN_PY1, r.TXN_PY2
        FROM raw r
        JOIN latest_franchise lf ON r.STORE_ID = lf.STORE_ID
      `);
        setFileName(file.name);
        setDbReady(true);
      } catch (e) {
        setError("Error loading CSV: " + e.message);
      }
      setLoading(false);
    },
    [db, conn],
  );

  function buildWhere(
    franchise,
    channel,
    daypart,
    status,
    storeId,
    week,
    business,
  ) {
    const inList = (vals) =>
      vals.map((v) => `'${v.replace(/'/g, "''")}'`).join(",");
    const conds = [];
    if (franchise.length > 0) conds.push(`FRANCHISE IN (${inList(franchise)})`);
    if (channel.length > 0) conds.push(`CHANNEL IN (${inList(channel)})`);
    if (daypart.length > 0) conds.push(`DAY_PART IN (${inList(daypart)})`);
    if (status.length > 0)
      conds.push(`AIS_STORE_STATUS IN (${inList(status)})`);
    if (business.length > 0)
      conds.push(`CHANNEL_TYPE IN (${inList(business)})`);
    if (storeId) conds.push(`STORE_ID='${storeId.replace(/'/g, "''")}'`);
    if (week.length > 0)
      conds.push(
        `DATE_TRUNC('week', BUSINESS_DATE)::VARCHAR IN (${inList(week)})`,
      );
    return conds.length ? "WHERE " + conds.join(" AND ") : "";
  }

  // Helper to run a query and return plain JS objects
  const runQ = useCallback(
    async (sql) => {
      if (!conn) return [];
      const result = await conn.query(sql);
      return result
        .toArray()
        .map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [
              k,
              typeof v === "bigint" ? Number(v) : v,
            ]),
          ),
        );
    },
    [conn],
  );

  // Store autocomplete: debounced lookup
  useEffect(() => {
    if (selectedStoreFilter || storeSearch.length < 2 || !conn || !dbReady) {
      const timer = setTimeout(() => {
        setStoreOptions([]);
        setShowStoreDropdown(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(async () => {
      const term = storeSearch.toLowerCase().replace(/'/g, "''");
      const results = await runQ(
        `SELECT DISTINCT STORE_ID, STORE_NAME FROM sales
         WHERE LOWER(STORE_NAME) LIKE '%${term}%' OR LOWER(STORE_ID) LIKE '%${term}%'
         ORDER BY STORE_NAME LIMIT 10`,
      );
      setStoreOptions(results);
      setShowStoreDropdown(results.length > 0);
    }, 200);
    return () => clearTimeout(timer);
  }, [storeSearch, selectedStoreFilter, conn, dbReady, runQ]);

  // Close store dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (storeSearchRef.current && !storeSearchRef.current.contains(e.target))
        setShowStoreDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const geocodePostcodes = useCallback(async (postcodes, existingCache) => {
    const uncached = postcodes.filter(
      (pc) => pc && !existingCache[pc.trim().toUpperCase()],
    );
    if (uncached.length === 0) return existingCache;
    const newCache = { ...existingCache };
    const batches = [];
    for (let i = 0; i < uncached.length; i += 100)
      batches.push(uncached.slice(i, i + 100));
    for (const batch of batches) {
      try {
        const resp = await fetch("https://api.postcodes.io/postcodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postcodes: batch }),
        });
        const data = await resp.json();
        if (data.result) {
          for (const item of data.result) {
            if (item.result) {
              newCache[item.query.toUpperCase()] = {
                lat: item.result.latitude,
                lng: item.result.longitude,
              };
            }
          }
        }
      } catch (e) {
        console.warn("Geocoding batch failed:", e);
      }
    }
    return newCache;
  }, []);

  // Geocode when geography view is active
  useEffect(() => {
    if (view !== "geography" || geoData.length === 0) return;
    let cancelled = false;
    (async () => {
      setGeoLoading(true);
      const postcodes = [
        ...new Set(
          geoData
            .map((s) => s.POSTAL_CODE?.trim().toUpperCase())
            .filter(Boolean),
        ),
      ];
      const newCache = await geocodePostcodes(postcodes, geocodeCache);
      if (!cancelled) {
        setGeocodeCache(newCache);
        setGeoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, geoData, geocodePostcodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh data whenever filters, sorting, or db readiness change
  useEffect(() => {
    if (!conn || !dbReady) return;
    let cancelled = false;

    (async () => {
      const cy = metricMode === "transactions" ? "TXN_CY" : "CY";
      const py1 = metricMode === "transactions" ? "TXN_PY1" : "PY1";
      const py2 = metricMode === "transactions" ? "TXN_PY2" : "PY2";
      const w = buildWhere(
        filterFranchise,
        filterChannel,
        filterDaypart,
        filterStatus,
        selectedStoreFilter?.STORE_ID,
        filterWeek,
        filterBusiness,
      );
      setLoading(true);
      try {
        // Available weeks (unfiltered so dropdown always shows all)
        const weeks = await runQ(
          `SELECT DISTINCT DATE_TRUNC('week', BUSINESS_DATE)::VARCHAR AS wc FROM sales ORDER BY wc DESC`,
        );
        if (cancelled) return;
        setAvailableWeeks(weeks.map((r) => r.wc));
        const [kpiRow] = await runQ(`
          SELECT COUNT(*) AS total_stores, SUM(cy) AS total_cy, SUM(py1) AS total_py1, SUM(py2) AS total_py2,
            COUNT(DISTINCT FRANCHISE) AS total_franchises,
            COUNT(CASE WHEN cy > 0 THEN 1 END) AS active_stores,
            COUNT(CASE WHEN cy < py1 AND py1 > 0 THEN 1 END) AS declining_stores,
            COUNT(CASE WHEN cy > py1 AND py1 > 0 THEN 1 END) AS growing_stores
          FROM (
            SELECT STORE_ID, FRANCHISE, SUM(${cy}) AS cy, SUM(${py1}) AS py1, SUM(${py2}) AS py2
            FROM sales ${w} GROUP BY STORE_ID, FRANCHISE
          ) agg`);
        if (cancelled) return;
        setKpis(kpiRow);

        const flist = await runQ(
          `SELECT DISTINCT FRANCHISE FROM sales ORDER BY FRANCHISE`,
        );
        if (cancelled) return;
        setFranchises(flist.map((r) => r.FRANCHISE));

        const clist = await runQ(
          `SELECT DISTINCT CHANNEL FROM sales ORDER BY CHANNEL`,
        );
        if (cancelled) return;
        setChannels(clist.map((r) => r.CHANNEL));

        const btlist = await runQ(
          `SELECT DISTINCT CHANNEL_TYPE FROM sales WHERE CHANNEL_TYPE IS NOT NULL ORDER BY CHANNEL_TYPE`,
        );
        if (cancelled) return;
        setBusinessTypes(btlist.map((r) => r.CHANNEL_TYPE));

        const cdata = await runQ(
          `SELECT CHANNEL, SUM(${cy}) AS cy, SUM(${py1}) AS py1, SUM(${py2}) AS py2 FROM sales ${w} GROUP BY CHANNEL ORDER BY cy DESC`,
        );
        if (cancelled) return;
        setChannelData(cdata);

        const dp = await runQ(
          `SELECT DAY_PART, SUM(${cy}) AS cy, SUM(${py1}) AS py1, SUM(${py2}) AS py2 FROM sales ${w} GROUP BY DAY_PART`,
        );
        if (cancelled) return;
        setDaypartData(
          DAYPART_ORDER.map(
            (d) =>
              dp.find((r) => r.DAY_PART === d) || {
                DAY_PART: d,
                cy: 0,
                py1: 0,
                py2: 0,
              },
          ),
        );

        const stores = await runQ(`
          SELECT STORE_ID, STORE_NAME, FRANCHISE, AIS_STORE_STATUS, MODE(CHANNEL_TYPE) AS CHANNEL_TYPE,
            SUM(${cy}) AS cy, SUM(${py1}) AS py1, SUM(${py2}) AS py2,
            CASE WHEN SUM(${py1})>0 THEN ((SUM(${cy})-SUM(${py1}))/SUM(${py1}))*100 ELSE NULL END AS growth_py1,
            CASE WHEN SUM(${py2})>0 THEN ((SUM(${cy})-SUM(${py2}))/SUM(${py2}))*100 ELSE NULL END AS growth_py2
          FROM sales ${w}
          GROUP BY STORE_ID, STORE_NAME, FRANCHISE, AIS_STORE_STATUS`);
        if (cancelled) return;
        setStoreRows(stores);

        const storeChannels = await runQ(
          `SELECT STORE_ID, CHANNEL, SUM(${cy}) AS cy FROM sales ${w} GROUP BY STORE_ID, CHANNEL`,
        );
        if (cancelled) return;
        const scMap = {};
        for (const row of storeChannels) {
          if (!scMap[row.STORE_ID]) scMap[row.STORE_ID] = [];
          scMap[row.STORE_ID].push({ channel: row.CHANNEL, cy: row.cy });
        }
        setStoreChannelMap(scMap);

        const wf = buildWhere(
          [],
          filterChannel,
          filterDaypart,
          filterStatus,
          selectedStoreFilter?.STORE_ID,
          filterWeek,
          filterBusiness,
        );
        const franchisees = await runQ(`
          WITH store_agg AS (
            SELECT FRANCHISE, STORE_ID, SUM(${cy}) AS cy, SUM(${py1}) AS py1, SUM(${py2}) AS py2
            FROM sales ${wf}
            GROUP BY FRANCHISE, STORE_ID
          )
          SELECT FRANCHISE,
            COUNT(DISTINCT STORE_ID) AS store_count,
            SUM(cy) AS cy, SUM(py1) AS py1, SUM(py2) AS py2,
            CASE WHEN SUM(py1)>0 THEN ((SUM(cy)-SUM(py1))/SUM(py1))*100 ELSE NULL END AS growth_py1,
            COUNT(DISTINCT CASE WHEN cy>py1 AND py1>0 THEN STORE_ID END) AS growing,
            COUNT(DISTINCT CASE WHEN cy<py1 AND py1>0 THEN STORE_ID END) AS declining
          FROM store_agg
          GROUP BY FRANCHISE ORDER BY SUM(cy) DESC`);
        if (cancelled) return;
        setFranchiseeRows(franchisees);

        // Geography data
        const geoStores = await runQ(`
          SELECT STORE_ID, STORE_NAME, FRANCHISE,
            MODE(POSTAL_CODE) AS POSTAL_CODE,
            SUM(${cy}) AS cy, SUM(${py1}) AS py1,
            CASE WHEN SUM(${py1})>0 THEN ((SUM(${cy})-SUM(${py1}))/SUM(${py1}))*100 ELSE NULL END AS growth_pct
          FROM sales ${w}
          GROUP BY STORE_ID, STORE_NAME, FRANCHISE
          HAVING MODE(POSTAL_CODE) IS NOT NULL`);
        if (cancelled) return;
        setGeoData(geoStores);

        // Weekly distribution data
        const weekly = await runQ(`
          WITH store_weeks AS (
            SELECT DATE_TRUNC('week', BUSINESS_DATE) AS week_start, STORE_ID,
              SUM(${cy}) AS cy, SUM(${py1}) AS py1
            FROM sales ${w}
            GROUP BY week_start, STORE_ID
          ),
          full_weeks AS (
            SELECT DATE_TRUNC('week', BUSINESS_DATE) AS week_start
            FROM sales ${w}
            GROUP BY DATE_TRUNC('week', BUSINESS_DATE)
            HAVING COUNT(DISTINCT DAYNAME) = 7
          ),
          weekly_stats AS (
            SELECT sw.week_start, COUNT(*) AS store_count,
              PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY cy) AS cy_p10,
              PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cy) AS cy_p25,
              PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cy) AS cy_median,
              PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cy) AS cy_p75,
              PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY cy) AS cy_p90,
              PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY py1) AS py_p10,
              PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY py1) AS py_p25,
              PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY py1) AS py_median,
              PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY py1) AS py_p75,
              PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY py1) AS py_p90
            FROM store_weeks sw
            INNER JOIN full_weeks fw ON sw.week_start = fw.week_start
            GROUP BY sw.week_start
          )
          SELECT * FROM weekly_stats
          ORDER BY week_start DESC
          LIMIT 12`);
        if (cancelled) return;
        setWeeklyData(weekly.reverse());

        const heatmap = await runQ(`
          SELECT DAYNAME, DAY_PART,
            SUM(${cy}) AS cy, SUM(${py1}) AS py1,
            CASE WHEN SUM(${py1})>0 THEN ((SUM(${cy})-SUM(${py1}))/SUM(${py1}))*100 ELSE NULL END AS growth_py1
          FROM sales ${w}
          GROUP BY DAYNAME, DAY_PART`);
        if (cancelled) return;
        setDaypartHeatmapData(heatmap);
      } catch (e) {
        if (!cancelled) setError("Query error: " + e.message);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    conn,
    dbReady,
    runQ,
    metricMode,
    filterFranchise,
    filterChannel,
    filterDaypart,
    filterStatus,
    selectedStoreFilter,
    filterWeek,
    filterBusiness,
  ]);

  const fetchStoreDetail = useCallback(
    async (storeId) => {
      if (!conn || !dbReady) return null;
      const cy = metricMode === "transactions" ? "TXN_CY" : "CY";
      const py1 = metricMode === "transactions" ? "TXN_PY1" : "PY1";
      const channelBreakdown = await runQ(`
      SELECT CHANNEL, SUM(${cy}) AS cy, SUM(${py1}) AS py1
      FROM sales WHERE STORE_ID='${storeId}' GROUP BY CHANNEL ORDER BY cy DESC
    `);
      const daypartBreakdown = await runQ(`
      SELECT DAY_PART, SUM(${cy}) AS cy, SUM(${py1}) AS py1
      FROM sales WHERE STORE_ID='${storeId}' GROUP BY DAY_PART
    `);
      const dpOrdered = DAYPART_ORDER.map(
        (d) =>
          daypartBreakdown.find((r) => r.DAY_PART === d) || {
            DAY_PART: d,
            cy: 0,
            py1: 0,
          },
      );
      return { channelBreakdown, daypartBreakdown: dpOrdered };
    },
    [conn, dbReady, runQ, metricMode],
  );

  useEffect(() => {
    let cancelled = false;
    const promise = selectedStore
      ? fetchStoreDetail(selectedStore.STORE_ID)
      : Promise.resolve(null);
    promise.then((detail) => {
      if (!cancelled) setStoreDetail(detail);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedStore, fetchStoreDetail]);

  // ── Drop zone ──────────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) loadCSV(file);
    },
    [loadCSV],
  );

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) loadCSV(file);
    },
    [loadCSV],
  );

  // Client-side sorting of aggregated store data (must be before early return to respect Rules of Hooks)
  const sortedStoreRows = useMemo(() => {
    const mult = sortDir === "desc" ? -1 : 1;
    return [...storeRows].sort((a, b) => {
      const av = a[sortField] ?? -Infinity;
      const bv = b[sortField] ?? -Infinity;
      return av < bv ? mult : av > bv ? -mult : 0;
    });
  }, [storeRows, sortField, sortDir]);

  // ── Upload screen ──────────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <div style={{ textAlign: "center", maxWidth: 500, padding: 32 }}>
          <div style={{ marginBottom: 8 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 48 }} />
          </div>
          <h1
            style={{
              color: C.text,
              fontSize: 32,
              fontWeight: 800,
              margin: "0 0 8px",
            }}
          >
            PH UK Performance
          </h1>
          <p style={{ color: C.textSub, marginBottom: 32 }}>
            Drop your sales CSV to begin analysis
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("csvInput").click()}
            style={{
              border: `2px dashed ${dragging ? C.accent : C.border}`,
              borderRadius: 16,
              padding: "48px 32px",
              cursor: "pointer",
              background: dragging ? C.accent + "11" : C.card,
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
            <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>
              {loading ? "Loading…" : "Drop CSV here or click to browse"}
            </div>
            <div style={{ color: C.muted, fontSize: 13 }}>
              Supports large files — powered by DuckDB-WASM
            </div>
            <input
              id="csvInput"
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
          </div>
          {error && (
            <div style={{ color: C.accent, marginTop: 16, fontSize: 13 }}>
              {error}
            </div>
          )}
          {!db && (
            <div style={{ color: C.muted, marginTop: 16, fontSize: 12 }}>
              Initialising DuckDB…
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Metric helpers ─────────────────────────────────────────────────────────
  const metricLabel = metricMode === "transactions" ? "Transactions" : "Sales";
  const fmtVal = metricMode === "transactions" ? fmtTxn : fmt;

  // ── Main Dashboard ─────────────────────────────────────────────────────────
  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "stores", label: "Stores" },
    { id: "franchisees", label: "Franchisees" },
    { id: "opportunities", label: "Opportunities" },
    { id: "weekly", label: "Weekly" },
    { id: "daypart", label: "Daypart" },
    { id: "geography", label: "Geography" },
  ];

  const growingStores = storeRows
    .filter((s) => s.cy > s.py1 && s.py1 > 0)
    .sort((a, b) => b.growth_py1 - a.growth_py1);
  const decliningStores = storeRows
    .filter((s) => s.cy < s.py1 && s.py1 > 0)
    .sort((a, b) => a.growth_py1 - b.growth_py1);
  const newStores = storeRows.filter((s) => s.cy > 0 && s.py1 === 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Syne', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div
        style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 24,
            height: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 28 }} />
            <span
              style={{
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: "-0.02em",
              }}
            >
              PH UK Performance
            </span>
            {fileName && (
              <span
                style={{
                  color: C.muted,
                  fontSize: 12,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {fileName}
              </span>
            )}
          </div>
          <nav style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {navItems.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                style={{
                  background: view === n.id ? C.accent : "transparent",
                  color: view === n.id ? "#fff" : C.textSub,
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  transition: "all 0.15s",
                }}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              onClick={() => {
                setDbReady(false);
                setFileName(null);
                setKpis(null);
              }}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.muted,
                borderRadius: 6,
                padding: "5px 12px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Load new CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            ref={storeSearchRef}
            style={{ position: "relative", width: 240 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative",
              }}
            >
              <input
                placeholder="Search store…"
                value={
                  selectedStoreFilter
                    ? selectedStoreFilter.STORE_NAME
                    : storeSearch
                }
                onChange={(e) => {
                  if (selectedStoreFilter) return;
                  setStoreSearch(e.target.value);
                  if (e.target.value.length >= 2) setShowStoreDropdown(true);
                }}
                onFocus={() => {
                  if (!selectedStoreFilter && storeOptions.length > 0)
                    setShowStoreDropdown(true);
                }}
                readOnly={!!selectedStoreFilter}
                style={{
                  background: C.card,
                  border: `1px solid ${selectedStoreFilter ? C.accent : C.border}`,
                  color: C.text,
                  borderRadius: 6,
                  padding: "6px 12px",
                  paddingRight: selectedStoreFilter ? 28 : 12,
                  fontSize: 13,
                  fontFamily: "'Syne', sans-serif",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              {selectedStoreFilter && (
                <button
                  onClick={() => {
                    setSelectedStoreFilter(null);
                    setStoreSearch("");
                    setStoreOptions([]);
                  }}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: C.muted,
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
            {showStoreDropdown && storeOptions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  marginTop: 2,
                  maxHeight: 220,
                  overflowY: "auto",
                  zIndex: 999,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {storeOptions.map((s) => (
                  <div
                    key={s.STORE_ID}
                    onClick={() => {
                      setSelectedStoreFilter(s);
                      setStoreSearch("");
                      setShowStoreDropdown(false);
                      setStoreOptions([]);
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "'Syne', sans-serif",
                      color: C.text,
                      borderBottom: `1px solid ${C.border}22`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = C.accent + "22")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div>{s.STORE_NAME}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {s.STORE_ID}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <MultiSelect
            label="Week"
            selected={filterWeek}
            onChange={setFilterWeek}
            opts={availableWeeks}
            format={(o) =>
              "w/c " +
              new Date(o).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            }
          />
          <MultiSelect
            label="Franchisee"
            selected={filterFranchise}
            onChange={setFilterFranchise}
            opts={franchises}
          />
          <MultiSelect
            label="Channel"
            selected={filterChannel}
            onChange={setFilterChannel}
            opts={channels}
          />
          <MultiSelect
            label="Business"
            selected={filterBusiness}
            onChange={setFilterBusiness}
            opts={businessTypes}
          />
          <MultiSelect
            label="Daypart"
            selected={filterDaypart}
            onChange={setFilterDaypart}
            opts={DAYPART_ORDER}
          />
          <MultiSelect
            label="Status"
            selected={filterStatus}
            onChange={setFilterStatus}
            opts={["Open", "Closed", "TC"]}
          />
          {(filterFranchise.length > 0 ||
            filterChannel.length > 0 ||
            filterDaypart.length > 0 ||
            filterStatus.length > 0 ||
            filterWeek.length > 0 ||
            filterBusiness.length > 0 ||
            selectedStoreFilter) && (
            <button
              onClick={() => {
                setFilterFranchise([]);
                setFilterChannel([]);
                setFilterDaypart([]);
                setFilterStatus([]);
                setFilterWeek([]);
                setFilterBusiness([]);
                setSelectedStoreFilter(null);
                setStoreSearch("");
                setStoreOptions([]);
              }}
              style={{
                background: C.accent + "22",
                border: `1px solid ${C.accent}44`,
                color: C.accent,
                borderRadius: 6,
                padding: "5px 12px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Clear filters
            </button>
          )}
          {loading && (
            <span
              style={{
                color: C.muted,
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Querying…
            </span>
          )}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: 3,
              gap: 3,
            }}
          >
            {[
              { mode: "sales", label: "£ Sales" },
              { mode: "transactions", label: "# Txns" },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setMetricMode(mode)}
                style={{
                  background: metricMode === mode ? C.accent : "transparent",
                  color: metricMode === mode ? "#fff" : C.muted,
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {/* ── OVERVIEW ── */}
        {view === "overview" && kpis && (
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
                          onClick={() => setSelectedStore(s)}
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
                        onClick={() => setSelectedStore(s)}
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
        )}

        {/* ── STORES ── */}
        {view === "stores" && (
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
                        setSelectedStore(s === selectedStore ? null : s)
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
                    onClick={() => setSelectedStore(null)}
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
        )}

        {/* ── FRANCHISEES ── */}
        {view === "franchisees" && (
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
        )}

        {/* ── OPPORTUNITIES ── */}
        {view === "opportunities" && (
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
        )}

        {/* ── WEEKLY ── */}
        {view === "weekly" && (
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
        )}

        {view === "daypart" &&
          (() => {
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
                                      ? `${diff >= 0 ? "+" : ""}${metricMode === "transactions" ? "" : "£"}${(Math.abs(diff) / 1000).toFixed(1)}k`
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
          })()}

        {view === "geography" && (
          <div>
            <SectionHeader
              title="Store Geography"
              subtitle="CY vs PY1 growth by location — green = growing, red = declining"
            />

            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 16,
                alignItems: "center",
              }}
            >
              {[
                { color: C.accent, label: "Declining >5%" },
                { color: C.gold, label: "-5% to +5%" },
                { color: "#86EFAC", label: "Growing 0–5%" },
                { color: C.teal, label: "Growing >5%" },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: l.color,
                    }}
                  />
                  <span
                    style={{
                      color: C.muted,
                      fontSize: 11,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {l.label}
                  </span>
                </div>
              ))}
              {geoLoading && (
                <span
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  Geocoding postcodes…
                </span>
              )}
            </div>

            {/* Map */}
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: "hidden",
                height: 600,
              }}
            >
              <MapContainer
                center={[54.5, -2.5]}
                zoom={6}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {geoData
                  .filter((s) => {
                    const pc = s.POSTAL_CODE?.trim().toUpperCase();
                    return pc && geocodeCache[pc];
                  })
                  .map((s) => {
                    const pc = s.POSTAL_CODE.trim().toUpperCase();
                    const { lat, lng } = geocodeCache[pc];
                    const color = growthColor(s.growth_pct);
                    return (
                      <CircleMarker
                        key={s.STORE_ID}
                        center={[lat, lng]}
                        radius={8}
                        pathOptions={{
                          fillColor: color,
                          fillOpacity: 0.8,
                          color: color,
                          weight: 1,
                        }}
                      >
                        <LeafletTooltip>
                          <div
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 11,
                            }}
                          >
                            <strong>{s.STORE_NAME}</strong>
                            <br />
                            {s.FRANCHISE}
                            <br />
                            CY: {fmtVal(s.cy, 2)} | PY1: {fmtVal(s.py1, 2)}
                            <br />
                            Growth:{" "}
                            {s.growth_pct != null
                              ? fmtPct(s.growth_pct)
                              : "N/A"}
                          </div>
                        </LeafletTooltip>
                      </CircleMarker>
                    );
                  })}
              </MapContainer>
            </div>

            {/* Summary KPIs */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 16,
              }}
            >
              <KPI
                label="Mapped Stores"
                value={
                  geoData.filter(
                    (s) => geocodeCache[s.POSTAL_CODE?.trim().toUpperCase()],
                  ).length
                }
                sub={`of ${geoData.length} with postcodes`}
              />
              <KPI
                label="Avg Growth"
                value={fmtPct(
                  geoData.reduce((s, d) => s + (d.growth_pct || 0), 0) /
                    (geoData.filter((d) => d.growth_pct != null).length || 1),
                )}
                color={C.teal}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
