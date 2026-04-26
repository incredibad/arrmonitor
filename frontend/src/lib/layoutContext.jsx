import { createContext, useContext, useState, useCallback } from 'react';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [horizontalLayout, setHorizontalLayout] = useState(() => {
    try { return localStorage.getItem('arrmonitor_horizontal') === 'true'; } catch { return false; }
  });

  const [autoRefresh, setAutoRefresh] = useState(() => {
    try { return localStorage.getItem('arrmonitor_auto_refresh') === 'true'; } catch { return false; }
  });

  const [autoRefreshValue, setAutoRefreshValueState] = useState(() => {
    try { return Number(localStorage.getItem('arrmonitor_auto_refresh_value')) || 1; } catch { return 1; }
  });

  const [autoRefreshUnit, setAutoRefreshUnitState] = useState(() => {
    try { return localStorage.getItem('arrmonitor_auto_refresh_unit') || 'hours'; } catch { return 'hours'; }
  });

  const [tabletMode, setTabletMode] = useState(() => {
    try { return localStorage.getItem('arrmonitor_tablet') === 'true'; } catch { return false; }
  });

  const [hidePending, setHidePending] = useState(() => {
    try { const v = localStorage.getItem('arrmonitor_hide_pending'); return v === null ? true : v === 'true'; } catch { return true; }
  });

  const [showNavBar, setShowNavBar] = useState(() => {
    try { const v = localStorage.getItem('arrmonitor_show_nav_bar'); return v === null ? true : v === 'true'; } catch { return true; }
  });

  const [instanceOrder, setInstanceOrderState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('arrmonitor_instance_order') || 'null') || []; } catch { return []; }
  });

  const [dcOrder, setDcOrderState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('arrmonitor_dc_order') || 'null') || []; } catch { return []; }
  });

  const toggleHorizontal = useCallback(() => {
    setHorizontalLayout(prev => {
      const next = !prev;
      try { localStorage.setItem('arrmonitor_horizontal', String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => {
      const next = !prev;
      try { localStorage.setItem('arrmonitor_auto_refresh', String(next)); } catch {}
      return next;
    });
  }, []);

  const setAutoRefreshInterval = useCallback((value, unit) => {
    const v = Math.max(1, Number(value) || 1);
    setAutoRefreshValueState(v);
    setAutoRefreshUnitState(unit);
    try {
      localStorage.setItem('arrmonitor_auto_refresh_value', String(v));
      localStorage.setItem('arrmonitor_auto_refresh_unit', unit);
    } catch {}
  }, []);

  const toggleTabletMode = useCallback(() => {
    setTabletMode(prev => {
      const next = !prev;
      try { localStorage.setItem('arrmonitor_tablet', String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleHidePending = useCallback(() => {
    setHidePending(prev => {
      const next = !prev;
      try { localStorage.setItem('arrmonitor_hide_pending', String(next)); } catch {}
      return next;
    });
  }, []);

  const setInstanceOrder = useCallback((ids) => {
    setInstanceOrderState(ids);
    try { localStorage.setItem('arrmonitor_instance_order', JSON.stringify(ids)); } catch {}
  }, []);

  const setDcOrder = useCallback((ids) => {
    setDcOrderState(ids);
    try { localStorage.setItem('arrmonitor_dc_order', JSON.stringify(ids)); } catch {}
  }, []);

  const toggleShowNavBar = useCallback(() => {
    setShowNavBar(prev => {
      const next = !prev;
      try { localStorage.setItem('arrmonitor_show_nav_bar', String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <LayoutContext.Provider value={{ horizontalLayout, toggleHorizontal, autoRefresh, toggleAutoRefresh, autoRefreshValue, autoRefreshUnit, setAutoRefreshInterval, tabletMode, toggleTabletMode, hidePending, toggleHidePending, showNavBar, toggleShowNavBar, instanceOrder, setInstanceOrder, dcOrder, setDcOrder }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() { return useContext(LayoutContext); }
