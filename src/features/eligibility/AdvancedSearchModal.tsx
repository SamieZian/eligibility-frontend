import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SearchFilter } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { employers } from '../../api/bff';
import styles from './AdvancedSearchModal.module.css';

interface Props {
  initial: SearchFilter;
  onClose: () => void;
  onApply: (f: SearchFilter) => void;
}

export function AdvancedSearchModal({ initial, onClose, onApply }: Props) {
  const [f, setF] = useState<SearchFilter>(initial);

  function update<K extends keyof SearchFilter>(key: K, value: SearchFilter[K]) {
    setF((p) => ({ ...p, [key]: value === '' ? null : value }));
  }

  // Pull employer list for the Group dropdown.
  const { data: employerList } = useQuery({
    queryKey: ['employers', f.employerName ?? ''],
    queryFn: () => employers(f.employerName ?? ''),
  });

  return (
    <Modal open onClose={onClose} title="Advanced Search" size="lg">
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          onApply(f);
        }}
      >
        <Section title="Member">
          <Field label="Member ID Card">
            <input value={f.cardNumber ?? ''} onChange={(e) => update('cardNumber', e.target.value)} placeholder="e.g. 123456789" />
          </Field>
          <Field label="First Name">
            <input value={f.firstName ?? ''} onChange={(e) => update('firstName', e.target.value)} placeholder="First name" />
          </Field>
          <Field label="Last Name">
            <input value={f.lastName ?? ''} onChange={(e) => update('lastName', e.target.value)} placeholder="Last name" />
          </Field>
          <Field label="SSN (last 4)">
            <input
              maxLength={4}
              inputMode="numeric"
              value={f.ssnLast4 ?? ''}
              onChange={(e) => update('ssnLast4', e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
            />
          </Field>
          <Field label="Date of Birth">
            <input type="date" value={f.dob ?? ''} onChange={(e) => update('dob', e.target.value)} />
          </Field>
          <Field label="Member Type">
            <select value={f.memberType ?? ''} onChange={(e) => update('memberType', e.target.value)}>
              <option value="">Any</option>
              <option value="subscriber">Subscriber</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="dependent">Dependent</option>
            </select>
          </Field>
        </Section>

        <Section title="Group / Plan">
          <Field label="Group (Employer)">
            <input
              list="adv-employers"
              value={f.employerName ?? ''}
              onChange={(e) => update('employerName', e.target.value)}
              placeholder="Type or pick…"
            />
            <datalist id="adv-employers">
              {(employerList ?? []).map((e) => (
                <option key={e.id} value={e.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Subgroup">
            <input
              value={f.subgroupName ?? ''}
              onChange={(e) => update('subgroupName', e.target.value)}
              placeholder="e.g. SWIGGY-A"
            />
          </Field>
          <Field label="Plan Name">
            <input value={f.planName ?? ''} onChange={(e) => update('planName', e.target.value)} placeholder="e.g. Gold Health" />
          </Field>
          <Field label="Plan Code">
            <input value={f.planCode ?? ''} onChange={(e) => update('planCode', e.target.value)} placeholder="e.g. PLAN-GOLD" />
          </Field>
          <Field label="Status">
            <select value={f.status ?? ''} onChange={(e) => update('status', e.target.value)}>
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="termed">Terminated</option>
              <option value="pending">Pending</option>
            </select>
          </Field>
        </Section>

        <Section title="Coverage dates">
          <Field label="Effective From">
            <input
              type="date"
              value={f.effectiveDateFrom ?? ''}
              onChange={(e) => update('effectiveDateFrom', e.target.value)}
            />
          </Field>
          <Field label="Effective To">
            <input
              type="date"
              value={f.effectiveDateTo ?? ''}
              onChange={(e) => update('effectiveDateTo', e.target.value)}
            />
          </Field>
          <Field label="Termination From">
            <input
              type="date"
              value={f.terminationDateFrom ?? ''}
              onChange={(e) => update('terminationDateFrom', e.target.value)}
            />
          </Field>
          <Field label="Termination To">
            <input
              type="date"
              value={f.terminationDateTo ?? ''}
              onChange={(e) => update('terminationDateTo', e.target.value)}
            />
          </Field>
        </Section>

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={() => setF({})}>
            Clear all
          </Button>
          <div style={{ flex: 1 }} />
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Apply filters
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.grid}>{children}</div>
    </section>
  );
}

// Suppress unused import
void useEffect;
