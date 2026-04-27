import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLayout } from '../lib/layoutContext.jsx';
import { useTestMode } from '../lib/testModeContext.jsx';
import ImportToastStack from './ImportToastStack.jsx';
import TabletNav from './TabletNav.jsx';
import styles from './Layout.module.css';

function useTabNotification() {
  const { hidePending } = useLayout();
  const hidePendingRef = useRef(hidePending);
  useEffect(() => { hidePendingRef.current = hidePending; }, [hidePending]);

  useEffect(() => {
    const BASE = 'ArrMonitor';

    let arrTotal = 0, arrIssues = 0;
    let arrFetching = false;
    async function refreshArr() {
      if (arrFetching) return;
      arrFetching = true;
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
              else if (!hidePendingRef.current || (st !== 'delay' && st !== 'pending')) total++;
            });
          } catch {}
        }));
        arrTotal = total;
        arrIssues = issues;
      } catch {} finally {
        arrFetching = false;
      }
    }

    let sabInstances = [], qbInstances = [], clientsFetching = false;
    async function refreshClients() {
      if (clientsFetching) return;
      clientsFetching = true;
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

        if (parts.length === 0 && (hasSab || hasQb)) parts.push('Idle');
        if (total > 0) parts.push(`(${total})`);

        let title = parts.length ? `${parts.join(' - ')} - ${BASE}` : BASE;
        if (arrIssues > 0) title = `⚠ ${title}`;
        document.title = title;
      } catch {} finally {
        clientsFetching = false;
      }
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
  const { testMode, toggle: toggleTestMode } = useTestMode();
  const { tabletMode, showNavBar } = useLayout();
  const location = useLocation();

  useTabNotification();
  useAutoRefresh();
  useRemoteReload();

  const onDashboard = location.pathname === '/';
  const showCompactNav = onDashboard && !showNavBar;

  return (
    <div className={`${styles.root} ${testMode ? styles.testModeRoot : ''}`}>
      {testMode && (
        <div className={styles.testModeBanner}>
          Test mode — queue data is simulated
          <button className={styles.testModeDismiss} onClick={toggleTestMode}>Disable</button>
        </div>
      )}
      <div className={`${styles.content} ${onDashboard && tabletMode ? styles.contentTablet : ''}`}>
        {showCompactNav && <div className={styles.compactNavSpacer} />}
        {children}
      </div>
      <ImportToastStack />
      {showCompactNav && <TabletNav />}
    </div>
  );
}
