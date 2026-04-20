import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';

// Detect if an instance is running a LinuxServer.io build
// Their Dockerfile writes packageAuthor containing "linuxserver.io"
export function isLinuxServer(status) {
  return !!(status?.packageAuthor?.toLowerCase().includes('linuxserver'));
}

function getSortGroup(item) {
  const s = v => (typeof v === 'string' ? v : String(v ?? '')).toLowerCase();
  const tStatus = s(item.trackedDownloadStatus);
  const tState  = s(item.trackedDownloadState);
  const status  = s(item.status);
  if (tStatus === 'warning' || tStatus === 'error') return 0;
  if (status === 'failed' || tState === 'failed' || tState === 'failedpending') return 0;
  if (tState === 'importing') return 1;
  if (tState === 'importpending' || status === 'completed') return 2;
  if (status === 'downloading' || tState === 'downloading') return 3;
  if (status === 'paused') return 4;
  return 5;
}

// Sort key: series/movie title, then season number, then episode number, then title
function getSortKey(item) {
  const title = (item.series?.title || item.movie?.title || item.artist?.artistName || item.title || '').toLowerCase();
  const season  = String(item.episode?.seasonNumber  ?? 0).padStart(4, '0');
  const episode = String(item.episode?.episodeNumber ?? 0).padStart(4, '0');
  return `${title}|${season}|${episode}`;
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const ga = getSortGroup(a);
    const gb = getSortGroup(b);
    if (ga !== gb) return ga - gb;
    return getSortKey(a).localeCompare(getSortKey(b));
  });
}

export function useQueue(instanceId, intervalMs = 15000) {
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasDataRef = useRef(false);

  const fetchQueue = useCallback(async (silent = false) => {
    if (!instanceId) return;
    if (!silent) setLoading(true);
    try {
      const data = await api.getQueue(instanceId);
      if (data?.records) data.records = sortRecords(data.records);
      setQueue(data);
      setError(null);
      setLastUpdated(new Date());
      hasDataRef.current = true;
    } catch (e) {
      if (!hasDataRef.current) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  // Auto-poll: trigger arr's own refresh first, then fetch our queue
  useEffect(() => {
    fetchQueue(); // initial load — no arr refresh needed, just get current state

    const poll = async () => {
      // Fire-and-forget arr refresh — if it fails, we still fetch our data
      api.sendCommand(instanceId, { name: 'RefreshMonitoredDownloads' }).catch(() => {});
      // Give arr 2s to process before we fetch
      await new Promise(r => setTimeout(r, 2000));
      fetchQueue(true);
    };

    const interval = setInterval(poll, intervalMs);
    return () => clearInterval(interval);
  }, [fetchQueue, instanceId, intervalMs]);

  const removeItem = useCallback(async (itemId, opts) => {
    await api.deleteQueueItem(instanceId, itemId, opts);
    await fetchQueue(true); // refresh list after action
  }, [instanceId, fetchQueue]);

  const manualImport = useCallback(async () => {
    await api.sendCommand(instanceId, { name: 'ManualImport', importMode: 'auto' });
    setTimeout(() => fetchQueue(true), 2000); // give it a moment then refresh
  }, [instanceId, fetchQueue]);

  return { queue, loading, error, lastUpdated, refresh: () => fetchQueue(), removeItem, manualImport };
}

export function useGlobalQueue(intervalMs = 15000) {
  const [allRecords, setAllRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const instancesRef = useRef([]);
  const hasDataRef = useRef(false);

  const fetchAll = useCallback(async (silent = false) => {
    const insts = instancesRef.current;
    if (insts.length === 0) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const results = await Promise.all(
        insts.map(inst =>
          api.getQueue(inst.id)
            .then(data => ({ inst, data }))
            .catch(() => ({ inst, data: null }))
        )
      );
      const merged = [];
      results.forEach(({ inst, data }) => {
        (data?.records || []).forEach(r => merged.push({ ...r, _instance: inst }));
      });
      setAllRecords(sortRecords(merged));
      setLastUpdated(new Date());
      hasDataRef.current = true;
    } catch {
      if (!hasDataRef.current) setAllRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.getInstances()
      .then(data => {
        if (cancelled) return;
        instancesRef.current = data.filter(i => i.enabled);
        fetchAll();
      })
      .catch(() => setLoading(false));

    const poll = async () => {
      instancesRef.current.forEach(inst => {
        api.sendCommand(inst.id, { name: 'RefreshMonitoredDownloads' }).catch(() => {});
      });
      await new Promise(r => setTimeout(r, 2000));
      if (!cancelled) fetchAll(true);
    };

    const interval = setInterval(poll, intervalMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [fetchAll, intervalMs]);

  const removeItem = useCallback(async (instanceId, itemId, opts) => {
    await api.deleteQueueItem(instanceId, itemId, opts);
    await fetchAll(true);
  }, [fetchAll]);

  return { allRecords, loading, lastUpdated, refresh: () => fetchAll(), removeItem };
}

export function useInstances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getInstances();
      setInstances(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { instances, loading, reload: load };
}

export function useInstanceStatus(instanceId, type) {
  const [status, setStatus] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const [isLsio, setIsLsio] = useState(false);

  useEffect(() => {
    if (!instanceId) return;
    let cancelled = false;

    async function check() {
      try {
        const s = await api.getStatus(instanceId);
        if (cancelled) return;
        setStatus(s);

        if (s.ok) {
          setIsLsio(isLinuxServer(s));

          // Ask the arr app itself — same source its own UI uses.
          // The response is newest-first; if the first entry is not installed,
          // a newer version exists that isn't running yet.
          const updates = await api.getInstanceUpdates(instanceId);
          if (cancelled) return;
          const hasUpdate = Array.isArray(updates) && updates.length > 0 && updates[0].installed !== true;
          setUpdateAvailable(hasUpdate);
          setLatestVersion(hasUpdate ? (updates[0].version ?? null) : null);
        }
      } catch {
        if (!cancelled) setStatus({ ok: false });
      }
    }

    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [instanceId, type]);

  return { status, updateAvailable, latestVersion, isLsio };
}
