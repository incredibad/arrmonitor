import { createContext, useContext, useState, useCallback } from 'react';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [horizontalLayout, setHorizontalLayout] = useState(() => {
    try { return localStorage.getItem('arrmonitor_horizontal') === 'true'; } catch { return false; }
  });

  const [autoRefresh, setAutoRefresh] = useState(() => {
    try { return localStorage.getItem('arrmonitor_auto_refresh') === 'true'; } catch { return false; }
  });

  const [tabletMode, setTabletMode] = useState(() => {
    try { return localStorage.getItem('arrmonitor_tablet') === 'true'; } catch { return false; }
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

  const toggleTabletMode = useCallback(() => {
    setTabletMode(prev => {
      const next = !prev;
      try { localStorage.setItem('arrmonitor_tablet', String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <LayoutContext.Provider value={{ horizontalLayout, toggleHorizontal, autoRefresh, toggleAutoRefresh, tabletMode, toggleTabletMode }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() { return useContext(LayoutContext); }
