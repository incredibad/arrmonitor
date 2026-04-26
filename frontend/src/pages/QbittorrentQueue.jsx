import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQbittorrentInstances, useQbittorrentData } from '../hooks/useQbittorrent.js';
import { useNav } from '../lib/navContext.jsx';
import { api } from '../lib/api.js';
import styles from './QbittorrentQueue.module.css';
import iqStyles from './InstanceQueue.module.css';

const DOWNLOADING = new Set(['downloading','stalledDL','forcedDL','checkingDL','queuedDL','metaDL','checkingResumeData','moving']);
const SEEDING     = new Set(['uploading','stalledUP','forcedUP','checkingUP','queuedUP']);
const PAUSED      = new Set(['pausedDL','pausedUP','stoppedDL','stoppedUP']);
const ERROR       = new Set(['error','missingFiles']);

function formatSpeed(bps) {
  if (!bps) return '0 KB/s';
  if (bps >= 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${Math.round(bps / 1024)} KB/s`;
  return `${bps} B/s`;
}

function formatEta(secs) {
  if (!secs || secs <= 0 || secs >= 8640000) return null;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default function QbittorrentQueue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { instances } = useQbittorrentInstances();
  const { torrents, transfer, loading, error, lastUpdated, refresh } = useQbittorrentData(id);
  const { registerRefresh, clearRefresh, setPageTitle, clearPageTitle } = useNav();
  const [filter, setFilter] = useState('all');
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);

  const instance = instances.find(i => String(i.id) === String(id));

  useEffect(() => {
    registerRefresh(refresh);
    return () => clearRefresh();
  }, [refresh]);

  useEffect(() => {
    if (instance) setPageTitle(instance.name);
    return () => clearPageTitle();
  }, [instance?.name]);

  function showToast(msg, type = 'info') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handlePauseAll() {
    setActing(true);
    try { await api.pauseAllQbittorrent(id); showToast('Paused all'); } catch (e) { showToast(e.message, 'error'); }
    setActing(false);
  }

  async function handleResumeAll() {
    setActing(true);
    try { await api.resumeAllQbittorrent(id); showToast('Resumed all'); } catch (e) { showToast(e.message, 'error'); }
    setActing(false);
  }

  const list = torrents || [];
  const dlCount     = list.filter(t => DOWNLOADING.has(t.state)).length;
  const seedCount   = list.filter(t => SEEDING.has(t.state)).length;
  const pausedCount = list.filter(t => PAUSED.has(t.state)).length;
  const errorCount  = list.filter(t => ERROR.has(t.state)).length;
  const isDownloading = dlCount > 0;
  const hasPaused = pausedCount > 0;
  const hasActive = dlCount > 0 || seedCount > 0;

  const filtered =
    filter === 'downloading' ? list.filter(t => DOWNLOADING.has(t.state)) :
    filter === 'seeding'     ? list.filter(t => SEEDING.has(t.state)) :
    filter === 'paused'      ? list.filter(t => PAUSED.has(t.state)) :
    filter === 'error'       ? list.filter(t => ERROR.has(t.state)) :
    list;

  const dlSpeed = transfer?.dl_info_speed || 0;
  const ulSpeed = transfer?.ul_info_speed || 0;

  return (
    <div className={iqStyles.page}>
      <div className={iqStyles.subBar} data-type="qbittorrent">
        <div className={iqStyles.subBarRow}>
          <button className={iqStyles.backBtn} onClick={() => navigate('/')}>
            <BackIcon />
          </button>

          <div className={iqStyles.instanceInfo}>
            <div className={iqStyles.instanceNameRow}>
              {instance && <img src="/logos/qbittorrent.svg" width="16" height="16" className={iqStyles.appIcon} alt="" />}
              {instance && <span className={iqStyles.instanceName}>{instance.name}</span>}
              {instance && (
                <a href={instance.url} target="_blank" rel="noopener noreferrer" className={iqStyles.openLink} onClick={e => e.stopPropagation()}>
                  Open <ExternalIcon />
                </a>
              )}
            </div>
            <div className={iqStyles.instanceMeta}>
              {torrents && (
                <>
                  {isDownloading
                    ? <span className="chip chip-downloading">downloading</span>
                    : seedCount > 0
                    ? <span className="chip chip-qbittorrent">seeding</span>
                    : <span className="chip chip-neutral">idle</span>}
                  {dlSpeed > 0 && <span className="chip chip-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>↓ {formatSpeed(dlSpeed)}</span>}
                  {ulSpeed > 0 && <span className="chip chip-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>↑ {formatSpeed(ulSpeed)}</span>}
                </>
              )}
            </div>
          </div>

          <div className={iqStyles.controlsCenter}>
            {hasActive && (
              <button className={styles.controlBtn} onClick={handlePauseAll} disabled={acting}>
                <PauseIcon /> Pause All
              </button>
            )}
            {hasPaused && (
              <button className={styles.controlBtn} onClick={handleResumeAll} disabled={acting}>
                <ResumeIcon /> Resume All
              </button>
            )}
          </div>

          <div className={iqStyles.filters}>
            {[
              { key: 'all',         label: 'All',         count: list.length },
              { key: 'downloading', label: 'Downloading', count: dlCount },
              { key: 'seeding',     label: 'Seeding',     count: seedCount },
              { key: 'paused',      label: 'Paused',      count: pausedCount },
              { key: 'error',       label: 'Errors',      count: errorCount },
            ].map(({ key, label, count }) => {
              if (key !== 'all' && count === 0) return null;
              return (
                <button key={key} data-f={key}
                  className={`${iqStyles.filterChip} ${filter === key ? iqStyles.active : ''}`}
                  onClick={() => setFilter(key)}>
                  {label}<span className={iqStyles.filterCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`${iqStyles.toast} ${toast.type === 'error' ? iqStyles.toastError : ''}`}>{toast.msg}</div>
      )}

      <div className={iqStyles.list}>
        {loading && !torrents ? (
          [1,2,3,4].map(i => <div key={i} className={iqStyles.skeleton} />)
        ) : error ? (
          <div className={iqStyles.errorState}>⚠ {error}</div>
        ) : filtered.length === 0 ? (
          <div className={iqStyles.emptyState}>
            {filter === 'all' ? '✓ No torrents' : 'No items in this category'}
          </div>
        ) : (
          filtered.map(t => <TorrentRow key={t.hash} torrent={t} />)
        )}
      </div>

      {lastUpdated && (
        <div className={iqStyles.footer}>Updates every 2s · Last {lastUpdated.toLocaleTimeString()}</div>
      )}
    </div>
  );
}

function TorrentRow({ torrent }) {
  const pct = Math.round((torrent.progress || 0) * 100);
  const isDown = DOWNLOADING.has(torrent.state);
  const isSeed = SEEDING.has(torrent.state);
  const isPaused = PAUSED.has(torrent.state);
  const isError = ERROR.has(torrent.state);

  const stateChipClass = isDown ? 'chip-downloading'
    : isSeed   ? 'chip-qbittorrent'
    : isPaused ? 'chip-paused'
    : isError  ? 'chip-issue'
    : 'chip-neutral';

  const stateLabel = isDown ? 'Downloading'
    : isSeed   ? 'Seeding'
    : isPaused ? 'Paused'
    : isError  ? 'Error'
    : torrent.state;

  const eta = isDown ? formatEta(torrent.eta) : null;
  const sizeLeft = isDown ? formatSize(torrent.amount_left) : null;
  const dlSpeed = isDown && torrent.dlspeed ? formatSpeed(torrent.dlspeed) : null;
  const ulSpeed = torrent.upspeed ? formatSpeed(torrent.upspeed) : null;

  return (
    <div className={styles.item} style={isDown ? { '--progress-pct': `${pct}%`, '--progress-bg': 'rgba(61,155,233,0.09)' } : undefined}>
      <div className={styles.itemMain}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{torrent.name}</span>
          <span className={`chip ${stateChipClass} ${styles.stateChip}`}>{stateLabel}</span>
        </div>
        <div className={styles.itemMeta}>
          {isDown && <span>{pct}%</span>}
          {sizeLeft && <span>{sizeLeft} left</span>}
          {formatSize(torrent.size) && <span>{formatSize(torrent.size)}</span>}
          {dlSpeed && <span>↓ {dlSpeed}</span>}
          {ulSpeed && <span>↑ {ulSpeed}</span>}
          {eta && <span>ETA {eta}</span>}
          {torrent.category && <span className="chip chip-neutral">{torrent.category}</span>}
        </div>
      </div>
    </div>
  );
}

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ExternalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const PauseIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>
);
const ResumeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
