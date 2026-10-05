export async function loadDuckDB() {
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
