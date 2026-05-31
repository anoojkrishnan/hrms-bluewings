import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.code}>404</h1>
      <h2 className={styles.title}>Page not found</h2>
      <p className={styles.desc}>The page you were looking for doesn&apos;t exist.</p>
      <Link to="/" className={styles.link}>Go home</Link>
    </div>
  );
}
