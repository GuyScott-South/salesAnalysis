import { useState } from "react";
import { C } from "../theme";
import { fmtPct, growthColor } from "../lib/format";
import { useStoreSpread, MIN_POINTS } from "../hooks/useStoreSpread";
import KPI from "../components/KPI";
import SectionHeader from "../components/SectionHeader";
import SegmentedToggle from "../components/SegmentedToggle";
import StoreSpreadChart from "../components/StoreSpreadChart";
import StoreDetailPanel from "../components/StoreDetailPanel";

const median = (vals) => {
  if (!vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function LegendItem({ children, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <svg width={16} height={16}>
        {children}
      </svg>
      <span>{label}</span>
    </span>
  );
}

// Whole business on one page: every store's spread of daily (or weekly)
// % change vs PY1, ranked worst to best
export default function StoreSpreadView({
  runQ,
  ready,
  where,
  metricMode,
  kpis,
  storeRows,
  storeDetail,
  selectedStoreId,
  onSelectStore,
}) {
  const [granularity, setGranularity] = useState("day");
  const [wide, setWide] = useState(false);
  const { rows, totalStores, loading, error } = useStoreSpread({
    runQ,
    ready,
    metricMode,
    where,
    granularity,
  });

  const businessGrowth =
    kpis?.total_py1 > 0
      ? ((kpis.total_cy - kpis.total_py1) / kpis.total_py1) * 100
      : null;
  const growing = rows.filter((r) => r.growth > 0).length;
  const medianStore = median(rows.map((r) => r.growth));
  const medianSpread = median(rows.map((r) => r.p75 - r.p25));
  const excluded = totalStores - rows.length;
  const unit = granularity === "week" ? "weeks" : "days";
  const selectedStore =
    storeRows.find((s) => s.STORE_ID === selectedStoreId) ?? null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <SectionHeader
          title="Store Spread vs PY1"
          subtitle={`Each box is one store's ${granularity === "week" ? "weekly" : "daily"} % change vs PY1 over the selected period, worst to best`}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {loading && (
            <span
              style={{
                color: C.muted,
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Calculating…
            </span>
          )}
          <SegmentedToggle
            options={[
              { value: "day", label: "Daily" },
              { value: "week", label: "Weekly" },
            ]}
            value={granularity}
            onChange={setGranularity}
          />
          <SegmentedToggle
            options={[
              { value: false, label: "Fit" },
              { value: true, label: "Wide" },
            ]}
            value={wide}
            onChange={setWide}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <KPI
          label="Stores Plotted"
          value={rows.length}
          sub={
            excluded > 0
              ? `${excluded} with < ${MIN_POINTS[granularity]} comparable ${unit} left out`
              : `of ${totalStores}`
          }
        />
        <KPI
          label="Growing"
          value={
            rows.length ? `${Math.round((growing / rows.length) * 100)}%` : "—"
          }
          sub={`${growing} of ${rows.length} stores`}
          color={C.teal}
        />
        <KPI
          label="Median Store"
          value={fmtPct(medianStore)}
          sub="period % vs PY1"
          color={growthColor(medianStore)}
        />
        <KPI
          label="Business Total"
          value={fmtPct(businessGrowth)}
          sub="all stores combined"
          color={C.gold}
        />
        <KPI
          label={`Typical ${granularity === "week" ? "Weekly" : "Daily"} Spread`}
          value={medianSpread == null ? "—" : `${medianSpread.toFixed(1)} pts`}
          sub={`median width of middle 50% of ${unit}`}
        />
      </div>

      {error ? (
        <div style={{ color: C.accent, fontSize: 13 }}>{error}</div>
      ) : rows.length === 0 ? (
        !loading && (
          <div style={{ color: C.muted, fontSize: 13 }}>
            No stores have at least {MIN_POINTS[granularity]} {unit} with sales
            in both years for the current filters.
          </div>
        )
      ) : (
        <StoreSpreadChart
          rows={rows}
          businessGrowth={businessGrowth}
          wide={wide}
          metricMode={metricMode}
          granularity={granularity}
          selectedStoreId={selectedStoreId}
          onSelectStore={onSelectStore}
        />
      )}

      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          marginTop: 10,
          color: C.muted,
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          alignItems: "center",
        }}
      >
        <LegendItem label={`Box: middle 50% of ${unit}`}>
          <rect x={4} y={3} width={8} height={10} fill={C.teal + "66"} stroke={C.teal} />
          <line x1={4} x2={12} y1={8} y2={8} stroke={C.text} strokeWidth={1.5} />
        </LegendItem>
        <LegendItem label={`Line: median ${granularity}`}>
          <line x1={2} x2={14} y1={8} y2={8} stroke={C.text} strokeWidth={1.5} />
        </LegendItem>
        <LegendItem label="Whiskers: 5th–95th percentile">
          <line x1={8} x2={8} y1={1} y2={15} stroke={C.teal} />
        </LegendItem>
        <LegendItem label="Dot: store's % for the whole period">
          <circle cx={8} cy={8} r={3} fill="#fff" />
        </LegendItem>
        <LegendItem label="Business total">
          <line x1={1} x2={15} y1={8} y2={8} stroke={C.gold} strokeDasharray="4 2" />
        </LegendItem>
        <span>
          Colour: period %{" "}
          {[
            ["<-5%", growthColor(-10)],
            ["-5–0%", growthColor(-1)],
            ["0–5%", growthColor(1)],
            [">5%", growthColor(10)],
          ].map(([l, c]) => (
            <span key={l} style={{ color: c, marginLeft: 6 }}>
              ■ {l}
            </span>
          ))}
        </span>
        <span>
          {unit[0].toUpperCase() + unit.slice(1)} with no sales in either year
          are left out
        </span>
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
