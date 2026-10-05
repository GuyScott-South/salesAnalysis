import { useState, useEffect, useCallback } from "react";
import { DAYPART_ORDER } from "../theme";

// All aggregate datasets behind the dashboard views, for the current filters
export function useDashboardData({
  runQ,
  ready,
  metricMode,
  where,
  whereNoFranchise,
  dayCount,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [storeRows, setStoreRows] = useState([]);
  const [franchiseeRows, setFranchiseeRows] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [daypartData, setDaypartData] = useState([]);
  const [storeChannelMap, setStoreChannelMap] = useState({});
  const [weeklyData, setWeeklyData] = useState([]);
  const [daypartHeatmapData, setDaypartHeatmapData] = useState([]);
  const [geoData, setGeoData] = useState([]);

  // Refresh data whenever filters, sorting, or db readiness change
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      const cy = metricMode === "transactions" ? "TXN_CY" : "CY";
      const py1 = metricMode === "transactions" ? "TXN_PY1" : "PY1";
      const py2 = metricMode === "transactions" ? "TXN_PY2" : "PY2";
      const w = where;
      setLoading(true);
      try {
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

        const wf = whereNoFranchise;
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
            HAVING COUNT(DISTINCT DAYNAME) = ${dayCount || 7}
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
  }, [ready, runQ, metricMode, where, whereNoFranchise, dayCount]);

  // Clear headline figures so a newly loaded CSV doesn't briefly show the old ones
  const reset = useCallback(() => setKpis(null), []);

  return {
    loading,
    error,
    reset,
    kpis,
    storeRows,
    franchiseeRows,
    channelData,
    daypartData,
    storeChannelMap,
    weeklyData,
    daypartHeatmapData,
    geoData,
  };
}
