import { useState, useEffect, useCallback } from "react";

// Looks up store postcodes on postcodes.io; results are cached for the session
export function useGeocoding(geoData, active) {
  const [geocodeCache, setGeocodeCache] = useState({});
  const [geoLoading, setGeoLoading] = useState(false);

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

  // Geocode whenever the map is showing
  useEffect(() => {
    if (!active || geoData.length === 0) return;
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
  }, [active, geoData, geocodePostcodes]); // eslint-disable-line react-hooks/exhaustive-deps

  return { geocodeCache, geoLoading };
}
