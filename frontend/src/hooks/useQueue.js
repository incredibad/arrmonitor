import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';

// Version checking — supports both official GitHub releases and LinuxServer.io builds
const VERSION_CACHE = {};
const VERSION_TTL = 10 * 60 * 1000; // 10 minutes

// GitHub repos for official releases
const GITHUB_REPOS = {
  sonarr: 'Sonarr/Sonarr',
  radarr: 'Radarr/Radarr',
  lidarr: 'lidarr/Lidarr',
};

// LinuxServer.io image names (from their API)
const LSIO_NAMES = {
  sonarr: 'sonarr',
  radarr: 'radarr',
  lidarr: 'lidarr',
};

// Detect if an instance is running a LinuxServer.io build
// Their Dockerfile writes packageAuthor containing "linuxserver.io"
export function isLinuxServer(status) {
  return !!(status?.packageAuthor?.toLowerCase().includes('linuxserver'));
}

// Fetch latest version from LinuxServer.io API
// Returns the upstream version part (strips the -ls{n} suffix)
async function fetchLsioVersion(type) {
  const cacheKey = `lsio:${type}`;
  const now = Date.now();
  if (VERSION_CACHE[cacheKey] && now - VERSION_CACHE[cacheKey].ts < VERSION_TTL) {
    return VERSION_CACHE[cacheKey];
  }
  const name = LSIO_NAMES[type];
  if (!name) return null;
  try {
    const data = await api.getLsioImages();
    const images = data?.data?.repositories?.linuxserver;
    if (!Array.isArray(images)) return null;
    const image = images.find(i => i.name === name);
    if (!image?.version) return null;
    // Version format: "5.18.4.9674-ls259" — we compare the upstream part only
    const upstreamVersion = image.version.replace(/-ls\d+$/, '');
    const result = { version: image.version, upstreamVersion, ts: now };
    VERSION_CACHE[cacheKey] = result;
    return result;
  } catch {
    return null;
  }
}

// Fetch latest version from GitHub official releases
async function fetchGithubVersion(type) {
  const cacheKey = `github:${type}`;
  const now = Date.now();
  if (VERSION_CACHE[cacheKey] && now - VERSION_CACHE[cacheKey].ts < VERSION_TTL) {
    return VERSION_CACHE[cacheKey].version;
  }
  const repo = GITHUB_REPOS[type];
  if (!repo) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    const version = data.tag_name?.replace(/^v/, '');
    VERSION_CACHE[cacheKey] = { version, ts: now };
    return version;
  } catch {
    return null;
  }
}

// Compare two version strings numerically, returns true if latest > current
function compareVersions(current, latest) {
  if (!current || !latest) return false;
  // Strip any -ls suffix before comparing
  const clean = v => v.replace(/-ls\d+$/, '').replace(/^v/, '');
  const a = clean(current).split('.').map(Number);
  const b = clean(latest).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] || 0) - (a[i] || 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return false;
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

        if (s.ok && s.version && type) {
          const lsio = isLinuxServer(s);
          setIsLsio(lsio);

          if (lsio) {
            // LinuxServer.io build — check their API for the latest image version
            const lsioInfo = await fetchLsioVersion(type);
            if (cancelled) return;
            if (lsioInfo) {
              setLatestVersion(lsioInfo.version);
              // Compare running version against LinuxServer's latest upstream version
              setUpdateAvailable(compareVersions(s.version, lsioInfo.upstreamVersion));
            }
          } else {
            // Official build — check GitHub
            const latest = await fetchGithubVersion(type);
            if (cancelled) return;
            setLatestVersion(latest);
            setUpdateAvailable(compareVersions(s.version, latest));
          }
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
