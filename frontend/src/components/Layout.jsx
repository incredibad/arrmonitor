import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useNav } from '../lib/navContext.jsx';
import { useTestMode } from '../lib/testModeContext.jsx';
import ImportToastStack from './ImportToastStack.jsx';
import styles from './Layout.module.css';

function useTabNotification() {
  useEffect(() => {
    const BASE = 'ArrMonitor';

    // Slow-changing data: arr queue counts and issue flags (refresh every 30s)
    let arrTotal = 0, arrIssues = 0;
    async function refreshArr() {
      try {
        const instances = await api.getInstances();
        let total = 0, issues = 0;
        await Promise.all(instances.filter(i => i.enabled).map(async inst => {
          try {
            const q = await api.getQueue(inst.id);
            (q?.records || []).forEach(r => {
              const s = r.trackedDownloadStatus?.toLowerCase();
              const t = r.trackedDownloadState?.toLowerCase();
              const st = r.status?.toLowerCase();
              if (s === 'warning' || s === 'error' || st === 'failed' || t === 'failed' || t === 'failedpending') issues++;
              else total++;
            });
          } catch {}
        }));
        arrTotal = total;
        arrIssues = issues;
      } catch {}
    }

    // Fast-changing data: SABnzbd speed/status (refresh every 2s)
    let sabInstances = [];
    async function refreshSab() {
      try {
        if (!sabInstances.length) sabInstances = await api.getSabnzbdInstances().catch(() => []);
        let sabStatus = '', sabSpeed = '', sabSizeLeft = '', sabTotal = 0;
        await Promise.all(sabInstances.filter(i => i.enabled).map(async inst => {
          try {
            const [q, hist] = await Promise.all([
              api.getSabnzbdQueue(inst.id),
              api.getSabnzbdHistory(inst.id).catch(() => []),
            ]);
            if (!q) return;
            sabTotal += q.noofslots || 0;
            if (!sabStatus && (q.status === 'Downloading' || q.status === 'Paused')) {
              sabStatus = (q.status === 'Paused' && hist?.length) ? 'Processing' : q.status;
              sabSpeed = q.speed || '';
              sabSizeLeft = q.sizeleft || '';
            }
          } catch {}
        }));

        const total = arrTotal + sabTotal;
        const parts = [];
        if (sabStatus === 'Downloading') {
          if (sabSpeed) parts.push(sabSpeed.replace(/([KMGT])$/, '$1B/s'));
          if (sabSizeLeft) parts.push(`${sabSizeLeft} left`);
        } else if (sabStatus === 'Processing') {
          parts.push('Processing');
          if (sabSizeLeft) parts.push(`${sabSizeLeft} left`);
        } else if (sabStatus === 'Paused') {
          parts.push('Paused');
          if (sabSizeLeft) parts.push(`${sabSizeLeft} left`);
        }
        if (total > 0) parts.push(`(${total})`);

        let title = parts.length ? `${parts.join(' - ')} - ${BASE}` : BASE;
        if (arrIssues > 0) title = `⚠ ${title}`;
        document.title = title;
      } catch {}
    }

    let arrTimer, sabTimer;

    function startTimers() {
      const hidden = document.hidden;
      clearInterval(arrTimer);
      clearInterval(sabTimer);
      arrTimer = setInterval(refreshArr, hidden ? 10000 : 30000);
      sabTimer = setInterval(refreshSab, hidden ? 10000 : 2000);
    }

    function onVisibility() {
      refreshArr();
      refreshSab();
      startTimers();
    }

    refreshArr();
    refreshSab();
    startTimers();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(arrTimer);
      clearInterval(sabTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      document.title = BASE;
    };
  }, []);
}

export default function Layout({ children }) {
  const { refreshFn, refreshing, handleRefresh, pageTitle } = useNav();
  const { testMode } = useTestMode();
  useTabNotification();

  return (
    <div className={`${styles.root} ${testMode ? styles.testModeRoot : ''}`}>
      <header className={styles.topBar}>
        <div className={styles.logoSection}>
          <NavLink to="/" className={styles.logoLink}>
            <img src="/favicon.svg" alt="" className={styles.logoIcon} />
            <span className={styles.logo}>ARRMONITOR</span>
          </NavLink>
        </div>

        <div className={styles.barSpacer} />
        {pageTitle && <span className={styles.barTitle}>{pageTitle}</span>}

        <div className={styles.navBtns}>
          {refreshFn && (
            <button
              className={`${styles.navBtn} ${refreshing ? styles.navBtnSpinning : ''}`}
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshIcon />
            </button>
          )}
          <NavLink to="/" end title="Dashboard"
            className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}>
            <DashIcon />
          </NavLink>
          <NavLink to="/activity" title="All Queues"
            className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}>
            <ActivityIcon />
          </NavLink>
          <NavLink to="/settings" title="Settings"
            className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}>
            <SettingsIcon />
          </NavLink>
        </div>
      </header>

      {testMode && <div className={styles.testModeBanner}>Test mode — queue data is simulated</div>}
      <div className={styles.content}>{children}</div>
      <ImportToastStack />
    </div>
  );
}

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const DashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
