import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { searchEnrollments } from '../../api/bff';
import type { Enrollment, SearchFilter, SortOrder } from '../../api/types';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { useDebounce } from '../../lib/useDebounce';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { AdvancedSearchModal } from './AdvancedSearchModal';
import { SavedViews } from './SavedViews';
import { MemberDetail } from '../member/Detail';
import styles from './Grid.module.css';

interface ColumnDef {
  key: keyof Enrollment | 'actions';
  label: string;
  sortable: boolean;
  filterable?: 'select' | 'text' | false;
  options?: string[];
  width?: string;
}

const ALL_COLUMNS: readonly ColumnDef[] = [
  { key: 'cardNumber', label: 'Member ID Card Number', sortable: true, filterable: 'text' },
  { key: 'memberName', label: 'Member Name', sortable: true, filterable: 'text' },
  { key: 'employerName', label: 'Employer', sortable: true, filterable: 'text' },
  { key: 'subgroupName' as keyof Enrollment, label: 'Subgroup Name', sortable: true, filterable: 'text' },
  { key: 'planName', label: 'Plan Name', sortable: true, filterable: 'text' },
  { key: 'dob', label: 'Date of Birth', sortable: true, filterable: false },
  {
    key: 'relationship',
    label: 'Member Type',
    sortable: true,
    filterable: 'select',
    options: ['', 'subscriber', 'spouse', 'child', 'dependent'],
  },
  { key: 'effectiveDate', label: 'Effective Date', sortable: true, filterable: false },
  { key: 'terminationDate', label: 'Termination Date', sortable: true, filterable: false },
  { key: 'actions', label: '', sortable: false, filterable: false, width: '60px' },
] as const;

const STATUS_CHIPS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'termed', label: 'Terminated' },
];

type ColumnKey = ColumnDef['key'];
const DEFAULT_VISIBLE: ColumnKey[] = ALL_COLUMNS.map((c) => c.key);

type ClientSort = { key: keyof Enrollment; dir: 'asc' | 'desc' } | null;

export function Grid() {
  const [filter, setFilter] = useState<SearchFilter>({});
  const [statusChips, setStatusChips] = useState<string[]>(['active', 'pending']);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<keyof Enrollment, string>>>({});
  const [quickQuery, setQuickQuery] = useState('');
  const debouncedQ = useDebounce(quickQuery, 250);
  const [cursor, setCursor] = useState<string | null>(null);
  const [serverSort, setServerSort] = useState<SortOrder>('effective_date_desc');
  const [clientSort, setClientSort] = useState<ClientSort>(null);
  const [pageSize, setPageSize] = useLocalStorage<number>('bff.grid.pageSize', 50);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [visible, setVisible] = useLocalStorage<ColumnKey[]>('bff.grid.columns', DEFAULT_VISIBLE);
  const [density, setDensity] = useLocalStorage<'comfortable' | 'compact'>(
    'bff.grid.density',
    'comfortable',
  );

  const effectiveFilter: SearchFilter = useMemo(
    () => ({
      ...filter,
      q: debouncedQ || filter.q || null,
    }),
    [filter, debouncedQ],
  );

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['search', effectiveFilter, cursor, serverSort, pageSize],
    queryFn: () => searchEnrollments(effectiveFilter, { limit: pageSize, cursor, sort: serverSort }),
    placeholderData: (prev) => prev,
  });

  // Apply status chips + per-column filters + client-side sort to the rows.
  const items = useMemo(() => {
    const all = data?.items ?? [];
    return all
      .filter((row) => statusChips.length === 0 || statusChips.includes(row.status))
      .filter((row) =>
        Object.entries(columnFilters).every(([key, value]) => {
          if (!value) return true;
          const cell = String((row as unknown as Record<string, unknown>)[key] ?? '').toLowerCase();
          return cell.includes(value.toLowerCase());
        }),
      )
      .sort((a, b) => {
        if (!clientSort) return 0;
        const av = String(a[clientSort.key] ?? '');
        const bv = String(b[clientSort.key] ?? '');
        return clientSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [data, statusChips, columnFilters, clientSort]);

  const toggleColumn = (key: ColumnKey) =>
    setVisible((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const applyFilter = (next: SearchFilter) => {
    setFilter(next);
    setCursor(null);
  };

  const toggleStatus = (s: string) =>
    setStatusChips((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const cycleSort = (key: keyof Enrollment) => {
    setClientSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const visibleCols = ALL_COLUMNS.filter((c) => visible.includes(c.key));

  return (
    <div className={styles.wrap} data-density={density}>
      {/* ── Top toolbar ────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.chips}>
          {STATUS_CHIPS.map((s) => {
            const active = statusChips.includes(s.value);
            return (
              <button
                key={s.value}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                onClick={() => toggleStatus(s.value)}
                aria-pressed={active}
              >
                {s.label}
                {active && <span className={styles.chipX}>×</span>}
              </button>
            );
          })}
        </div>
        <input
          className={styles.search}
          aria-label="Quick search"
          placeholder="Search by Member Name, Member ID Card…"
          value={quickQuery}
          onChange={(e) => {
            setQuickQuery(e.target.value);
            setCursor(null);
          }}
        />
        <Button onClick={() => setAdvancedOpen(true)}>▾ Advanced Search</Button>
        <SavedViews currentFilter={filter} onApply={applyFilter} />
        <div className={styles.spacer} />
        <Button variant="primary" onClick={() => alert('Add Member: coming soon — wire to member svc POST /members')}>
          + Add New Member
        </Button>
        <select
          aria-label="Density"
          value={density}
          onChange={(e) => setDensity(e.target.value as 'comfortable' | 'compact')}
        >
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
        <details className={styles.colMenu}>
          <summary>Columns</summary>
          <ul>
            {ALL_COLUMNS.filter((c) => c.key !== 'actions').map((c) => (
              <li key={c.key}>
                <label>
                  <input
                    type="checkbox"
                    checked={visible.includes(c.key)}
                    onChange={() => toggleColumn(c.key)}
                  />
                  {c.label}
                </label>
              </li>
            ))}
          </ul>
        </details>
      </div>

      {isLoading && <Spinner />}
      {error && (
        <div role="alert" className={styles.error}>
          {(error as Error).message}
        </div>
      )}

      {/* ── Data grid ──────────────────────────────────────── */}
      <div className={styles.tableWrap} role="region" aria-label="Eligibility results">
        <table className={styles.table}>
          <thead>
            <tr>
              {visibleCols.map((c) => (
                <th key={String(c.key)} scope="col" style={c.width ? { width: c.width } : undefined}>
                  <div className={styles.th}>
                    <span>{c.label}</span>
                    {c.sortable && (
                      <button
                        type="button"
                        className={styles.sortBtn}
                        aria-label={`Sort by ${c.label}`}
                        onClick={() => cycleSort(c.key as keyof Enrollment)}
                      >
                        {clientSort?.key === c.key
                          ? clientSort.dir === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </button>
                    )}
                    {c.filterable && (
                      <input
                        type={c.filterable === 'text' ? 'search' : 'text'}
                        list={c.filterable === 'select' ? `opts-${String(c.key)}` : undefined}
                        className={styles.colFilter}
                        placeholder="filter…"
                        value={columnFilters[c.key as keyof Enrollment] ?? ''}
                        onChange={(e) =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            [c.key]: e.target.value,
                          }))
                        }
                      />
                    )}
                    {c.filterable === 'select' && c.options && (
                      <datalist id={`opts-${String(c.key)}`}>
                        {c.options.map((o) => (
                          <option key={o} value={o} />
                        ))}
                      </datalist>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.enrollmentId}>
                {visibleCols.map((c) => (
                  <td key={String(c.key)}>{renderCell(row, c.key, setDrawerMemberId, actionsFor, setActionsFor)}</td>
                ))}
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={visibleCols.length} className={styles.empty}>
                  No enrollments match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────── */}
      <div className={styles.pager}>
        <span>
          {isFetching
            ? 'Loading…'
            : `${items.length === 0 ? 0 : 1}-${items.length} of ${data?.total ?? items.length} items`}
        </span>
        <div className={styles.pagerControls}>
          <Button variant="secondary" disabled={!cursor} onClick={() => setCursor(null)}>
            ⇤ First
          </Button>
          <Button
            variant="secondary"
            disabled={!data?.nextCursor}
            onClick={() => setCursor(data?.nextCursor ?? null)}
          >
            Next →
          </Button>
          <select
            aria-label="Page size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCursor(null);
            }}
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {advancedOpen && (
        <AdvancedSearchModal
          initial={filter}
          onClose={() => setAdvancedOpen(false)}
          onApply={(f) => {
            applyFilter(f);
            setAdvancedOpen(false);
          }}
        />
      )}

      {drawerMemberId && (
        <MemberDetail memberId={drawerMemberId} onClose={() => setDrawerMemberId(null)} />
      )}
    </div>
  );
}

function renderCell(
  row: Enrollment,
  key: ColumnKey,
  openDrawer: (memberId: string) => void,
  actionsFor: string | null,
  setActionsFor: (id: string | null) => void,
): React.ReactNode {
  if (key === 'actions') {
    const open = actionsFor === row.enrollmentId;
    return (
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          aria-label="Row actions"
          className={cellStyles.actionBtn}
          onClick={(e) => {
            e.stopPropagation();
            setActionsFor(open ? null : row.enrollmentId);
          }}
        >
          ☰
        </button>
        {open && (
          <div className={cellStyles.actionMenu} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => { openDrawer(row.memberId); setActionsFor(null); }}>
              View Member
            </button>
            <button type="button" onClick={() => alert('Terminate flow — wire to atlas terminateEnrollment')}>
              Terminate
            </button>
            <button type="button" onClick={() => alert('Edit flow — would open AddDependent / change plan modal')}>
              Edit
            </button>
          </div>
        )}
      </div>
    );
  }
  if (key === 'memberName') {
    return (
      <button
        type="button"
        className={cellStyles.link}
        onClick={() => openDrawer(row.memberId)}
      >
        {row.memberName || '—'}
      </button>
    );
  }
  if (key === 'planName') {
    return row.planName ? <span className={`${cellStyles.chip} ${cellStyles.planChip}`}>{row.planName}</span> : '—';
  }
  if (key === 'subgroupName') {
    const v = (row as unknown as Record<string, unknown>).subgroupName as string | null;
    return v ? <span className={`${cellStyles.chip} ${cellStyles.subgroupChip}`}>{v}</span> : '—';
  }
  if (key === 'employerName') {
    return row.employerName ? <span className={cellStyles.softBadge}>{row.employerName}</span> : '—';
  }
  if (key === 'status') {
    const cls =
      row.status === 'active'
        ? cellStyles.statusActive
        : row.status === 'termed'
        ? cellStyles.statusTermed
        : cellStyles.statusPending;
    return <span className={`${cellStyles.statusBadge} ${cls}`}>{row.status}</span>;
  }
  const v = (row as unknown as Record<string, unknown>)[key];
  if (v == null) return '—';
  // Hide sentinel "9999-12-31"
  if (key === 'terminationDate' && v === '9999-12-31') return '—';
  return String(v);
}

// Inline styles for cell renderers (small enough to not need a module CSS)
const cellStyles = {
  link: 'cell-link',
  chip: 'cell-chip',
  planChip: 'cell-chip-plan',
  subgroupChip: 'cell-chip-subgroup',
  softBadge: 'cell-soft-badge',
  statusBadge: 'cell-status',
  statusActive: 'cell-status-active',
  statusTermed: 'cell-status-termed',
  statusPending: 'cell-status-pending',
  actionBtn: 'cell-action-btn',
  actionMenu: 'cell-action-menu',
};
