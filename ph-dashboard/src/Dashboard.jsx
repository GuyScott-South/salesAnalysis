import { useState } from "react";
import "leaflet/dist/leaflet.css";
import { C } from "./theme";
import { useSalesDb } from "./hooks/useSalesDb";
import { useFilters } from "./hooks/useFilters";
import { useFilterOptions } from "./hooks/useFilterOptions";
import { useDashboardData } from "./hooks/useDashboardData";
import { useStoreDetail } from "./hooks/useStoreDetail";
import { useGeocoding } from "./hooks/useGeocoding";
import UploadScreen from "./components/UploadScreen";
import Header from "./components/Header";
import FilterBar from "./components/FilterBar";
import OverviewView from "./views/OverviewView";
import StoresView from "./views/StoresView";
import FranchiseesView from "./views/FranchiseesView";
import OpportunitiesView from "./views/OpportunitiesView";
import WeeklyView from "./views/WeeklyView";
import DaypartView from "./views/DaypartView";
import GeographyView from "./views/GeographyView";

export default function Dashboard() {
  const salesDb = useSalesDb();
  const { runQ, ready } = salesDb;

  const [metricMode, setMetricMode] = useState("sales"); // sales | transactions
  const [view, setView] = useState("overview");
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  // Bumped on reset to remount the store search and clear its typed text
  const [storeSearchKey, setStoreSearchKey] = useState(0);

  const { filters, setFilter, resetFilters, isActive, where, whereNoFranchise } =
    useFilters();
  const { options, error: optionsError } = useFilterOptions(runQ, ready);
  const data = useDashboardData({
    runQ,
    ready,
    metricMode,
    where,
    whereNoFranchise,
    dayCount: filters.day.length,
  });
  const storeDetail = useStoreDetail({
    runQ,
    ready,
    metricMode,
    where,
    storeId: selectedStoreId,
  });
  const { geocodeCache, geoLoading } = useGeocoding(
    data.geoData,
    view === "geography",
  );

  const handleReset = () => {
    resetFilters();
    setStoreSearchKey((k) => k + 1);
  };

  const handleLoadNew = () => {
    salesDb.unload();
    data.reset();
    // Previous file's selections may not exist in the next one
    handleReset();
    setSelectedStoreId(null);
  };

  if (!ready) {
    return (
      <UploadScreen
        dbLoaded={salesDb.dbLoaded}
        loading={salesDb.loading}
        error={salesDb.error ?? optionsError ?? data.error}
        onFile={salesDb.loadCSV}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Syne', sans-serif",
      }}
    >
      <Header
        fileName={salesDb.fileName}
        view={view}
        onViewChange={setView}
        onLoadNew={handleLoadNew}
      />
      <FilterBar
        filters={filters}
        setFilter={setFilter}
        isActive={isActive}
        onReset={handleReset}
        options={options}
        runQ={runQ}
        ready={ready}
        storeSearchKey={storeSearchKey}
        loading={data.loading}
        metricMode={metricMode}
        onMetricModeChange={setMetricMode}
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {view === "overview" && data.kpis && (
          <OverviewView
            kpis={data.kpis}
            channelData={data.channelData}
            daypartData={data.daypartData}
            storeRows={data.storeRows}
            metricMode={metricMode}
            onSelectStore={setSelectedStoreId}
          />
        )}
        {view === "stores" && (
          <StoresView
            storeRows={data.storeRows}
            storeChannelMap={data.storeChannelMap}
            storeDetail={storeDetail}
            selectedStoreId={selectedStoreId}
            onSelectStore={setSelectedStoreId}
            metricMode={metricMode}
          />
        )}
        {view === "franchisees" && (
          <FranchiseesView
            franchiseeRows={data.franchiseeRows}
            metricMode={metricMode}
          />
        )}
        {view === "opportunities" && (
          <OpportunitiesView storeRows={data.storeRows} metricMode={metricMode} />
        )}
        {view === "weekly" && (
          <WeeklyView weeklyData={data.weeklyData} metricMode={metricMode} />
        )}
        {view === "daypart" && (
          <DaypartView
            daypartHeatmapData={data.daypartHeatmapData}
            metricMode={metricMode}
          />
        )}
        {view === "geography" && (
          <GeographyView
            geoData={data.geoData}
            geocodeCache={geocodeCache}
            geoLoading={geoLoading}
            metricMode={metricMode}
          />
        )}
      </div>
    </div>
  );
}
