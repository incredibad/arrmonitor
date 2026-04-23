import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import styles from './SabnzbdCard.module.css';

const PAUSE_PRESETS = [
  { label: '5 minutes',  value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour',     value: 60 },
  { label: '3 hours',    value: 180 },
];

function usePoll(instanceId) {
  const [queue, setQueue] = useState(null);
  const [processing, setProcessing] = useState([]);
  const [err, setErr] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [q, hist] = await Promise.all([
        api.getSabnzbdQueue(instanceId),
        api.getSabnzbdHistory(instanceId).catch(() => []),
      ]);
      setQueue(q);
      setProcessing(hist || []);
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

  return { queue, setQueue, processing, err, refresh };
}

export default function SabnzbdCard({ instance }) {
  const navigate = useNavigate();
  const { queue, setQueue, processing, err } = usePoll(instance.id);
  const [version, setVersion] = useState(null);
  const [acting, setActing] = useState(false);
  const [pauseForOpen, setPauseForOpen] = useState(false);
  const [customMins, setCustomMins] = useState('');

  useEffect(() => {
    api.testSabnzbd(instance.id).then(r => { if (r?.ok) setVersion(r.version); }).catch(() => {});
  }, [instance.id]);

  const status        = queue?.status || '';
  const isDownloading = status === 'Downloading';
  const isPaused      = status === 'Paused';
  const isProcessing  = isPaused && processing.length > 0;
  const speed         = queue?.speed || '';
  const sizeleft      = queue?.sizeleft || '';
  const timeleft      = queue?.timeleft || '';
  const queueCount    = queue?.noofslots ?? 0;

  const statusLabel = isDownloading ? 'Downloading'
    : isProcessing  ? 'Processing'
    : isPaused      ? 'Paused'
    : queue         ? 'Idle'
    : null;

  const statusName = isDownloading
    ? (queue?.slots?.[0]?.filename || '')
    : isProcessing
    ? (processing[0]?.name || '')
    : '';

  const truncated = statusName.length > 32 ? statusName.slice(0, 32) + '…' : statusName;

  const chipClass = isDownloading ? 'chip-downloading'
    : isProcessing  ? 'chip-importing'
    : isPaused      ? 'chip-paused'
    : 'chip-queued';

  const statColor = isDownloading ? 'var(--status-downloading)'
    : isProcessing  ? 'var(--status-importing)'
    : isPaused      ? 'var(--status-paused)'
    : null;
  const statBg = isDownloading ? 'var(--status-downloading-bg)'
    : isProcessing  ? 'var(--status-importing-bg)'
    : isPaused      ? 'var(--status-paused-bg)'
    : null;

  const formattedSpeed = speed ? speed.replace(/([KMGT])$/, '$1B/s') : '';

  async function act(fn, optimisticStatus) {
    if (optimisticStatus && queue) setQueue(q => ({ ...q, status: optimisticStatus }));
    setActing(true);
    try { await fn(); } catch {}
    setActing(false);
  }

  return (
    <div className={styles.card} onClick={() => navigate(`/sabnzbd/${instance.id}`)}>
      <div className={styles.body}>

        <div className={styles.headerRow}>
          <img className={styles.appIcon} src="/logos/sabnzbd.svg" width="16" height="16" alt="SABnzbd" />
          <span className={styles.name}>{instance.name}</span>
          {version && <span className={styles.version}>v{version}</span>}
          <div className={styles.headerActions} onClick={e => e.stopPropagation()}>
            {isPaused && (
              <button className={styles.actionBtn} onClick={() => act(() => api.resumeSabnzbd(instance.id), 'Downloading')} disabled={acting}>
                <ResumeIcon /> Resume
              </button>
            )}
            {isDownloading && (
              <>
                <button className={styles.actionBtn} onClick={() => act(() => api.pauseSabnzbd(instance.id), 'Paused')} disabled={acting}>
                  <PauseIcon /> Pause
                </button>
                <button className={styles.actionBtnIcon} onClick={() => setPauseForOpen(true)} disabled={acting} title="Pause for…">
                  <ClockIcon />
                </button>
              </>
            )}
          </div>
          <a href={instance.url} target="_blank" rel="noopener noreferrer"
            className={styles.openBtn} onClick={e => e.stopPropagation()} title="Open SABnzbd">
            <ExternalIcon />
          </a>
        </div>

        {statusLabel && (
          <div className={styles.statusRow}>
            <span className={`chip ${chipClass}`}>
              {statusLabel}{truncated ? ` (${truncated})` : ''}
            </span>
          </div>
        )}

        {/* 3 stat boxes — always the same layout */}
        <div className={styles.stats}>
          {queue ? (
            <>
              <Stat label="Download" value={isDownloading && formattedSpeed ? formattedSpeed : '—'} small active={isDownloading && !!speed} color={statColor} bg={statBg} />
              <Stat label={sizeleft ? `IN QUEUE · ${sizeleft}` : 'IN QUEUE'} value={queueCount} active={queueCount > 0} color={statColor} bg={statBg} />
              <Stat label="ETA" value={isDownloading && timeleft && timeleft !== '0:00:00' ? timeleft : '—'} small active={isDownloading && !!timeleft && timeleft !== '0:00:00'} color={statColor} bg={statBg} />
            </>
          ) : !err ? (
            <><div className={styles.shimmer} /><div className={styles.shimmer} /><div className={styles.shimmer} /></>
          ) : (
            <span className={styles.errText}>Could not connect</span>
          )}
        </div>
      </div>

      {pauseForOpen && (
        <div className="modal-backdrop" onClick={e => { e.stopPropagation(); setPauseForOpen(false); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Pause for</span>
              <span className="modal-subtitle">{instance.name}</span>
            </div>
            {PAUSE_PRESETS.map(p => (
              <button key={p.value} className="modal-action" onClick={() => {
                setPauseForOpen(false);
                act(() => api.pauseSabnzbdFor(instance.id, p.value));
              }}>
                <span className="modal-action-icon"><ClockIcon /></span>
                <span className="modal-action-label">{p.label}</span>
              </button>
            ))}
            <div className="modal-divider" />
            <div style={{ padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number" min="1" max="9999" placeholder="Custom (minutes)"
                value={customMins} onChange={e => setCustomMins(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
              />
              <button className="modal-action" style={{ flex: '0 0 auto', padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}
                disabled={!customMins}
                onClick={() => {
                  if (!customMins) return;
                  setPauseForOpen(false);
                  act(() => api.pauseSabnzbdFor(instance.id, parseInt(customMins)));
                }}>
                Apply
              </button>
            </div>
            <button className="modal-cancel" onClick={() => setPauseForOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, active, small, color, bg }) {
  return (
    <div className={styles.stat} style={active && color ? { background: bg, borderColor: color } : undefined}>
      <span className={`${styles.statVal} ${small ? styles.statValSm : ''}`} style={active && color ? { color } : undefined}>
        {value}
      </span>
      <span className={styles.statLabel} style={active && color ? { color } : undefined}>{label}</span>
    </div>
  );
}

const DownloadIcon = () => (
  <svg className={styles.appIcon} style={{ color: 'var(--sabnzbd)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
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
const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
