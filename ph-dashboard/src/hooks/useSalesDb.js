import { useState, useEffect, useCallback } from "react";
import { loadDuckDB } from "../lib/duckdb";

// Boots DuckDB-WASM and loads an uploaded CSV into the `sales` table
export function useSalesDb() {
  const [db, setDb] = useState(null);
  const [conn, setConn] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

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
        // Register the File itself so DuckDB reads it in chunks rather than
        // holding the whole CSV as a JS string
        await db.registerFileHandle(
          "sales.csv",
          file,
          2 /* BROWSER_FILEREADER */,
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

  // Return to the upload screen; the next loadCSV replaces the table
  const unload = useCallback(() => {
    setDbReady(false);
    setFileName(null);
  }, []);

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

  return {
    dbLoaded: !!db,
    ready: !!conn && dbReady,
    loading,
    error,
    fileName,
    loadCSV,
    unload,
    runQ,
  };
}
