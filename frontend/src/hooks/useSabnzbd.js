import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useSabnzbdInstances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setInstances(await api.getSabnzbdInstances());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  return { instances, loading, reload: load };
}

export function useSabnzbdQueue(instanceId, intervalMs = 15000) {
  const [queue, setQueue] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [q, h] = await Promise.all([
        api.getSabnzbdQueue(instanceId),
        api.getSabnzbdHistory(instanceId),
      ]);
      setQueue(q);
      setHistory(h);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [instanceId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs]);

  return { queue, history, loading, error, lastUpdated, refresh };
}
