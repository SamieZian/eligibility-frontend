import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
}

interface ToastApi {
  show: (tone: Tone, title: string, body?: string) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((tone: Tone, title: string, body?: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, title, body }]);
    // Auto-dismiss after 4s
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const api: ToastApi = {
    show,
    success: (title, body) => show('success', title, body),
    error: (title, body) => show('error', title, body),
    info: (title, body) => show('info', title, body),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.stack} role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div className={`${styles.toast} ${styles[t.tone]} ${visible ? styles.in : ''}`}>
      <div className={styles.icon}>{t.tone === 'success' ? '✓' : t.tone === 'error' ? '✕' : 'ℹ'}</div>
      <div className={styles.body}>
        <div className={styles.title}>{t.title}</div>
        {t.body && <div className={styles.sub}>{t.body}</div>}
      </div>
      <button type="button" className={styles.close} onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
