import { useNavigate } from 'react-router-dom';
import { useQueue, useInstanceStatus } from '../hooks/useQueue.js';
import styles from './InstanceCard.module.css';

function getSemanticStatus(item) {
  const s = v => (typeof v === 'string' ? v : String(v ?? '')).toLowerCase();
  const tStatus = s(item.trackedDownloadStatus);
  const tState  = s(item.trackedDownloadState);
  const status  = s(item.status);
  if (tStatus === 'warning' || tStatus === 'error') return 'issue';
  if (status === 'failed' || tState === 'failed' || tState === 'failedpending') return 'issue';
  if (tState === 'importing') return 'importing';
  if (tState === 'importpending') return 'waiting';
  if (status === 'completed') return 'waiting';
  if (status === 'paused') return 'paused';
  if (status === 'downloading' || tState === 'downloading') return 'downloading';
  return 'queued';
}

export default function InstanceCard({ instance }) {
  const navigate = useNavigate();
  const { queue, loading, error } = useQueue(instance.id, 30000);
  const { status, updateAvailable } = useInstanceStatus(instance.id, instance.type);

  const records    = queue?.records || [];
  const issues     = records.filter(r => getSemanticStatus(r) === 'issue').length;
  const totalItems = records.filter(r => getSemanticStatus(r) !== 'issue').length;

  return (
    <div className={styles.card} data-type={instance.type} onClick={() => navigate(`/instance/${instance.id}`)}>
      <div className={styles.body}>
        <div className={styles.headerRow}>
          <AppIcon type={instance.type} />
          <span className={styles.name}>{instance.name}</span>
          {status?.ok && (
            <span className={styles.version} style={updateAvailable ? { color: 'var(--accent)' } : undefined}>
              v{status.version}
            </span>
          )}
          <a href={instance.external_url || instance.url} target="_blank" rel="noopener noreferrer"
            className={styles.openBtn} onClick={e => e.stopPropagation()} title={`Open ${instance.name}`}>
            <ExternalIcon />
          </a>
        </div>

        <div className={styles.stats}>
          {loading && !queue ? (
            <><div className={styles.shimmer} /><div className={styles.shimmer} /></>
          ) : error ? (
            <span className={styles.errText}>⚠ {error}</span>
          ) : (
            <>
              <Stat label="In Queue" value={totalItems} color="var(--status-downloading)" bg="var(--status-downloading-bg)" active={totalItems > 0} />
              <Stat label="Issues"   value={issues}     color="var(--status-issue)"       bg="var(--status-issue-bg)"       active={issues > 0} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, bg, active }) {
  return (
    <div className={styles.stat} style={active ? { background: bg, borderColor: color } : undefined}>
      <span className={styles.statVal} style={active ? { color } : undefined}>{value}</span>
      <span className={styles.statLabel} style={active ? { color } : undefined}>{label}</span>
    </div>
  );
}

function AppIcon({ type }) {
  const color = `var(--${type})`;
  if (type === 'sonarr') return (
    <svg className={styles.appIcon} style={{ color }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  );
  if (type === 'radarr') return (
    <svg className={styles.appIcon} style={{ color }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.847v6.306a1 1 0 0 1-1.447.894L15 14"/>
      <rect x="2" y="7" width="13" height="10" rx="2"/>
    </svg>
  );
  if (type === 'lidarr') return (
    <svg className={styles.appIcon} style={{ color }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  );
  if (type === 'sportarr') return (
    <svg className={styles.appIcon} style={{ color }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  );
  return null;
}

const ExternalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
