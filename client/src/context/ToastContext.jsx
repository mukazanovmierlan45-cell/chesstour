import { createContext, useCallback, useContext, useRef, useState } from 'react';

// Всплывающие уведомления об успехе и ошибках
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const flash = useCallback((message, type = 'ok') => {
    setToast({ message, type, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={flash}>
      {children}
      {toast && <div key={toast.id} className={`flash ${toast.type === 'error' ? 'error' : ''}`} role="status">{toast.message}</div>}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
