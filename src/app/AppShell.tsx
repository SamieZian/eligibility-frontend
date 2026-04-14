import cx from 'classnames';
import { useEffect, useState } from 'react';
import { BannerStack } from '../components/Banner';
import { Grid } from '../features/eligibility/Grid';
import { GroupsAdmin } from '../features/groups/GroupsAdmin';
import { FileUpload } from '../features/upload/FileUpload';
import { useGlobalStatus } from './GlobalStatus';
import { useRouter } from '../lib/router';
import styles from './AppShell.module.css';

interface NavItem {
  path: string;
  label: string;
}

const NAV: NavItem[] = [
  { path: '/eligibility', label: 'Eligibility' },
  { path: '/groups', label: 'Groups' },
  { path: '/upload', label: 'Upload' },
  { path: '/about', label: 'About' },
];

export function AppShell() {
  const { route, navigate } = useRouter();
  const { correlationId } = useGlobalStatus();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('bff.theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('bff.theme', theme);
  }, [theme]);

  const activePath = NAV.find((n) => route.path.startsWith(n.path))?.path ?? '/eligibility';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandWrap}>
          <span className={styles.logo}>⬢</span>
          <span className={styles.brand}>Eligibility Console</span>
          <span className={styles.envBadge}>local · v0.1</span>
        </div>
        <nav aria-label="Primary" className={styles.nav}>
          {NAV.map((item) => (
            <button
              key={item.path}
              type="button"
              className={cx(styles.navItem, activePath === item.path && styles.navItemActive)}
              onClick={() => navigate(item.path)}
              aria-current={activePath === item.path ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className={styles.themeBtn}
          aria-label="Toggle dark mode"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </header>
      <BannerStack />
      <main className={styles.main}>
        {activePath === '/eligibility' && <Grid />}
        {activePath === '/groups' && <GroupsAdmin />}
        {activePath === '/upload' && <FileUpload />}
        {activePath === '/about' && <AboutPage />}
      </main>
      <footer className={styles.footer} aria-label="Debug footer">
        <span className={styles.footerCid} title="Last correlation id">
          cid: <code>{correlationId || '—'}</code>
        </span>
        <span className={styles.footerLinks}>
          <a href="http://localhost:4000/graphql" target="_blank" rel="noreferrer">GraphQL</a>
          <a href="http://localhost:16686" target="_blank" rel="noreferrer">Jaeger</a>
          <a href="http://localhost:9001" target="_blank" rel="noreferrer">MinIO</a>
          <a href="http://localhost:9200" target="_blank" rel="noreferrer">OpenSearch</a>
        </span>
      </footer>
    </div>
  );
}

function AboutPage() {
  return (
    <div className={styles.about}>
      <div className={styles.aboutHero}>
        <h1>Eligibility &amp; Enrollment Platform</h1>
        <p className={styles.lead}>
          A distributed microservices system for healthcare eligibility — ingests ANSI X12{' '}
          <strong>834</strong> enrollment files, maintains a <strong>bitemporal</strong> coverage
          timeline, and powers this React console.
        </p>
      </div>

      <div className={styles.aboutGrid}>
        <Card title="Microservices (4 + 3 + 1)">
          <ul>
            <li><strong>atlas</strong> — bitemporal enrollment</li>
            <li><strong>member</strong> — members + dependents (KMS-encrypted SSN)</li>
            <li><strong>group</strong> — payer / employer / subgroup / plan visibility</li>
            <li><strong>plan</strong> — plan catalog (Redis cache-aside)</li>
            <li><strong>bff</strong> — GraphQL gateway + file upload</li>
            <li><strong>workers</strong> — ingestion / projector / outbox-relay</li>
            <li><strong>frontend</strong> — this UI</li>
          </ul>
        </Card>
        <Card title="Patterns shipped">
          <ul>
            <li>Bitemporal model (valid-time + transaction-time)</li>
            <li>Transactional outbox + Pub/Sub at-least-once</li>
            <li>CQRS read model — Postgres view + OpenSearch</li>
            <li>Saga orchestration (REPLACE_FILE workflow)</li>
            <li>Circuit breakers, retry w/ jitter, DLQs</li>
            <li>Per-row idempotency on 834 retries</li>
          </ul>
        </Card>
        <Card title="Try the demo">
          <ol>
            <li>Click <em>Upload</em> → drop in <code>samples/834_sample.x12</code></li>
            <li>Wait ~10s for the projector to catch up</li>
            <li>Search "sharma" in the grid</li>
            <li>Click any row → see the bitemporal timeline</li>
          </ol>
        </Card>
        <Card title="Repos">
          <ul className={styles.linksList}>
            <li><a href="https://github.com/SamieZian/eligibility-platform" target="_blank" rel="noreferrer">eligibility-platform (orchestration)</a></li>
            <li><a href="https://github.com/SamieZian/eligibility-atlas" target="_blank" rel="noreferrer">eligibility-atlas</a></li>
            <li><a href="https://github.com/SamieZian/eligibility-member" target="_blank" rel="noreferrer">eligibility-member</a></li>
            <li><a href="https://github.com/SamieZian/eligibility-group" target="_blank" rel="noreferrer">eligibility-group</a></li>
            <li><a href="https://github.com/SamieZian/eligibility-plan" target="_blank" rel="noreferrer">eligibility-plan</a></li>
            <li><a href="https://github.com/SamieZian/eligibility-bff" target="_blank" rel="noreferrer">eligibility-bff</a></li>
            <li><a href="https://github.com/SamieZian/eligibility-workers" target="_blank" rel="noreferrer">eligibility-workers</a></li>
            <li><a href="https://github.com/SamieZian/eligibility-frontend" target="_blank" rel="noreferrer">eligibility-frontend</a></li>
          </ul>
        </Card>
        <Card title="SLOs">
          <ul>
            <li>Search p95 &lt; 300ms · p99 &lt; 800ms</li>
            <li>834 ingest p95 &lt; 5 min / 100 MB</li>
            <li>CDC → projection lag p95 &lt; 10s</li>
            <li>Reconciliation drift &lt; 0.01%</li>
          </ul>
        </Card>
        <Card title="Stack">
          <ul>
            <li>React 18 + TS + Vite + TanStack</li>
            <li>FastAPI + Strawberry GraphQL</li>
            <li>Postgres 15 (4 DBs, one per service)</li>
            <li>OpenSearch · Redis · MinIO · Pub/Sub emulator</li>
            <li>OpenTelemetry → Jaeger · Cloud Run-ready</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.aboutCard}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
