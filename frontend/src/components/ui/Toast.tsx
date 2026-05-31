import { useUiStore } from '@/lib/store/ui.store';
import styles from './Toast.module.css';

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.variant]}`} role="alert">
          <span className={styles.message}>{toast.message}</span>
          <button className={styles.close} onClick={() => removeToast(toast.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
