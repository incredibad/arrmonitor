import { useEffect, useState } from 'react';
import { useImportToast } from '../lib/importToastContext.jsx';
import { api } from '../lib/api.js';
import styles from './ImportToastStack.module.css';

const TERMINAL = new Set(['completed', 'failed', 'aborted', 'cancelled']);
const POLL_MS = 2000;
const SUCCESS_DISMISS_MS = 3000;

function ImportToast({ toast, onDismiss }) {
  const [status, setStatus] = useState('queued');

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
        if (s === 'completed') {
          timer = setTimeout(() => { if (!cancelled) onDismiss(); }, SUCCESS_DISMISS_MS);
          return;
        }
        if (TERMINAL.has(s)) return; // failed/aborted — stay visible
      } catch {}
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    timer = setTimeout(poll, POLL_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [toast.commandId, toast.instanceId]);

  const terminal = TERMINAL.has(status);
  const failed   = terminal && status !== 'completed';
  const type     = toast.instanceType || 'sonarr';

  const label = toast.mediaSubtitle
    ? `${toast.mediaTitle} · ${toast.mediaSubtitle}`
    : toast.mediaTitle;

  return (
    <div className={`${styles.toast} ${styles[`type_${type}`]} ${terminal ? (failed ? styles.stateFailed : styles.stateDone) : ''}`}>
      <span className={`chip chip-${type}`}>{type}</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.statusIcon}>
        {terminal
          ? (failed ? <FailIcon /> : <DoneIcon />)
          : <SpinnerIcon />}
      </span>
      {failed && (
        <button className={styles.dismiss} onClick={onDismiss} title="Dismiss">
          <CloseIcon />
        </button>
      )}
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

const SpinnerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="2" opacity="0.25"/>
    <path d="M11.5 6.5a5 5 0 0 0-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <animateTransform attributeName="transform" type="rotate" from="0 6.5 6.5" to="360 6.5 6.5" dur="0.7s" repeatCount="indefinite"/>
    </path>
  </svg>
);
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
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
