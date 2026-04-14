import { useState } from 'react';
import type { SearchFilter } from '../../api/types';
import { useLocalStorage } from '../../lib/useLocalStorage';
import { useClickOutside } from '../../lib/useClickOutside';
import { Button } from '../../components/Button';
import styles from './SavedViews.module.css';

interface Saved {
  name: string;
  filter: SearchFilter;
}

interface Props {
  currentFilter: SearchFilter;
  onApply: (f: SearchFilter) => void;
}

export function SavedViews({ currentFilter, onApply }: Props) {
  const [views, setViews] = useLocalStorage<Saved[]>('bff.views', []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  // Close on outside click + Escape
  const wrapRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setViews([...views.filter((v) => v.name !== trimmed), { name: trimmed, filter: currentFilter }]);
    setName('');
  }

  function remove(n: string) {
    setViews(views.filter((v) => v.name !== n));
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <Button variant="secondary" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        Saved Views{views.length ? ` (${views.length})` : ''} ▾
      </Button>
      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.row}>
            <input
              placeholder="Save current as…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  save();
                }
              }}
              className={styles.input}
            />
            <Button onClick={save} disabled={!name.trim()}>Save</Button>
          </div>
          <ul className={styles.list}>
            {views.map((v) => (
              <li key={v.name} className={styles.item}>
                <button
                  type="button"
                  className={styles.itemBtn}
                  onClick={() => {
                    onApply(v.filter);
                    setOpen(false);
                  }}
                >
                  {v.name}
                </button>
                <button
                  type="button"
                  onClick={() => remove(v.name)}
                  aria-label={`Delete ${v.name}`}
                  className={styles.deleteBtn}
                >
                  ×
                </button>
              </li>
            ))}
            {views.length === 0 && <li className={styles.empty}>No saved views yet</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
