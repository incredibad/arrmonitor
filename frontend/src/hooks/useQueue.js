import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';
import { useTestMode } from '../lib/testModeContext.jsx';
import { MOCK_ITEMS, MOCK_GLOBAL_ITEMS, MOCK_INSTANCES, mockQueueForInstance } from '../lib/mockQueue.js';

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
  const { testMode } = useTestMode();
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasDataRef = useRef(false);

  const fetchQueue = useCallback(async (silent = false) => {
    if (testMode) {
      const records = sortRecords(mockQueueForInstance(instanceId));
      setQueue({ records, totalRecords: records.length });
      setError(null);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }
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
  }, [instanceId, testMode]);

  useEffect(() => {
    fetchQueue();
    if (testMode) return;

    const poll = async () => {
      api.sendCommand(instanceId, { name: 'RefreshMonitoredDownloads' }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
      fetchQueue(true);
    };

    const interval = setInterval(poll, intervalMs);
    return () => clearInterval(interval);
  }, [fetchQueue, instanceId, intervalMs, testMode]);

  const removeItem = useCallback(async (itemId, opts) => {
    if (testMode) return;
    await api.deleteQueueItem(instanceId, itemId, opts);
    await fetchQueue(true);
  }, [instanceId, fetchQueue, testMode]);

  const manualImport = useCallback(async () => {
    if (testMode) return;
    await api.sendCommand(instanceId, { name: 'ManualImport', importMode: 'auto' });
    setTimeout(() => fetchQueue(true), 2000);
  }, [instanceId, fetchQueue, testMode]);

  return { queue, loading, error, lastUpdated, refresh: () => fetchQueue(), removeItem, manualImport };
}

export function useGlobalQueue(intervalMs = 15000) {
  const { testMode } = useTestMode();
  const [allRecords, setAllRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const instancesRef = useRef([]);
  const hasDataRef = useRef(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (testMode) {
      setAllRecords(sortRecords(MOCK_GLOBAL_ITEMS));
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }
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
  }, [testMode]);

  useEffect(() => {
    if (testMode) { fetchAll(); return; }
    let cancelled = false;
    api.getInstances()
      .then(data => {
        if (cancelled) return;
        instancesRef.current = data.filter(i => i.enabled);
        fetchAll();
      })
      .catch(() => setLoading(false));

    const poll = () => { if (!cancelled) fetchAll(true); };

    const interval = setInterval(poll, intervalMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [fetchAll, intervalMs, testMode]);

  const removeItem = useCallback(async (instanceId, itemId, opts) => {
    if (testMode) return;
    await api.deleteQueueItem(instanceId, itemId, opts);
    await fetchAll(true);
  }, [fetchAll, testMode]);

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
