import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { searchEnrollments } from '../../api/bff';
import type { Enrollment, SearchFilter, SortOrder } from '../../api/types';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { useDebounce } from '../../lib/useDebounce';
import { useClickOutside } from '../../lib/useClickOutside';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { AdvancedSearchModal } from './AdvancedSearchModal';
import { AddMemberModal } from './AddMemberModal';
import { TerminateModal } from './TerminateModal';
import { EditEnrollmentModal } from './EditEnrollmentModal';
import { EditDemographicsModal } from './EditDemographicsModal';
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

// Friendly labels for the active-filter chip strip
const FILTER_LABELS: Partial<Record<keyof SearchFilter, string>> = {
  cardNumber: 'Member ID',
  firstName: 'First',
  lastName: 'Last',
  ssnLast4: 'SSN',
  employerName: 'Employer',
  subgroupName: 'Subgroup',
  planName: 'Plan',
  planCode: 'Plan code',
  dob: 'DOB',
  effectiveDateFrom: 'Eff ≥',
  effectiveDateTo: 'Eff ≤',
  terminationDateFrom: 'Term ≥',
  terminationDateTo: 'Term ≤',
  memberType: 'Type',
  status: 'Status',
};

export function Grid() {
  const [filter, setFilter] = useState<SearchFilter>({});
  const [statusChips, setStatusChips] = useState<string[]>(['active', 'pending']);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<keyof Enrollment, string>>>({});
  const [openColFilter, setOpenColFilter] = useState<string | null>(null);
  const [quickQuery, setQuickQuery] = useState('');
  const debouncedQ = useDebounce(quickQuery, 250);
  const [cursor, setCursor] = useState<string | null>(null);
  const [serverSort] = useState<SortOrder>('effective_date_desc');
  const [clientSort, setClientSort] = useState<ClientSort>(null);
  const [pageSize, setPageSize] = useLocalStorage<number>('bff.grid.pageSize', 10);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);
  const [terminateRow, setTerminateRow] = useState<Enrollment | null>(null);
  const [editRow, setEditRow] = useState<Enrollment | null>(null);
  const [editDetailsRow, setEditDetailsRow] = useState<Enrollment | null>(null);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const colsMenuRef = useClickOutside<HTMLDivElement>(colsMenuOpen, () => setColsMenuOpen(false));
  const [visible, setVisible] = useLocalStorage<ColumnKey[]>('bff.grid.columns', DEFAULT_VISIBLE);
  const [density, setDensity] = useLocalStorage<'comfortable' | 'compact'>(
    'bff.grid.density',
    'comfortable',
  );

  const effectiveFilter: SearchFilter = useMemo(
    () => ({ ...filter, q: debouncedQ || filter.q || null }),
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

  const removeFilter = (key: keyof SearchFilter) =>
    setFilter((prev) => {
      const { [key]: _drop, ...rest } = prev;
      return rest;
    });

  const visibleCols = ALL_COLUMNS.filter((c) => visible.includes(c.key));

  // Active-filter chips (from the AdvancedSearchModal output)
  const activeFilters = (Object.entries(filter) as [keyof SearchFilter, unknown][])
    .filter(([k, v]) => v !== undefined && v !== null && v !== '' && FILTER_LABELS[k]);

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
          placeholder="🔍  Search by Member Name, Member ID Card…"
          value={quickQuery}
          onChange={(e) => {
            setQuickQuery(e.target.value);
            setCursor(null);
          }}
        />
        <Button onClick={() => setAdvancedOpen(true)}>▾ Advanced Search</Button>
        <SavedViews currentFilter={filter} onApply={applyFilter} />
        <div className={styles.spacer} />
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          + Add New Member
        </Button>
        <div className={styles.densityWrap}>
          <button
            type="button"
            className={styles.iconBtn}
            title={density === 'comfortable' ? 'Switch to compact' : 'Switch to comfortable'}
            onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
          >
            {density === 'comfortable' ? '☰' : '≡'}
          </button>
        </div>
        <div className={styles.colMenu} ref={colsMenuRef}>
          <button
            type="button"
            className={styles.colMenuTrigger}
            onClick={() => setColsMenuOpen(!colsMenuOpen)}
            aria-haspopup="menu"
            aria-expanded={colsMenuOpen}
          >
            Columns ▾
          </button>
          {colsMenuOpen && (
            <ul role="menu">
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
          )}
        </div>
      </div>

      {/* ── Active filter chips (from Advanced Search) ────── */}
      {activeFilters.length > 0 && (
        <div className={styles.activeFilters}>
          <span className={styles.activeFiltersLabel}>Filters:</span>
          {activeFilters.map(([k, v]) => (
            <span key={String(k)} className={styles.activeFilterChip}>
              <strong>{FILTER_LABELS[k]}</strong>: {String(v)}
              <button
                type="button"
                aria-label={`Remove ${FILTER_LABELS[k]}`}
                className={styles.chipX}
                onClick={() => removeFilter(k)}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className={styles.clearAll}
            onClick={() => setFilter({})}
          >
            Clear all
          </button>
        </div>
      )}

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
                  <div className={styles.thInline}>
                    <span className={styles.thLabel}>{c.label}</span>
                    {c.sortable && (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Sort by ${c.label}`}
                        onClick={() => cycleSort(c.key as keyof Enrollment)}
                        title="Sort"
                      >
                        {clientSort?.key === c.key
                          ? clientSort.dir === 'asc'
                            ? '↑'
                            : '↓'
                          : '⇅'}
                      </button>
                    )}
                    {c.filterable && (
                      <ColumnFilterTrigger
                        colKey={String(c.key)}
                        value={columnFilters[c.key as keyof Enrollment] ?? ''}
                        options={c.options}
                        type={c.filterable}
                        open={openColFilter === String(c.key)}
                        onOpen={(k) => setOpenColFilter(openColFilter === k ? null : k)}
                        onClose={() => setOpenColFilter(null)}
                        onChange={(v) =>
                          setColumnFilters((prev) => ({ ...prev, [c.key]: v }))
                        }
                        active={!!columnFilters[c.key as keyof Enrollment]}
                      />
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
                  <td key={String(c.key)}>{renderCell(row, c.key, setDrawerMemberId, actionsFor, setActionsFor, setTerminateRow, setEditRow, setEditDetailsRow)}</td>
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
            className={styles.pageSizeSelect}
          >
            <option value={10}>10 / page</option>
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

      {addOpen && <AddMemberModal onClose={() => setAddOpen(false)} />}

      {terminateRow && (
        <TerminateModal row={terminateRow} onClose={() => setTerminateRow(null)} />
      )}

      {editRow && <EditEnrollmentModal row={editRow} onClose={() => setEditRow(null)} />}

      {editDetailsRow && (
        <EditDemographicsModal row={editDetailsRow} onClose={() => setEditDetailsRow(null)} />
      )}

      {drawerMemberId && (
        <MemberDetail memberId={drawerMemberId} onClose={() => setDrawerMemberId(null)} />
      )}
    </div>
  );
}

interface ColFilterProps {
  colKey: string;
  value: string;
  options?: string[];
  type: 'text' | 'select';
  open: boolean;
  active: boolean;
  onOpen: (k: string) => void;
  onClose: () => void;
  onChange: (v: string) => void;
}

function ColumnFilterTrigger({ colKey, value, options, type, open, active, onOpen, onClose, onChange }: ColFilterProps) {
  const handleOutside = useCallback(() => onClose(), [onClose]);
  const wrapRef = useClickOutside<HTMLDivElement>(open, handleOutside);
  return (
    <div className={styles.filterWrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.iconBtn} ${active ? styles.iconBtnActive : ''}`}
        title="Filter"
        onClick={() => onOpen(colKey)}
        aria-label={`Filter ${colKey}`}
      >
        ⌕
      </button>
      {open && (
        <div className={styles.filterPopover} onClick={(e) => e.stopPropagation()}>
          {type === 'select' && options ? (
            <select
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={styles.filterSelect}
            >
              {options.map((o) => (
                <option key={o} value={o}>{o || '(any)'}</option>
              ))}
            </select>
          ) : (
            <input
              autoFocus
              type="search"
              placeholder="Type to filter…"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={styles.filterInput}
            />
          )}
          {value && (
            <button type="button" className={styles.filterClear} onClick={() => onChange('')}>
              clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ActionsCell({
  row,
  openDrawer,
  actionsFor,
  setActionsFor,
  onTerminate,
  onEdit,
  onEditDetails,
}: {
  row: Enrollment;
  openDrawer: (memberId: string) => void;
  actionsFor: string | null;
  setActionsFor: (id: string | null) => void;
  onTerminate: (row: Enrollment) => void;
  onEdit: (row: Enrollment) => void;
  onEditDetails: (row: Enrollment) => void;
}) {
  const open = actionsFor === row.enrollmentId;
  const handleClose = useCallback(() => setActionsFor(null), [setActionsFor]);
  const ref = useClickOutside<HTMLDivElement>(open, handleClose);
  const isTermed = row.status === 'termed';
  return (
    <div style={{ position: 'relative' }} ref={ref}>
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
        <div className={cellStyles.actionMenu} role="menu">
          <button type="button" onClick={() => { openDrawer(row.memberId); setActionsFor(null); }}>
            View timeline
          </button>
          <button
            type="button"
            disabled={isTermed}
            title={isTermed ? 'Already terminated' : 'Terminate this enrollment'}
            onClick={() => { onTerminate(row); setActionsFor(null); }}
          >
            Terminate
          </button>
          <button
            type="button"
            disabled={isTermed}
            title={isTermed ? 'Cannot edit a terminated enrollment' : 'Change plan'}
            onClick={() => { onEdit(row); setActionsFor(null); }}
          >
            Change plan
          </button>
          <button
            type="button"
            title="Edit member name, DOB, gender"
            onClick={() => { onEditDetails(row); setActionsFor(null); }}
          >
            Edit details
          </button>
        </div>
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
  onTerminate: (row: Enrollment) => void,
  onEdit: (row: Enrollment) => void,
  onEditDetails: (row: Enrollment) => void,
): React.ReactNode {
  if (key === 'actions') {
    return (
      <ActionsCell
        row={row}
        openDrawer={openDrawer}
        actionsFor={actionsFor}
        setActionsFor={setActionsFor}
        onTerminate={onTerminate}
        onEdit={onEdit}
        onEditDetails={onEditDetails}
      />
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
  if (key === 'terminationDate' && v === '9999-12-31') return '—';
  return String(v);
}

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
