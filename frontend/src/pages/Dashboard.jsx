import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstances } from '../hooks/useQueue.js';
import { useSabnzbdInstances } from '../hooks/useSabnzbd.js';
import { useQbittorrentInstances } from '../hooks/useQbittorrent.js';
import { useNav } from '../lib/navContext.jsx';
import { useLayout } from '../lib/layoutContext.jsx';
import { api } from '../lib/api.js';
import AppNav from '../components/AppNav.jsx';

function applyOrder(items, orderIds, getId) {
  if (!orderIds?.length) return items;
  const map = new Map(items.map(item => [getId(item), item]));
  const ordered = orderIds.filter(id => map.has(id)).map(id => map.get(id));
  const unordered = items.filter(item => !orderIds.includes(getId(item)));
  return [...ordered, ...unordered];
}
import InstanceCard from '../components/InstanceCard.jsx';
import SabnzbdCard from '../components/SabnzbdCard.jsx';
import QbittorrentCard from '../components/QbittorrentCard.jsx';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { instances, loading, reload } = useInstances();
  const { instances: sabInstances } = useSabnzbdInstances();
  const { instances: qbInstances } = useQbittorrentInstances();
  const { registerRefresh, clearRefresh, setPageTitle, clearPageTitle } = useNav();
  const { horizontalLayout, tabletMode, showNavBar, instanceOrder, dcOrder } = useLayout();
  const navigate = useNavigate();
  const enabled    = instances.filter(i => i.enabled);
  const enabledSab = sabInstances.filter(i => i.enabled);
  const enabledQb  = qbInstances.filter(i => i.enabled);
  const allClients = [...enabledSab.map(i => ({ ...i, _client: 'sab' })), ...enabledQb.map(i => ({ ...i, _client: 'qb' }))];

  const sortedEnabled = applyOrder(enabled, instanceOrder, i => String(i.id));
  const sortedDcs = applyOrder(
    [
      ...enabledSab.map(i => ({ ...i, _dcKey: `sab-${i.id}` })),
      ...enabledQb.map(i => ({ ...i, _dcKey: `qb-${i.id}` })),
    ],
    dcOrder,
    i => i._dcKey
  );

  async function refreshAll() {
    await Promise.allSettled(
      enabled.map(inst => api.sendCommand(inst.id, { name: 'RefreshMonitoredDownloads' }).catch(() => {}))
    );
    await new Promise(r => setTimeout(r, 1500));
    reload();
  }

  useEffect(() => {
    registerRefresh(refreshAll);
    return () => clearRefresh();
  }, [enabled.length]);

  useEffect(() => {
    setPageTitle('Dashboard');
    return () => clearPageTitle();
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        {showNavBar && <AppNav />}
        <div className={styles.content}>
          {[1,2,3].map(i => <div key={i} className={styles.skeleton} />)}
        </div>
      </div>
    );
  }

  if (enabled.length === 0 && allClients.length === 0) {
    return (
      <div className={styles.page}>
        {showNavBar && <AppNav />}
        <div className={styles.content}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>No instances configured</p>
            <p className={styles.emptySub}>Add your Sonarr, Radarr, or Lidarr instances in Settings to get started.</p>
            <button className={styles.ctaBtn} onClick={() => navigate('/settings')}>Go to Settings</button>
          </div>
        </div>
      </div>
    );
  }

  if (tabletMode) {
    const tabletCols = (
      <>
        <div className={styles.tabletColClients}>
          {sortedDcs.map(dc => dc._dcKey.startsWith('sab-')
            ? <SabnzbdCard key={dc._dcKey} instance={dc} />
            : <QbittorrentCard key={dc._dcKey} instance={dc} />
          )}
          {allClients.length === 0 && <p className={styles.colEmpty}>No download clients configured.</p>}
        </div>
        <div className={styles.tabletColInstances}>
          {sortedEnabled.map(instance => <InstanceCard key={instance.id} instance={instance} />)}
          {sortedEnabled.length === 0 && <p className={styles.colEmpty}>No instances configured.</p>}
        </div>
      </>
    );
    if (showNavBar) {
      return (
        <div className={styles.tabletWrapper}>
          <AppNav />
          <div className={styles.tabletLayoutInner}>{tabletCols}</div>
        </div>
      );
    }
    return <div className={styles.tabletLayout}>{tabletCols}</div>;
  }

  if (horizontalLayout) {
    return (
      <div className={styles.page}>
        {showNavBar && <AppNav />}
        <div className={styles.twoCol}>
          <div className={styles.colClients}>
            <div className={styles.sectionLabel}>Download Clients</div>
            <div className={styles.clientList}>
              {sortedDcs.map(dc => dc._dcKey.startsWith('sab-')
                ? <SabnzbdCard key={dc._dcKey} instance={dc} />
                : <QbittorrentCard key={dc._dcKey} instance={dc} />
              )}
              {allClients.length === 0 && <p className={styles.colEmpty}>No download clients configured.</p>}
            </div>
          </div>

          <div className={styles.colInstances}>
            <div className={styles.sectionLabel}>Apps</div>
            <div className={styles.instanceList}>
              {sortedEnabled.map(instance => <InstanceCard key={instance.id} instance={instance} />)}
              {sortedEnabled.length === 0 && <p className={styles.colEmpty}>No instances configured.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {showNavBar && <AppNav />}
      <div className={styles.content}>
        {sortedDcs.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Download Clients</div>
            <div className={styles.list}>
              {sortedDcs.map(dc => dc._dcKey.startsWith('sab-')
                ? <SabnzbdCard key={dc._dcKey} instance={dc} />
                : <QbittorrentCard key={dc._dcKey} instance={dc} />
              )}
            </div>
          </div>
        )}
        {sortedEnabled.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Apps</div>
            <div className={styles.list}>
              {sortedEnabled.map(instance => <InstanceCard key={instance.id} instance={instance} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
