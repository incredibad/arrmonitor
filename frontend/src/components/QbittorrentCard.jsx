import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLayout } from '../lib/layoutContext.jsx';
import styles from './QbittorrentCard.module.css';

const DOWNLOADING = new Set(['downloading','stalledDL','forcedDL','checkingDL','queuedDL','metaDL','checkingResumeData','moving']);
const SEEDING     = new Set(['uploading','stalledUP','forcedUP','checkingUP','queuedUP']);
const PAUSED      = new Set(['pausedDL','pausedUP','stoppedDL','stoppedUP']);

function formatSpeed(bps) {
  if (!bps) return '0 KB/s';
  if (bps >= 1024 * 1024) return `${Math.round(bps / 1024 / 1024)} MB/s`;
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

function usePoll(instanceId) {
  const [torrents, setTorrents] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [err, setErr] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [t, tr] = await Promise.all([
        api.getQbittorrentTorrents(instanceId),
        api.getQbittorrentTransfer(instanceId),
      ]);
      setTorrents(t);
      setTransfer(tr);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [instanceId]);

  useEffect(() => {
    let interval = null;
    function start() { refresh(); interval = setInterval(refresh, 2000); }
    function stop()  { clearInterval(interval); interval = null; }
    function onVisibility() { document.hidden ? stop() : start(); }
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refresh]);

  return { torrents, setTorrents, transfer, err, refresh };
}

export default function QbittorrentCard({ instance }) {
  const navigate = useNavigate();
  const { tabletMode } = useLayout();
  const { torrents, setTorrents, transfer, err } = usePoll(instance.id);
  const [version, setVersion] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    api.testQbittorrent(instance.id).then(r => { if (r?.ok) setVersion(r.version); }).catch(() => {});
  }, [instance.id]);

  const list = torrents || [];
  const isDownloading = list.some(t => DOWNLOADING.has(t.state));
  const isSeeding     = !isDownloading && list.some(t => SEEDING.has(t.state));
  const hasPaused     = list.some(t => PAUSED.has(t.state));
  const hasAny        = list.length > 0;

  const statusLabel = !torrents ? null
    : isDownloading ? 'Downloading'
    : isSeeding     ? 'Seeding'
    : hasAny        ? 'Paused'
    : 'Idle';

  const chipClass = isDownloading ? 'chip-downloading'
    : isSeeding     ? 'chip-qbittorrent'
    : hasAny        ? 'chip-paused'
    : 'chip-queued';

  const statColor = isDownloading ? 'var(--status-downloading)'
    : isSeeding     ? 'var(--qbittorrent)'
    : hasAny        ? 'var(--status-paused)'
    : null;
  const statBg = isDownloading ? 'var(--status-downloading-bg)'
    : isSeeding     ? 'var(--qbittorrent-bg)'
    : hasAny        ? 'var(--status-paused-bg)'
    : null;

  const dlSpeed = transfer?.dl_info_speed || 0;
  const ulSpeed = transfer?.ul_info_speed || 0;
  const dlCount = list.filter(t => DOWNLOADING.has(t.state)).length;
  const seedCount = list.filter(t => SEEDING.has(t.state)).length;

  const activeEtas = list.filter(t => DOWNLOADING.has(t.state) && t.eta > 0 && t.eta < 8640000).map(t => t.eta);
  const maxEta = activeEtas.length ? Math.max(...activeEtas) : null;

  const active = !!statColor;

  async function act(fn) {
    setActing(true);
    try { await fn(); } catch {}
    setActing(false);
  }

  return (
    <div className={`${styles.card} ${tabletMode ? styles.cardT : ''}`} onClick={() => navigate(`/qbittorrent/${instance.id}`)}>
      <div className={styles.body}>

        <div className={styles.headerRow}>
          <img className={styles.appIcon} src="/logos/qbittorrent.svg" width="16" height="16" alt="qBittorrent" />
          <span className={styles.name}>{instance.name}</span>
          {!tabletMode && version && <span className={styles.version}>v{version}</span>}
          <div className={styles.headerActions} onClick={e => e.stopPropagation()}>
            {(isDownloading || isSeeding) && (
              <button className={styles.actionBtn} onClick={() => act(() => api.pauseAllQbittorrent(instance.id))} disabled={acting}>
                <PauseIcon /> Pause
              </button>
            )}
            {hasPaused && (
              <button className={styles.actionBtn} onClick={() => act(() => api.resumeAllQbittorrent(instance.id))} disabled={acting}>
                <ResumeIcon /> Resume
              </button>
            )}
          </div>
          {!tabletMode && (
            <a href={instance.url} target="_blank" rel="noopener noreferrer"
              className={styles.openBtn} onClick={e => e.stopPropagation()} title="Open qBittorrent">
              <ExternalIcon />
            </a>
          )}
        </div>

        {statusLabel && (
          <div className={styles.statusRow}>
            <span className={`chip ${chipClass}`}>{statusLabel}</span>
          </div>
        )}

        <div className={styles.stats}>
          {torrents ? (
            <>
              <SpeedStat
                dlBps={dlSpeed} ulBps={ulSpeed}
                active={active} color={statColor} bg={statBg}
              />
              <CountStat
                dlCount={dlCount} seedCount={seedCount}
                active={active} color={statColor} bg={statBg}
              />
              <Stat
                label="ETA"
                value={maxEta ? formatEta(maxEta) : '—'}
                small active={active} color={statColor} bg={statBg}
              />
            </>
          ) : !err ? (
            <><div className={styles.shimmer} /><div className={styles.shimmer} /><div className={styles.shimmer} /></>
          ) : (
            <span className={styles.errText}>Could not connect</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SpeedStat({ dlBps, ulBps, active, color, bg }) {
  const c = { color: active && color ? color : 'var(--text3)' };
  return (
    <div className={styles.stat} style={active && color ? { background: bg, borderColor: color } : undefined}>
      <div className={styles.speedLine} style={c}><DlArrow />{formatSpeed(dlBps)}</div>
      <div className={styles.speedLine} style={c}><UlArrow />{formatSpeed(ulBps)}</div>
    </div>
  );
}

function CountStat({ dlCount, seedCount, active, color, bg }) {
  const c = { color: active && color ? color : 'var(--text3)' };
  return (
    <div className={styles.stat} style={active && color ? { background: bg, borderColor: color } : undefined}>
      <div className={styles.countRow}>
        <span className={styles.countNum} style={c}>{dlCount}</span>
        <span className={styles.countLabel} style={c}>DOWNLOADS</span>
      </div>
      <div className={styles.countRow}>
        <span className={styles.countNum} style={c}>{seedCount}</span>
        <span className={styles.countLabel} style={c}>SEEDS</span>
      </div>
    </div>
  );
}

function Stat({ label, value, sublabel, active, small, color, bg }) {
  const c = { color: active && color ? color : 'var(--text3)' };
  return (
    <div className={styles.stat} style={active && color ? { background: bg, borderColor: color } : undefined}>
      <span className={`${styles.statVal} ${small ? styles.statValSm : ''}`} style={c}>{value}</span>
      <span className={styles.statLabel} style={c}>{label}</span>
      {sublabel && <span className={styles.statSublabel} style={c}>{sublabel}</span>}
    </div>
  );
}

const DlArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="7 14 12 19 17 14"/>
  </svg>
);
const UlArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="7 10 12 5 17 10"/>
  </svg>
);
const ExternalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const ResumeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>
);
