import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueue, useInstances, useInstanceStatus } from '../hooks/useQueue.js';
import { api } from '../lib/api.js';
import { useNav } from '../lib/navContext.jsx';
import QueueItem from '../components/QueueItem.jsx';
import styles from './InstanceQueue.module.css';

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

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'downloading', label: 'Downloading' },
  { key: 'importing',   label: 'Importing' },
  { key: 'waiting',     label: 'Waiting' },
  { key: 'paused',      label: 'Paused' },
  { key: 'issues',      label: 'Issues' },
  { key: 'queued',      label: 'Queued' },
];

export default function InstanceQueue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { instances } = useInstances();
  const instance = instances.find(i => String(i.id) === String(id));
  const { queue, loading, error, lastUpdated, refresh, removeItem } = useQueue(id, 15000);
  const { status, updateAvailable, latestVersion, isLsio } = useInstanceStatus(id, instance?.type);
  const { registerRefresh, clearRefresh, setPageTitle, clearPageTitle } = useNav();
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  async function refreshWithCommand() {
    try {
      await api.sendCommand(id, { name: 'RefreshMonitoredDownloads' });
      await new Promise(r => setTimeout(r, 1500));
    } catch {}
    await refresh();
  }

  useEffect(() => {
    registerRefresh(refreshWithCommand);
    return () => clearRefresh();
  }, [id, refresh]);

  useEffect(() => {
    if (instance?.name) setPageTitle(instance.name);
    return () => clearPageTitle();
  }, [instance?.name]);

  function showToast(msg, type = 'info') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const records = queue?.records || [];

  function countForFilter(key) {
    if (key === 'all') return queue?.totalRecords ?? 0;
    if (key === 'issues') return records.filter(r => getSemanticStatus(r) === 'issue').length;
    return records.filter(r => getSemanticStatus(r) === key).length;
  }

  const filtered = filter === 'all'
    ? records
    : filter === 'issues'
    ? records.filter(r => getSemanticStatus(r) === 'issue')
    : records.filter(r => getSemanticStatus(r) === filter);

  const instanceUrl = instance?.external_url || instance?.url;

  return (
    <div className={styles.page}>
      <div className={styles.subBar}>
        <div className={styles.subBarRow}>
          {/* Back button */}
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {/* Instance info — name + link + tags all inline, tags wrap if needed */}
          <div className={styles.instanceInfo}>
            <div className={styles.instanceNameRow}>
              <span className={styles.instanceName}>{instance?.name || '…'}</span>
              {instanceUrl && (
                <a href={instanceUrl} target="_blank" rel="noopener noreferrer"
                  className={styles.openLink} title={`Open ${instance?.name}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              )}
            </div>
            <div className={styles.instanceMeta}>
              {instance?.type && <span className={`chip chip-${instance.type}`}>{instance.type}</span>}
              {status?.ok && <span className="chip chip-neutral">v{status.version}</span>}
              {isLsio && status?.ok && <span className="chip chip-neutral" title="LinuxServer.io build">lsio</span>}
              {updateAvailable && <span className="chip chip-yellow">↑ update</span>}
            </div>
          </div>

          {/* Filters — right side on wide, wraps below on mobile */}
          <div className={styles.filters}>
            {FILTERS.map(({ key, label }) => {
              const count = countForFilter(key);
              if (key !== 'all' && count === 0) return null;
              return (
                <button
                  key={key}
                  data-f={key}
                  className={`${styles.filterChip} ${filter === key ? styles.active : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {label}<span className={styles.filterCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>{toast.msg}</div>
      )}

      <div className={styles.list}>
        {loading && !queue ? (
          [1,2,3,4,5].map(i => <div key={i} className={styles.skeleton} />)
        ) : error ? (
          <div className={styles.errorState}><span>⚠ {error}</span></div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>{filter === 'all' ? '✓ Queue is empty' : `No items in this category`}</div>
        ) : (
          filtered.map(item => (
            <QueueItem
              key={item.id}
              item={item}
              instanceId={id}
              instanceType={instance?.type}
              instanceName={instance?.name}
              onRemove={async (itemId, opts) => {
                await removeItem(itemId, opts);
                showToast('Removed from queue');
              }}
              onRefresh={() => refresh()}
            />
          ))
        )}
      </div>

      {lastUpdated && (
        <div className={styles.footer}>Refreshes every 15s · Last {lastUpdated.toLocaleTimeString()}</div>
      )}
    </div>
  );
}
