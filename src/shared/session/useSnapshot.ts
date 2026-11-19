import { useCallback, useEffect, useState } from "react";
import { call, isTauri } from "./tauri";
import type { Snapshot } from "./types";

const POLL_MS = 5000;

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Tek seferlik komut: etkinleştirildiğinde yükler, reload ile yeniler.
 * Etkin değilken (sayfa açık değilken) çağrı yapmaz. Tarayıcı önizlemesinde çağrı yapmaz.
 */
export function useCommand<T>(command: string, enabled: boolean): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isTauri() || !enabled) return;
    let alive = true;
    setLoading(true);
    call<T>(command)
      .then((v) => {
        if (!alive) return;
        setData(v);
        setError(null);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [command, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // İlk etkinleşme karesinde de iskelet görünsün: boş durum bir an bile parlamasın.
  const pending = enabled && isTauri() && data === null && error === null;
  return { data, loading: loading || pending, error, reload };
}

/** Oturum anlık görüntüsü: 5 sn'de bir yenilenir. */
export function useSnapshot(): AsyncState<Snapshot> {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(isTauri());
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }
    let alive = true;
    const load = (manual: boolean) => {
      if (manual) setLoading(true);
      call<Snapshot>("get_snapshot")
        .then((v) => {
          if (!alive) return;
          setData(v);
          setError(null);
        })
        .catch((e: Error) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    };
    load(tick > 0);
    const id = window.setInterval(() => load(false), POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
