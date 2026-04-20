import { createContext, useContext, useState, useCallback } from 'react';

const TestModeContext = createContext(null);

export function TestModeProvider({ children }) {
  const [testMode, setTestMode] = useState(() => {
    try { return localStorage.getItem('arrmonitor_testmode') === 'true'; } catch { return false; }
  });

  const toggle = useCallback(() => {
    setTestMode(prev => {
      const next = !prev;
      try { localStorage.setItem('arrmonitor_testmode', String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <TestModeContext.Provider value={{ testMode, toggle }}>
      {children}
    </TestModeContext.Provider>
  );
}

export function useTestMode() { return useContext(TestModeContext); }
