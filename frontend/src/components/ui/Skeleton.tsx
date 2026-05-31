import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width, height = '1rem', borderRadius, className = '' }: SkeletonProps) {
  return (
    <span
      className={`${styles.skeleton} ${className}`}
      style={{
        width: width ?? '100%',
        height,
        borderRadius: borderRadius ?? 'var(--radius-md)',
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.textGroup}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height="0.875rem" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <Skeleton height="120px" />
      <div className={styles.cardBody}>
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="0.875rem" width="80%" />
        <Skeleton height="0.875rem" width="40%" />
      </div>
    </div>
  );
}
