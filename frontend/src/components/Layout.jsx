import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useNav } from '../lib/navContext.jsx';
import { useTestMode } from '../lib/testModeContext.jsx';
import { useLayout } from '../lib/layoutContext.jsx';
import ImportToastStack from './ImportToastStack.jsx';
import TabletNav from './TabletNav.jsx';
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

    // Fast-changing data: SABnzbd + qBittorrent speed/status (refresh every 2s)
    let sabInstances = [], qbInstances = [];
    async function refreshClients() {
      try {
        if (!sabInstances.length) sabInstances = await api.getSabnzbdInstances().catch(() => []);
        if (!qbInstances.length) qbInstances = await api.getQbittorrentInstances().catch(() => []);

        let sabStatus = '', sabSpeed = '', sabSizeLeft = '';
        await Promise.all(sabInstances.filter(i => i.enabled).map(async inst => {
          try {
            const [q, hist] = await Promise.all([
              api.getSabnzbdQueue(inst.id),
              api.getSabnzbdHistory(inst.id).catch(() => []),
            ]);
            if (!q) return;
            if (!sabStatus && (q.status === 'Downloading' || q.status === 'Paused')) {
              sabStatus = (q.status === 'Paused' && hist?.length) ? 'Processing' : q.status;
              sabSpeed = q.speed || '';
              sabSizeLeft = q.sizeleft || '';
            }
          } catch {}
        }));

        let qbDlSpeed = 0, qbIsDownloading = false;
        await Promise.all(qbInstances.filter(i => i.enabled).map(async inst => {
          try {
            const t = await api.getQbittorrentTransfer(inst.id);
            if (t?.dl_info_speed > 0) { qbDlSpeed += t.dl_info_speed; qbIsDownloading = true; }
          } catch {}
        }));

        const hasSab = sabInstances.some(i => i.enabled);
        const hasQb = qbInstances.some(i => i.enabled);
        const total = arrTotal;
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

        if (qbIsDownloading) {
          const mbps = qbDlSpeed / 1024 / 1024;
          parts.push(mbps >= 1 ? `${Math.round(mbps)} MB/s` : `${Math.round(qbDlSpeed / 1024)} KB/s`);
        }

        // Only show Idle if we have clients configured but nothing is active
        if (parts.length === 0 && (hasSab || hasQb)) parts.push('Idle');

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
      sabTimer = setInterval(refreshClients, hidden ? 10000 : 2000);
    }

    function onVisibility() {
      refreshArr();
      refreshClients();
      startTimers();
    }

    refreshArr();
    refreshClients();
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

const UNIT_MS = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };

function useAutoRefresh() {
  const { autoRefresh, autoRefreshValue, autoRefreshUnit } = useLayout();
  useEffect(() => {
    if (!autoRefresh) return;
    const ms = (autoRefreshValue || 30) * (UNIT_MS[autoRefreshUnit] || 60000);
    const t = setTimeout(() => window.location.reload(), ms);
    return () => clearTimeout(t);
  }, [autoRefresh, autoRefreshValue, autoRefreshUnit]);
}

function useRemoteReload() {
  useEffect(() => {
    let interval = null;

    async function check() {
      try {
        const data = await api.getReloadTrigger();
        if (!data?.triggered) return;
        const lastHandled = sessionStorage.getItem('arrmonitor_reload_handled');
        if (data.triggered_at && data.triggered_at !== lastHandled) {
          sessionStorage.setItem('arrmonitor_reload_handled', data.triggered_at);
          window.location.reload();
        }
      } catch {}
    }

    function start() { check(); interval = setInterval(check, 10000); }
    function stop() { clearInterval(interval); interval = null; }
    function onVisibility() { document.hidden ? stop() : start(); }

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

export default function Layout({ children }) {
  const { refreshFn, refreshing, handleRefresh } = useNav();
  const { testMode } = useTestMode();
  const { tabletMode } = useLayout();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useTabNotification();
  useAutoRefresh();
  useRemoteReload();

  const showTabletNav = tabletMode && location.pathname === '/';
  const showSettingsNav = tabletMode && location.pathname === '/settings';

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={`${styles.root} ${testMode ? styles.testModeRoot : ''}`}>
      {testMode && <div className={styles.testModeBanner}>Test mode — queue data is simulated</div>}
      <div className={`${styles.content} ${showTabletNav ? styles.contentTablet : ''}`}>{children}</div>
      <ImportToastStack />

      {menuOpen && <div className={styles.drawerBackdrop} onClick={closeMenu} />}
      <div className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`} aria-hidden={!menuOpen}>
        <NavLink to="/" onClick={closeMenu} className={styles.drawerLogo}>
          <img src="/favicon.svg" alt="" className={styles.drawerLogoIcon} />
          <span className={styles.drawerLogoText}>ARRMONITOR</span>
        </NavLink>
        <div className={styles.drawerDivider} />
        <nav className={styles.drawerNav}>
          <NavLink to="/" end onClick={closeMenu}
            className={({ isActive }) => `${styles.drawerItem} ${isActive ? styles.drawerItemActive : ''}`}>
            <DashIcon /> Dashboard
          </NavLink>
          <NavLink to="/activity" onClick={closeMenu}
            className={({ isActive }) => `${styles.drawerItem} ${isActive ? styles.drawerItemActive : ''}`}>
            <ActivityIcon /> All Queues
          </NavLink>
          <NavLink to="/settings" onClick={closeMenu}
            className={({ isActive }) => `${styles.drawerItem} ${isActive ? styles.drawerItemActive : ''}`}>
            <SettingsIcon /> Settings
          </NavLink>
        </nav>
      </div>

      {showTabletNav ? <TabletNav /> : !showSettingsNav && (
        <div className={styles.fabGroup}>
          {refreshFn && (
            <button
              className={`${styles.fab} ${refreshing ? styles.fabSpinning : ''}`}
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshIcon />
            </button>
          )}
          <button
            className={`${styles.fab} ${menuOpen ? styles.fabOpen : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      )}
    </div>
  );
}

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
