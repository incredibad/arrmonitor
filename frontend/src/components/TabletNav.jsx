import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useNav } from '../lib/navContext.jsx';
import styles from './TabletNav.module.css';

export default function TabletNav() {
  const [open, setOpen] = useState(false);
  const { refreshFn, refreshing, handleRefresh } = useNav();

  function close() { setOpen(false); }

  async function doRefresh() {
    close();
    await handleRefresh();
  }

  return (
    <>
      {open && <div className={styles.backdrop} onClick={close} />}
      <div className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`}>
        <NavLink to="/" className={styles.logo} onClick={close}>
          <img src="/favicon.svg" alt="" className={styles.logoIcon} />
          <span className={styles.logoText}>ARRMONITOR</span>
        </NavLink>
        <div className={styles.divider} />
        <nav className={styles.nav}>
          <NavLink to="/" end onClick={close}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <DashIcon /> Dashboard
          </NavLink>
          <NavLink to="/activity" onClick={close}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <ActivityIcon /> All Queues
          </NavLink>
          <NavLink to="/settings" onClick={close}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <SettingsIcon /> Settings
          </NavLink>
          {refreshFn && (
            <button className={`${styles.navItem} ${refreshing ? styles.navItemSpinning : ''}`} onClick={doRefresh}>
              <RefreshIcon /> Refresh
            </button>
          )}
        </nav>
      </div>
      <button className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`} onClick={() => setOpen(o => !o)} aria-label="Navigation">
        <ChevronIcon />
      </button>
    </>
  );
}

const ChevronIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const DashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
