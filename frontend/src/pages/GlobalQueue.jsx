import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalQueue } from '../hooks/useQueue.js';
import { useNav } from '../lib/navContext.jsx';
import { useLayout } from '../lib/layoutContext.jsx';
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

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

export default function GlobalQueue() {
  const navigate = useNavigate();
  const { allRecords, loading, lastUpdated, refresh, removeItem } = useGlobalQueue(15000);
  const { registerRefresh, clearRefresh, setPageTitle, clearPageTitle } = useNav();
  const { hidePending } = useLayout();
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    registerRefresh(refresh);
    return () => clearRefresh();
  }, [refresh]);

  useEffect(() => {
    setPageTitle('All App Queues');
    return () => clearPageTitle();
  }, []);

  function showToast(msg, type = 'info') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const records = (allRecords || []).filter(r => {
    if (!hidePending) return true;
    const st = String(r.status ?? '').toLowerCase();
    return st !== 'delay' && st !== 'pending';
  });

  function countForFilter(key) {
    if (key === 'all') return records.length;
    if (key === 'issues') return records.filter(r => getSemanticStatus(r) === 'issue').length;
    return records.filter(r => getSemanticStatus(r) === key).length;
  }

  const filtered = filter === 'all'
    ? records
    : filter === 'issues'
    ? records.filter(r => getSemanticStatus(r) === 'issue')
    : records.filter(r => getSemanticStatus(r) === filter);

  return (
    <div className={styles.page}>
      <div className={styles.subBar}>
        <div className={styles.subBarRow}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <BackIcon />
          </button>
          <div className={styles.instanceInfo}>
            <div className={styles.instanceNameRow}>
              <span className={styles.instanceName}>All App Queues</span>
            </div>
          </div>

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
        {loading && !allRecords ? (
          [1,2,3,4,5].map(i => <div key={i} className={styles.skeleton} />)
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>{filter === 'all' ? '✓ All queues empty' : 'No items in this category'}</div>
        ) : (
          filtered.map(item => (
            <QueueItem
              key={`${item._instance?.id}-${item.id}`}
              item={item}
              instanceId={item._instance?.id}
              instanceType={item._instance?.type}
              instanceName={item._instance?.name}
              showInstance
              onRemove={async (itemId, opts) => {
                await removeItem(item._instance?.id, itemId, opts);
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
