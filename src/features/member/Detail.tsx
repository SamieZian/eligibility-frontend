import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { enrollmentTimeline } from '../../api/bff';
import { subscribeEnrollmentUpdates } from '../../api/subscriptions';
import type { TimelineSegment } from '../../api/types';
import { Spinner } from '../../components/Spinner';
import styles from './Detail.module.css';

interface Props {
  memberId: string;
  onClose: () => void;
}

type ViewMode = 'gantt' | 'table';

const INFINITY_DATE = '9999-12-31';

export function MemberDetail({ memberId, onClose }: Props) {
  const [view, setView] = useState<ViewMode>('gantt');
  const [livePulse, setLivePulse] = useState(false);
  const pulseTimer = useRef<number | null>(null);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['timeline', memberId],
    queryFn: () => enrollmentTimeline(memberId),
  });

  // Live refresh: subscribe while the drawer is mounted. When an event
  // arrives for this member, invalidate the timeline query so TanStack
  // Query refetches, and flash the green dot for ~1.5s.
  useEffect(() => {
    if (!memberId) return;
    const unsub = subscribeEnrollmentUpdates(memberId, () => {
      qc.invalidateQueries({ queryKey: ['timeline', memberId] });
      setLivePulse(true);
      if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
      pulseTimer.current = window.setTimeout(() => setLivePulse(false), 1500);
    });
    return () => {
      unsub();
      if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    };
  }, [memberId, qc]);

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-label="Member detail">
        <header className={styles.header}>
          <div>
            <h2>
              Member Timeline
              <span
                className={`${styles.liveDot} ${livePulse ? styles.liveDotOn : ''}`}
                title={livePulse ? 'Just updated' : 'Live'}
                aria-label={livePulse ? 'Live update received' : 'Live'}
              />
            </h2>
            <span className={styles.subtitle}>Coverage history — when each enrollment was effective and when it was recorded</span>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.viewToggle} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'gantt'}
                className={`${styles.viewTab} ${view === 'gantt' ? styles.viewTabActive : ''}`}
                onClick={() => setView('gantt')}
              >
                📊 Gantt
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'table'}
                className={`${styles.viewTab} ${view === 'table' ? styles.viewTabActive : ''}`}
                onClick={() => setView('table')}
              >
                🗂 Table
              </button>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className={styles.close}>✕</button>
          </div>
        </header>
        <section className={styles.body}>
          {isLoading && <Spinner />}
          {error && <div className={styles.error} role="alert">{(error as Error).message}</div>}
          {data && data.length === 0 && (
            <div className={styles.empty}>No enrollments for this member.</div>
          )}
          {data && data.length > 0 && (
            view === 'gantt' ? <Gantt segments={data} /> : <TimelineTable segments={data} />
          )}
        </section>
      </aside>
    </div>
  );
}

/* ── Visual Gantt chart ─────────────────────────────────────── */

function Gantt({ segments }: { segments: TimelineSegment[] }) {
  // Compute the date range across all segments
  const { startMs, endMs, months } = useMemo(() => {
    const dates = segments.flatMap((s) => [
      parseDate(s.validFrom),
      s.validTo === INFINITY_DATE ? null : parseDate(s.validTo),
    ]).filter((d): d is number => d !== null);
    if (!dates.length) {
      const now = Date.now();
      return { startMs: now, endMs: now + 365 * 86400 * 1000, months: [] };
    }
    const min = Math.min(...dates);
    const max = Math.max(...dates, Date.now());
    // Pad range by 1 month on each side
    const pad = 30 * 86400 * 1000;
    const s = new Date(min - pad);
    s.setDate(1);
    const e = new Date(max + pad);
    e.setDate(1);
    e.setMonth(e.getMonth() + 1);
    const months: Array<{ label: string; pos: number }> = [];
    const cur = new Date(s);
    const total = e.getTime() - s.getTime();
    while (cur < e) {
      months.push({
        label: cur.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        pos: ((cur.getTime() - s.getTime()) / total) * 100,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return { startMs: s.getTime(), endMs: e.getTime(), months };
  }, [segments]);

  // Group segments by plan_id so each plan gets its own row
  const byPlan = useMemo(() => {
    const m = new Map<string, { planName: string; segments: TimelineSegment[] }>();
    for (const s of segments) {
      const key = s.planId;
      const existing = m.get(key);
      if (existing) existing.segments.push(s);
      else m.set(key, { planName: s.planName ?? key.slice(0, 8), segments: [s] });
    }
    return Array.from(m.entries()).map(([id, v]) => ({ id, ...v }));
  }, [segments]);

  const range = endMs - startMs;
  const todayPos = ((Date.now() - startMs) / range) * 100;

  return (
    <div className={styles.gantt}>
      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.bar} ${styles.barActive} ${styles.legendSwatch}`} /> Active in-force
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.bar} ${styles.barTermed} ${styles.legendSwatch}`} /> Terminated
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.bar} ${styles.barHistory} ${styles.legendSwatch}`} /> Superseded by a later correction
        </span>
        <span className={styles.legendItem}>
          <span className={styles.todayMarkerLegend} /> Today
        </span>
      </div>

      {/* Time-axis header */}
      <div className={styles.axisRow}>
        <div className={styles.axisLabelCol} />
        <div className={styles.axisTrack}>
          {months.map((m, i) => (
            <div key={i} className={styles.axisTick} style={{ left: `${m.pos}%` }}>
              <span className={styles.axisLabel}>{m.label}</span>
            </div>
          ))}
          {/* Today marker line spans all rows below via position: absolute in wrapper */}
        </div>
      </div>

      {/* Per-plan rows */}
      <div className={styles.ganttRows}>
        {byPlan.map((p) => (
          <div key={p.id} className={styles.ganttRow}>
            <div className={styles.axisLabelCol}>
              <strong>{p.planName}</strong>
              <span className={styles.ganttRowMeta}>{p.segments.length} segment{p.segments.length === 1 ? '' : 's'}</span>
            </div>
            <div className={styles.ganttTrack}>
              {p.segments.map((s) => {
                const from = parseDate(s.validFrom);
                const to = s.validTo === INFINITY_DATE ? endMs : parseDate(s.validTo);
                const leftPct = ((from - startMs) / range) * 100;
                const widthPct = Math.max(((to - from) / range) * 100, 0.6);
                const classes = [styles.bar];
                if (s.status === 'active') classes.push(styles.barActive);
                else if (s.status === 'termed') classes.push(styles.barTermed);
                if (!s.isInForce) classes.push(styles.barHistory);
                const title = `${s.status} · ${s.validFrom} → ${s.validTo === INFINITY_DATE ? 'open' : s.validTo}${s.isInForce ? '' : ' (history)'}`;
                return (
                  <div
                    key={s.id}
                    className={classes.join(' ')}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={title}
                  >
                    <span className={styles.barLabel}>
                      {s.validFrom} → {s.validTo === INFINITY_DATE ? '…' : s.validTo}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Today marker overlay */}
      {todayPos >= 0 && todayPos <= 100 && (
        <div className={styles.todayMarker} style={{ left: `calc(var(--gantt-label-w) + ${todayPos}%)` }}>
          <span className={styles.todayLabel}>today</span>
        </div>
      )}

      {/* Explanatory footer */}
      <div className={styles.ganttFooter}>
        <strong>How to read this:</strong>{' '}
        Each bar is one enrollment period. Green bars show active coverage, red bars
        show terminated coverage, and dimmed bars show what the record looked like
        before a later correction replaced it. Hover a bar for exact dates.
      </div>
    </div>
  );
}

function parseDate(s: string): number {
  if (s === INFINITY_DATE) return Number.MAX_SAFE_INTEGER;
  return new Date(s + 'T00:00:00Z').getTime();
}

/* ── Table view (the old one, kept for "show me all the columns") ── */

function TimelineTable({ segments }: { segments: TimelineSegment[] }) {
  return (
    <table className={styles.timeline}>
      <thead>
        <tr>
          <th>Plan</th>
          <th>Status</th>
          <th>Valid From</th>
          <th>Valid To</th>
          <th>Recorded From</th>
          <th>Recorded To</th>
          <th>In-Force</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        {segments.map((s) => (
          <tr key={s.id} className={s.isInForce ? styles.inForce : styles.history}>
            <td>{s.planName ?? s.planId.slice(0, 8)}</td>
            <td>{s.status}</td>
            <td>{s.validFrom}</td>
            <td>{s.validTo === INFINITY_DATE ? '—' : s.validTo}</td>
            <td>{fmtTs(s.txnFrom)}</td>
            <td>{s.isInForce ? '—' : fmtTs(s.txnTo)}</td>
            <td>{s.isInForce ? '●' : '—'}</td>
            <td className={styles.src}>{s.sourceSegmentRef ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function fmtTs(iso: string): string {
  // "2026-04-14T05:48:48.557915+00:00" → "2026-04-14 05:48"
  return iso.replace('T', ' ').slice(0, 16);
}
