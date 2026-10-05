# PH UK Performance dashboard

Browser-only sales dashboard. Drop a sales CSV on the start screen and it is
loaded into [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview) in the
browser; every chart and table is a SQL query against that in-memory table.
No data leaves the browser apart from store postcodes, which are sent to
[postcodes.io](https://postcodes.io) to place stores on the Geography map.

Live at https://sales-dashboard.scott-south.com/ (Cloudflare Workers static assets).

## CSV columns

`BUSINESS_DATE`, `DAYNAME`, `STORE_ID`, `STORE_NAME`, `FRANCHISE`, `POSTAL_CODE`,
`AIS_STORE_STATUS`, `CHANNEL`, `CHANNEL_TYPE`, `DAY_PART`,
`CY_NET_SALES_BASE`, `PY_1_NET_SALES_BASE`, `PY_2_NET_SALES_BASE`,
`CY_TRANSACTION_CNT`, `PY_1_TRANSACTION_CNT`, `PY_2_TRANSACTION_CNT`

Raw channel codes are normalised on load (see `loadCSV` in `src/Dashboard.jsx`),
and each store is attributed to its most recent franchisee.

## Project layout

```
src/
  Dashboard.jsx      container: wires hooks to the header, filter bar and active view
  theme.js           colours, channel colours, daypart order
  hooks/             useSalesDb (DuckDB + CSV load), useFilters, useFilterOptions,
                     useDashboardData (all aggregate queries), useStoreDetail, useGeocoding
  views/             one component per tab (Overview, Stores, Franchisees, ...)
  components/        Header, FilterBar, StoreSearch, UploadScreen and shared UI pieces
  lib/               formatting, SQL helpers, DuckDB loader, store classification
```

## Development

```bash
npm install
npm run dev      # Vite dev server
npm run lint
npm run build
npm run deploy   # build + wrangler deploy
```

## Third-party services

- DuckDB-WASM is loaded at runtime from jsDelivr.
- Map tiles: Esri Dark Gray Canvas (no key required).
- Geocoding: postcodes.io (no key required).
