import { useEffect, useState } from 'react';
import { useImportToast } from '../lib/importToastContext.jsx';
import { api } from '../lib/api.js';
import styles from './ImportToastStack.module.css';

const TERMINAL = new Set(['completed', 'failed', 'aborted', 'cancelled']);
const POLL_MS = 2000;
const AUTO_DISMISS_MS = 5000;

const STATUS_LABEL = {
  queued:    'Queued…',
  started:   'Importing…',
  completed: 'Import complete',
  failed:    'Import failed',
  aborted:   'Aborted',
  cancelled: 'Cancelled',
};

function ImportToast({ toast, onDismiss }) {
  const [status, setStatus] = useState('queued');
  const [message, setMessage] = useState('Importing…');

  useEffect(() => {
    if (!toast.commandId) return;
    let cancelled = false;
    let timer = null;

    async function poll() {
      try {
        const data = await api.getCommand(toast.instanceId, toast.commandId);
        if (cancelled) return;
        const s = (data.status || '').toLowerCase();
        setStatus(s);
        setMessage(data.message || STATUS_LABEL[s] || s);
        if (TERMINAL.has(s)) {
          timer = setTimeout(() => { if (!cancelled) onDismiss(); }, AUTO_DISMISS_MS);
          return;
        }
      } catch {}
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    timer = setTimeout(poll, POLL_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [toast.commandId, toast.instanceId]);

  const terminal = TERMINAL.has(status);
  const failed   = status === 'failed' || status === 'aborted' || status === 'cancelled';
  const type     = toast.instanceType || 'sonarr';

  return (
    <div className={`${styles.toast} ${styles[`type_${type}`]} ${terminal ? (failed ? styles.stateFailed : styles.stateDone) : ''}`}>
      <div className={styles.left}>
        <div className={styles.topRow}>
          <span className={`chip chip-${type}`}>{type}</span>
          <span className={styles.instanceName}>{toast.instanceName}</span>
          <span className={styles.statusIcon}>
            {terminal
              ? (failed ? <FailIcon /> : <DoneIcon />)
              : <span className={styles.spinner} />}
          </span>
        </div>
        <div className={styles.mediaTitle}>{toast.mediaTitle}</div>
        <div className={styles.statusMsg}>{message}</div>
      </div>
      <button className={styles.dismiss} onClick={onDismiss} title="Dismiss">
        <CloseIcon />
      </button>
    </div>
  );
}

export default function ImportToastStack() {
  const { toasts, removeImport } = useImportToast();
  if (!toasts.length) return null;
  return (
    <div className={styles.stack}>
      {toasts.map(t => (
        <ImportToast key={t.id} toast={t} onDismiss={() => removeImport(t.id)} />
      ))}
    </div>
  );
}

const DoneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const FailIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
