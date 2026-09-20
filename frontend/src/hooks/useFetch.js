import { useEffect, useState } from "react";

/**
 * Runs `fetcher()` whenever any value in `deps` changes, tracking
 * loading/error/data state. `fetcher` is skipped while any dep is
 * null/undefined (e.g. the station list hasn't loaded yet).
 */
export function useFetch(fetcher, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (deps.some((d) => d === null || d === undefined)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}
