import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSabnzbdInstances, useSabnzbdQueue } from '../hooks/useSabnzbd.js';
import { useNav } from '../lib/navContext.jsx';
import { api } from '../lib/api.js';
import styles from './SabnzbdQueue.module.css';
import iqStyles from './InstanceQueue.module.css';

const PROCESSING_STATUSES = ['Extracting', 'Moving', 'Repairing', 'Verifying', 'Running'];

export default function SabnzbdQueue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { instances } = useSabnzbdInstances();
  const { queue, setQueue, history, loading, error, lastUpdated, refresh } = useSabnzbdQueue(id);
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

  async function handlePause() {
    setQueue(q => q ? { ...q, status: 'Paused' } : q);
    setActing(true);
    try { await api.pauseSabnzbd(id); showToast('Paused'); } catch (e) { showToast(e.message, 'error'); }
    setActing(false);
  }

  async function handleResume() {
    setQueue(q => q ? { ...q, status: 'Downloading' } : q);
    setActing(true);
    try { await api.resumeSabnzbd(id); showToast('Resumed'); } catch (e) { showToast(e.message, 'error'); }
    setActing(false);
  }

  const slots   = queue?.slots   || [];
  const status  = queue?.status  || '';
  const speed   = queue?.speed   || '';
  const sizeleft = queue?.sizeleft || '';
  const timeleft = queue?.timeleft || '';
  const isDownloading = status === 'Downloading';
  const isPaused      = status === 'Paused';

  const allItems = [
    ...slots.map(s => ({ ...s, _type: 'queue' })),
    ...history.map(s => ({ ...s, _type: 'history' })),
  ];

  const filtered =
    filter === 'queue'   ? allItems.filter(i => i._type === 'queue') :
    filter === 'process' ? allItems.filter(i => i._type === 'history') :
    allItems;

  const queueCount   = slots.length;
  const processCount = history.length;

  return (
    <div className={iqStyles.page}>
      <div className={iqStyles.subBar} data-type="sabnzbd">
        <div className={iqStyles.subBarRow}>
          <button className={iqStyles.backBtn} onClick={() => navigate('/')}>
            <BackIcon />
          </button>

          <div className={iqStyles.instanceInfo}>
            <div className={iqStyles.instanceNameRow}>
              {instance && <span className={iqStyles.instanceName}>{instance.name}</span>}
              {instance && (
                <a href={instance.url} target="_blank" rel="noopener noreferrer" className={iqStyles.openLink} onClick={e => e.stopPropagation()}>
                  Open
                  <ExternalIcon />
                </a>
              )}
            </div>
            <div className={iqStyles.instanceMeta}>
              <span className="chip chip-sabnzbd">sabnzbd</span>
              {queue && <StatusChip status={status} />}
              {isDownloading && speed && (
                <span className="chip chip-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>↓ {speed}</span>
              )}
            </div>
          </div>

          <div className={iqStyles.filters}>
            {[
              { key: 'all',     label: 'All',        count: allItems.length },
              { key: 'queue',   label: 'Downloading', count: queueCount },
              { key: 'process', label: 'Processing',  count: processCount },
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
            {(isDownloading || isPaused) && (
              <>
                {isDownloading && (
                  <button className={styles.controlBtn} onClick={handlePause} disabled={acting}>
                    <PauseIcon /> Pause
                  </button>
                )}
                {isPaused && (
                  <button className={styles.controlBtn} onClick={handleResume} disabled={acting}>
                    <ResumeIcon /> Resume
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {isDownloading && (sizeleft || timeleft) && (
          <div className={styles.progressBar}>
            <span className={styles.progressInfo}>
              {sizeleft && <span>{sizeleft} remaining</span>}
              {timeleft && timeleft !== '0:00:00' && <span>ETA {timeleft}</span>}
            </span>
          </div>
        )}
      </div>

      {toast && (
        <div className={`${iqStyles.toast} ${toast.type === 'error' ? iqStyles.toastError : ''}`}>{toast.msg}</div>
      )}

      <div className={iqStyles.list}>
        {loading && !queue ? (
          [1,2,3,4].map(i => <div key={i} className={iqStyles.skeleton} />)
        ) : error ? (
          <div className={iqStyles.errorState}>⚠ {error}</div>
        ) : filtered.length === 0 ? (
          <div className={iqStyles.emptyState}>
            {filter === 'all' ? '✓ Nothing in queue' : 'No items in this category'}
          </div>
        ) : (
          filtered.map(item =>
            item._type === 'queue'
              ? <QueueSlot key={item.nzo_id} slot={item} />
              : <HistorySlot key={item.nzo_id} slot={item} />
          )
        )}
      </div>

      {lastUpdated && (
        <div className={iqStyles.footer}>Refreshes every 15s · Last {lastUpdated.toLocaleTimeString()}</div>
      )}
    </div>
  );
}

function QueueSlot({ slot }) {
  const pct = Math.min(100, parseInt(slot.percentage) || 0);
  return (
    <div className={styles.item}>
      <div className={styles.itemMain}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{slot.filename || slot.name}</span>
          {slot.cat && slot.cat !== '*' && <span className={`chip chip-neutral ${styles.catChip}`}>{slot.cat}</span>}
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.itemMeta}>
          <span>{pct}%</span>
          {slot.sizeleft && <span>{slot.sizeleft} left</span>}
          {slot.timeleft && slot.timeleft !== '0:00:00' && <span>ETA {slot.timeleft}</span>}
          {slot.priority && slot.priority !== 'Normal' && <span className="chip chip-neutral">{slot.priority}</span>}
        </div>
      </div>
    </div>
  );
}

function HistorySlot({ slot }) {
  const statusClass = {
    Extracting: 'chip-importing',
    Repairing:  'chip-waiting',
    Verifying:  'chip-waiting',
    Moving:     'chip-importing',
    Running:    'chip-downloading',
  }[slot.status] || 'chip-neutral';

  return (
    <div className={styles.item}>
      <div className={styles.itemMain}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{slot.name}</span>
          {slot.category && slot.category !== '*' && <span className={`chip chip-neutral ${styles.catChip}`}>{slot.category}</span>}
        </div>
        <div className={styles.itemMeta}>
          <span className={`chip ${statusClass}`}>{slot.status}</span>
          {slot.action_line && <span className={styles.actionLine}>{slot.action_line}</span>}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }) {
  if (status === 'Downloading') return <span className="chip chip-downloading">downloading</span>;
  if (status === 'Paused')      return <span className="chip chip-paused">paused</span>;
  if (status === 'Idle')        return <span className="chip chip-neutral">idle</span>;
  return null;
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
