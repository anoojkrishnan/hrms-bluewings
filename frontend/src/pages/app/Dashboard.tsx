import { useAuthStore } from '@/lib/store/auth.store';
import { Card } from '@/components/ui/Card';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dashboard</h1>
      <p className={styles.sub}>Welcome back{user ? `, ${user.userId.slice(0, 8)}` : ''}.</p>

      <div className={styles.grid}>
        <Card>
          <Card.Header>Organisation</Card.Header>
          <Card.Body>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Set up your companies, departments, and locations.
            </p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Header>Users &amp; Roles</Card.Header>
          <Card.Body>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Manage user accounts and role assignments.
            </p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Header>Audit Log</Card.Header>
          <Card.Body>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              All actions across your tenant are logged here.
            </p>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
