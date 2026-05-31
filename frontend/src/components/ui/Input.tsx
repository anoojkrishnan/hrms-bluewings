import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, id, className = '', ...rest }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`;
    return (
      <div className={styles.wrapper}>
        {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
        <div className={`${styles.inputWrapper} ${error ? styles.hasError : ''}`}>
          {leftAddon && <span className={styles.addon}>{leftAddon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`${styles.input} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />
          {rightAddon && <span className={`${styles.addon} ${styles.right}`}>{rightAddon}</span>}
        </div>
        {error && <span id={`${inputId}-error`} className={styles.error} role="alert">{error}</span>}
        {!error && hint && <span id={`${inputId}-hint`} className={styles.hint}>{hint}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
