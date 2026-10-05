import { C, DAYPART_ORDER } from "../theme";
import MultiSelect from "./MultiSelect";
import StoreSearch from "./StoreSearch";
import SegmentedToggle from "./SegmentedToggle";

export default function FilterBar({
  filters,
  setFilter,
  isActive,
  onReset,
  options,
  runQ,
  ready,
  storeSearchKey,
  loading,
  metricMode,
  onMetricModeChange,
}) {
  return (
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
        <StoreSearch
          key={storeSearchKey}
          runQ={runQ}
          ready={ready}
          selected={filters.store}
          onSelect={(s) => setFilter("store", s)}
        />
        <MultiSelect
          label="Week"
          selected={filters.week}
          onChange={(v) => setFilter("week", v)}
          opts={options.weeks}
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
          label="Day"
          selected={filters.day}
          onChange={(v) => setFilter("day", v)}
          opts={options.days}
        />
        <MultiSelect
          label="Franchisee"
          selected={filters.franchise}
          onChange={(v) => setFilter("franchise", v)}
          opts={options.franchises}
        />
        <MultiSelect
          label="Channel"
          selected={filters.channel}
          onChange={(v) => setFilter("channel", v)}
          opts={options.channels}
        />
        <MultiSelect
          label="Business"
          selected={filters.business}
          onChange={(v) => setFilter("business", v)}
          opts={options.businessTypes}
        />
        <MultiSelect
          label="Daypart"
          selected={filters.daypart}
          onChange={(v) => setFilter("daypart", v)}
          opts={DAYPART_ORDER}
        />
        <MultiSelect
          label="Status"
          selected={filters.status}
          onChange={(v) => setFilter("status", v)}
          opts={["Open", "Closed", "TC"]}
        />
        {isActive && (
          <button
            onClick={onReset}
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
        <SegmentedToggle
          options={[
            { value: "sales", label: "£ Sales" },
            { value: "transactions", label: "# Txns" },
          ]}
          value={metricMode}
          onChange={onMetricModeChange}
          style={{ marginLeft: "auto" }}
        />
      </div>
    </div>
  );
}
