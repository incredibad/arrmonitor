import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

function useVisibilityInterval(callback, ms) {
  useEffect(() => {
    let interval = null;

    function start() {
      callback();
      interval = setInterval(callback, ms);
    }
    function stop() {
      clearInterval(interval);
      interval = null;
    }
    function onVisibility() {
      document.hidden ? stop() : start();
    }

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [callback, ms]);
}

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

export function useSabnzbdQueue(instanceId) {
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

  useVisibilityInterval(refresh, 2000);

  return { queue, setQueue, history, loading, error, lastUpdated, refresh };
}
