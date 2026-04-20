import { createContext, useContext, useState, useCallback } from 'react';

const NavContext = createContext(null);

export function NavProvider({ children }) {
  const [navContent, setNavContent] = useState(null);
  const [pageTitle, setPageTitle] = useState(null);
  const [refreshFn, setRefreshFn] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const setNav = useCallback((content) => setNavContent(content), []);
  const clearNav = useCallback(() => setNavContent(null), []);
  const clearPageTitle = useCallback(() => setPageTitle(null), []);

  const registerRefresh = useCallback((fn) => setRefreshFn(() => fn), []);
  const clearRefresh = useCallback(() => setRefreshFn(null), []);

  async function handleRefresh() {
    if (!refreshFn) return;
    setRefreshing(true);
    try { await refreshFn(); } finally { setRefreshing(false); }
  }

  return (
    <NavContext.Provider value={{
      navContent, setNav, clearNav,
      pageTitle, setPageTitle, clearPageTitle,
      refreshFn, refreshing, handleRefresh, registerRefresh, clearRefresh,
    }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() { return useContext(NavContext); }
