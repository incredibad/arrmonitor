import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstances } from '../hooks/useQueue.js';
import { useSabnzbdInstances } from '../hooks/useSabnzbd.js';
import { useNav } from '../lib/navContext.jsx';
import { api } from '../lib/api.js';
import InstanceCard from '../components/InstanceCard.jsx';
import SabnzbdCard from '../components/SabnzbdCard.jsx';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { instances, loading, reload } = useInstances();
  const { instances: sabInstances } = useSabnzbdInstances();
  const { registerRefresh, clearRefresh, setPageTitle, clearPageTitle } = useNav();
  const navigate = useNavigate();
  const enabled    = instances.filter(i => i.enabled);
  const enabledSab = sabInstances.filter(i => i.enabled);

  async function refreshAll() {
    // Trigger RefreshMonitoredDownloads on each instance first, then reload instance list
    await Promise.allSettled(
      enabled.map(inst => api.sendCommand(inst.id, { name: 'RefreshMonitoredDownloads' }).catch(() => {}))
    );
    // Small delay to let arr apps process the refresh
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

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {loading ? (
          [1,2,3].map(i => <div key={i} className={styles.skeleton} />)
        ) : enabled.length === 0 && enabledSab.length === 0 ? (
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
        ) : (
          <>
            {enabledSab.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Download Clients</div>
                <div className={styles.list}>
                  {enabledSab.map(instance => (
                    <SabnzbdCard key={`sab-${instance.id}`} instance={instance} />
                  ))}
                </div>
              </div>
            )}
            {enabled.length > 0 && (
              <div className={styles.section}>
                {enabledSab.length > 0 && <div className={styles.sectionLabel}>Instances</div>}
                <div className={styles.list}>
                  {enabled.map(instance => (
                    <InstanceCard key={instance.id} instance={instance} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
