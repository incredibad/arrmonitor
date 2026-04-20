import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useNav } from '../lib/navContext.jsx';
import ImportToastStack from './ImportToastStack.jsx';
import styles from './Layout.module.css';

function useTabNotification() {
  useEffect(() => {
    const baseTitle = 'ArrMonitor';
    async function checkErrors() {
      try {
        const instances = await api.getInstances();
        const enabled = instances.filter(i => i.enabled);
        let total = 0;
        await Promise.all(enabled.map(async inst => {
          try {
            const q = await api.getQueue(inst.id);
            total += (q?.records || []).length;
          } catch {}
        }));
        document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
      } catch { document.title = baseTitle; }
    }
    checkErrors();
    const t = setInterval(checkErrors, 30000);
    return () => { clearInterval(t); document.title = baseTitle; };
  }, []);
}

export default function Layout({ children }) {
  const { refreshFn, refreshing, handleRefresh, pageTitle } = useNav();
  useTabNotification();

  return (
    <div className={styles.root}>
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
