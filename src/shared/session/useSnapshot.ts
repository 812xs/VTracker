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

/** Tek seferlik komut: açılışta yükler, reload ile yeniler. Tarayıcı önizlemesinde çağrı yapmaz. */
export function useCommand<T>(command: string): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(isTauri());
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }
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
  }, [command, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
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
    const load = () => {
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
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
