import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useSabnzbdInstances } from '../hooks/useSabnzbd.js';
import { useQbittorrentInstances } from '../hooks/useQbittorrent.js';
import { useNav } from '../lib/navContext.jsx';
import { useLayout } from '../lib/layoutContext.jsx';
import iqStyles from './InstanceQueue.module.css';
import styles from './AllDownloadClients.module.css';

const SAB_ACTIVE = new Set(['Extracting','Repairing','Verifying','Moving','Running']);
const QB_DL      = new Set(['downloading','stalledDL','forcedDL','checkingDL','queuedDL','metaDL','checkingResumeData','moving']);
const QB_SEED    = new Set(['uploading','stalledUP','forcedUP','checkingUP','queuedUP']);
const QB_PAUSED  = new Set(['pausedDL','pausedUP','stoppedDL','stoppedUP']);
const QB_ERROR   = new Set(['error','missingFiles']);
const SORT_GROUP = { error: 0, processing: 1, downloading: 2, paused: 3, seeding: 4 };

function fmtBytes(b) {
  if (!b) return null;
  if (b >= 1073741824) return `${(b/1073741824).toFixed(2)} GB`;
  if (b >= 1048576)    return `${(b/1048576).toFixed(1)} MB`;
  return `${Math.round(b/1024)} KB`;
}
function fmtSpeed(bps) {
  if (!bps) return null;
  if (bps >= 1048576) return `${Math.round(bps/1048576)} MB/s`;
  if (bps >= 1024)    return `${Math.round(bps/1024)} KB/s`;
  return `${bps} B/s`;
}
function fmtEta(secs) {
  if (!secs || secs <= 0 || secs >= 8640000) return null;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs/60)}m`;
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
function parseSabTimeleft(s) {
  if (!s || s === '0:00:00') return 0;
  const p = s.split(':').map(Number);
  return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : 0;
}

function useAllDCItems() {
  const { instances: sabInstances } = useSabnzbdInstances();
  const { instances: qbInstances }  = useQbittorrentInstances();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const sabRef = useRef([]);
  const qbRef  = useRef([]);

  useEffect(() => { sabRef.current = sabInstances.filter(i => i.enabled); }, [sabInstances]);
  useEffect(() => { qbRef.current  = qbInstances.filter(i => i.enabled);  }, [qbInstances]);

  const fetchAll = useCallback(async () => {
    const all = [];
    await Promise.all([
      ...sabRef.current.map(async inst => {
        try {
          const [q, hist] = await Promise.all([
            api.getSabnzbdQueue(inst.id),
            api.getSabnzbdHistory(inst.id).catch(() => []),
          ]);
          const paused = q?.status === 'Paused';
          (q?.slots || []).forEach((slot, i) => {
            all.push({
              _key: `sab-${inst.id}-slot-${slot.nzo_id || i}`,
              _client: 'sabnzbd',
              _instanceId: inst.id,
              _instanceName: inst.name,
              _sem: paused ? 'paused' : 'downloading',
              name: slot.filename || slot.nzo_id || 'Unknown',
              category: (slot.cat && slot.cat !== '*') ? slot.cat : null,
              pct: parseFloat(slot.percentage) || 0,
              mbleft: parseFloat(slot.mbleft) || 0,
              timeleft: slot.timeleft || null,
            });
          });
          (hist || []).filter(h => SAB_ACTIVE.has(h.status)).forEach((item, i) => {
            all.push({
              _key: `sab-${inst.id}-hist-${item.nzo_id || i}`,
              _client: 'sabnzbd',
              _instanceId: inst.id,
              _instanceName: inst.name,
              _sem: 'processing',
              name: item.name || 'Unknown',
              category: (item.category && item.category !== '*') ? item.category : null,
              processStatus: item.status,
            });
          });
        } catch {}
      }),
      ...qbRef.current.map(async inst => {
        try {
          const torrents = await api.getQbittorrentTorrents(inst.id);
          (torrents || []).forEach(t => {
            const sem = QB_ERROR.has(t.state) ? 'error'
              : QB_DL.has(t.state)     ? 'downloading'
              : QB_SEED.has(t.state)   ? 'seeding'
              : QB_PAUSED.has(t.state) ? 'paused'
              : 'downloading';
            all.push({
              _key: `qb-${inst.id}-${t.hash}`,
              _client: 'qbittorrent',
              _instanceId: inst.id,
              _instanceName: inst.name,
              _sem: sem,
              name: t.name || 'Unknown',
              category: t.category || null,
              progress: t.progress ?? 0,
              dlspeed: t.dlspeed || 0,
              upspeed: t.upspeed || 0,
              eta: t.eta || 0,
              size: t.size || 0,
            });
          });
        } catch {}
      }),
    ]);
    all.sort((a, b) => {
      const d = (SORT_GROUP[a._sem] ?? 99) - (SORT_GROUP[b._sem] ?? 99);
      return d !== 0 ? d : (a.name || '').localeCompare(b.name || '');
    });
    setItems(all);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    let interval = null;
    function start() { fetchAll(); interval = setInterval(fetchAll, 2000); }
    function stop()  { clearInterval(interval); interval = null; }
    function onVis() { document.hidden ? stop() : start(); }
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchAll]);

  return { items, loading, lastUpdated, refresh: fetchAll };
}

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'error',       label: 'Errors' },
  { key: 'processing',  label: 'Processing' },
  { key: 'downloading', label: 'Downloading' },
  { key: 'paused',      label: 'Paused' },
  { key: 'seeding',     label: 'Seeding' },
];

const SEM_CHIP  = { error: 'chip-issue', processing: 'chip-importing', downloading: 'chip-downloading', paused: 'chip-paused', seeding: 'chip-qbittorrent' };
const SEM_LABEL = { error: 'Error', processing: 'Processing', downloading: 'Downloading', paused: 'Paused', seeding: 'Seeding' };

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

export default function AllDownloadClients() {
  const navigate = useNavigate();
  const { items, loading, lastUpdated, refresh } = useAllDCItems();
  const { registerRefresh, clearRefresh, setPageTitle, clearPageTitle } = useNav();
  const { showSeeding } = useLayout();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    registerRefresh(refresh);
    return () => clearRefresh();
  }, [refresh]);

  useEffect(() => {
    setPageTitle('All Download Clients');
    return () => clearPageTitle();
  }, []);

  const visible  = showSeeding ? items : items.filter(i => i._sem !== 'seeding');
  const filtered = filter === 'all' ? visible : visible.filter(i => i._sem === filter);
  const shownFilters = FILTERS.filter(f => f.key !== 'seeding' || showSeeding);

  function countForFilter(key) {
    if (key === 'all') return visible.length;
    return visible.filter(i => i._sem === key).length;
  }

  return (
    <div className={iqStyles.page}>
      <div className={iqStyles.subBar}>
        <div className={iqStyles.subBarRow}>
          <button className={iqStyles.backBtn} onClick={() => navigate('/')}>
            <BackIcon />
          </button>
          <div className={iqStyles.instanceInfo}>
            <div className={iqStyles.instanceNameRow}>
              <span className={iqStyles.instanceName}>All Download Clients</span>
            </div>
          </div>
          <div className={iqStyles.filters}>
            {shownFilters.map(({ key, label }) => {
              const count = countForFilter(key);
              if (key !== 'all' && count === 0) return null;
              return (
                <button
                  key={key}
                  data-f={key}
                  className={`${iqStyles.filterChip} ${filter === key ? iqStyles.active : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {label}<span className={iqStyles.filterCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={iqStyles.list}>
        {loading && items.length === 0 ? (
          [1,2,3,4,5].map(i => <div key={i} className={iqStyles.skeleton} />)
        ) : filtered.length === 0 ? (
          <div className={iqStyles.emptyState}>{filter === 'all' ? '✓ All download clients idle' : 'No items in this category'}</div>
        ) : (
          filtered.map(item => <DCItem key={item._key} item={item} />)
        )}
      </div>

      {lastUpdated && (
        <div className={iqStyles.footer}>Refreshes every 2s · Last {lastUpdated.toLocaleTimeString()}</div>
      )}
    </div>
  );
}

function DCItem({ item }) {
  const clientChip = item._client === 'sabnzbd' ? 'chip-sabnzbd' : 'chip-qbittorrent';
  const isDownloading = item._sem === 'downloading';

  const progressPct = item.pct != null ? item.pct : (item.progress ?? 0) * 100;
  const pctStr   = progressPct > 0 ? `${Math.round(progressPct)}%` : null;
  const etaSecs  = item.eta || parseSabTimeleft(item.timeleft);
  const etaStr   = fmtEta(etaSecs);
  const speedStr = fmtSpeed(item.dlspeed);
  const ulStr    = item.upspeed > 0 ? fmtSpeed(item.upspeed) : null;
  const sizeStr  = item.size ? fmtBytes(item.size) : item.mbleft ? `${Math.round(item.mbleft)} MB left` : null;

  return (
    <div className={styles.item}>
      <div className={styles.main}>
        <div className={styles.titleRow}>
          <span className={styles.title} title={item.name}>{item.name}</span>
          <div className={styles.titleRight}>
            {isDownloading && pctStr && (
              <span className={styles.pct}>{pctStr}{etaStr ? ` · ${etaStr}` : ''}</span>
            )}
            {item.processStatus && <span className={styles.pct}>{item.processStatus}</span>}
            <span className={`chip ${SEM_CHIP[item._sem] || 'chip-neutral'} ${styles.statusChip}`}>
              {SEM_LABEL[item._sem] || item._sem}
            </span>
          </div>
        </div>
        <div className={styles.metaRow}>
          <span className={`chip ${clientChip}`} style={{ flexShrink: 0 }}>{item._instanceName}</span>
          {item.category && <span className="chip chip-neutral">{item.category}</span>}
          {speedStr && <span className={styles.metaTag}>↓ {speedStr}</span>}
          {ulStr    && <span className={styles.metaTag}>↑ {ulStr}</span>}
          {!isDownloading && sizeStr && <span className={styles.metaMuted}>{sizeStr}</span>}
        </div>
      </div>
      {isDownloading && (
        <div className={styles.progressStrip}>
          <div className={styles.progressFill} style={{ width: `${Math.min(100, progressPct)}%` }} />
        </div>
      )}
    </div>
  );
}
