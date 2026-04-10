import { createContext, useContext, useState, useCallback } from 'react';

const ImportToastContext = createContext(null);

let nextId = 1;

export function ImportToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addImport = useCallback((info) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, ...info }]);
  }, []);

  const removeImport = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ImportToastContext.Provider value={{ toasts, addImport, removeImport }}>
      {children}
    </ImportToastContext.Provider>
  );
}

export function useImportToast() {
  return useContext(ImportToastContext);
}
