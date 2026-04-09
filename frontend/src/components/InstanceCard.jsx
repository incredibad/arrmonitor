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
  const { status, updateAvailable, latestVersion, isLsio } = useInstanceStatus(instance.id, instance.type);

  const records    = queue?.records || [];
  const totalItems = queue?.totalRecords ?? 0;
  const issues     = records.filter(r => getSemanticStatus(r) === 'issue').length;

  return (
    <div className={styles.card} onClick={() => navigate(`/instance/${instance.id}`)}>
      <div className={styles.stripe} data-type={instance.type} />

      <div className={styles.body}>
        <div className={styles.headerRow}>
          <span className={styles.name}>{instance.name}</span>
          <a href={instance.external_url || instance.url} target="_blank" rel="noopener noreferrer"
            className={styles.openBtn} onClick={e => e.stopPropagation()} title={`Open ${instance.name}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>

        <div className={styles.metaRow}>
          <span className={`chip chip-${instance.type}`}>{instance.type}</span>
          {status !== null && (
            <span className={`chip ${status.ok ? 'chip-neutral' : 'chip-red'}`}>
              {status.ok ? `v${status.version}` : 'offline'}
            </span>
          )}
          {isLsio && status?.ok && <span className="chip chip-neutral" title="LinuxServer.io build">lsio</span>}
          {updateAvailable && <span className="chip chip-yellow" title={`v${latestVersion} available`}>↑ update</span>}
        </div>

        <div className={styles.stats}>
          {loading && !queue ? (
            <>
              <div className={styles.shimmer} />
              <div className={styles.shimmer} />
            </>
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
