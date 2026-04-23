import { createContext, useContext, useState, useCallback } from 'react';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [horizontalLayout, setHorizontalLayout] = useState(() => {
    try { return localStorage.getItem('arrmonitor_horizontal') === 'true'; } catch { return false; }
  });

  const toggleHorizontal = useCallback(() => {
    setHorizontalLayout(prev => {
      const next = !prev;
      try { localStorage.setItem('arrmonitor_horizontal', String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <LayoutContext.Provider value={{ horizontalLayout, toggleHorizontal }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() { return useContext(LayoutContext); }
