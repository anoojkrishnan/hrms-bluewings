import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  cta?: React.ReactNode;
}

export function EmptyState({ title, description, icon, cta }: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {cta && <div className={styles.cta}>{cta}</div>}
    </div>
  );
}
