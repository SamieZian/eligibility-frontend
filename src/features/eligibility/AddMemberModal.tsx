import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { addMember, employers, plans } from '../../api/bff';
import type { AddMemberInput } from '../../api/types';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import styles from './AddMemberModal.module.css';

interface Props {
  onClose: () => void;
}

const SUBGROUPS_BY_EMPLOYER: Record<string, string[]> = {
  Swiggy: ['SWIGGY-A', 'SWIGGY-B'],
  Zomato: ['ZOMATO-A', 'ZOMATO-B'],
};

export function AddMemberModal({ onClose }: Props) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<Partial<AddMemberInput>>({
    relationship: 'subscriber',
    effectiveDate: today,
    gender: 'M',
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Pull employers (groups) for the dropdown
  const { data: employerList } = useQuery({
    queryKey: ['employers', ''],
    queryFn: () => employers(''),
  });

  // Pull plan catalog for the dropdown
  const { data: planList } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plans(),
  });

  const mutation = useMutation({
    mutationFn: addMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['search'] });
      onClose();
    },
  });

  function update<K extends keyof AddMemberInput>(key: K, value: AddMemberInput[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function validate(): AddMemberInput | null {
    const e: string[] = [];
    if (!form.firstName?.trim()) e.push('First name is required');
    if (!form.lastName?.trim()) e.push('Last name is required');
    if (!form.dob) e.push('Date of birth is required');
    if (!form.employerId) e.push('Employer is required');
    if (!form.planId) e.push('Plan is required');
    if (!form.effectiveDate) e.push('Effective date is required');
    if (form.ssnLast4 && !/^\d{4}$/.test(form.ssnLast4)) {
      e.push('SSN must be exactly 4 digits');
    }
    setErrors(e);
    if (e.length) return null;
    return form as AddMemberInput;
  }

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const valid = validate();
    if (valid) mutation.mutate(valid);
  };

  const employerName =
    (employerList ?? []).find((emp) => emp.id === form.employerId)?.name ?? '';
  const subgroups = SUBGROUPS_BY_EMPLOYER[employerName] ?? [];

  return (
    <Modal open onClose={onClose} title="Add New Member" size="lg">
      <form className={styles.form} onSubmit={onSubmit}>
        <Section title="Member">
          <Field label="First Name *">
            <input
              autoFocus
              value={form.firstName ?? ''}
              onChange={(e) => update('firstName', e.target.value)}
              placeholder="Priya"
            />
          </Field>
          <Field label="Last Name *">
            <input
              value={form.lastName ?? ''}
              onChange={(e) => update('lastName', e.target.value)}
              placeholder="Sharma"
            />
          </Field>
          <Field label="Date of Birth *">
            <input
              type="date"
              value={form.dob ?? ''}
              onChange={(e) => update('dob', e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <select value={form.gender ?? ''} onChange={(e) => update('gender', e.target.value)}>
              <option value="">—</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </Field>
          <Field label="Member ID Card Number">
            <input
              value={form.cardNumber ?? ''}
              onChange={(e) => update('cardNumber', e.target.value)}
              placeholder="auto-assigned if empty"
            />
          </Field>
          <Field label="SSN (last 4)">
            <input
              maxLength={4}
              inputMode="numeric"
              value={form.ssnLast4 ?? ''}
              onChange={(e) => update('ssnLast4', e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
            />
          </Field>
          <Field label="Member Type">
            <select
              value={form.relationship ?? 'subscriber'}
              onChange={(e) => update('relationship', e.target.value)}
            >
              <option value="subscriber">Subscriber</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="dependent">Other dependent</option>
            </select>
          </Field>
        </Section>

        <Section title="Coverage">
          <Field label="Employer (Group) *">
            <select
              value={form.employerId ?? ''}
              onChange={(e) => update('employerId', e.target.value)}
            >
              <option value="">— Select —</option>
              {(employerList ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Subgroup">
            <select
              value={form.subgroupName ?? ''}
              onChange={(e) => update('subgroupName', e.target.value)}
              disabled={!subgroups.length}
            >
              <option value="">{subgroups.length ? '— Select —' : 'Pick employer first'}</option>
              {subgroups.map((sg) => (
                <option key={sg} value={sg}>{sg}</option>
              ))}
            </select>
          </Field>
          <Field label="Plan *">
            <select
              value={form.planId ?? ''}
              onChange={(e) => update('planId', e.target.value)}
            >
              <option value="">— Select —</option>
              {(planList ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.planCode})</option>
              ))}
            </select>
          </Field>
          <Field label="Effective Date *">
            <input
              type="date"
              value={form.effectiveDate ?? ''}
              onChange={(e) => update('effectiveDate', e.target.value)}
            />
          </Field>
        </Section>

        {errors.length > 0 && (
          <ul className={styles.errors} role="alert">
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}
        {mutation.isError && (
          <div className={styles.errors} role="alert">
            {(mutation.error as Error).message}
          </div>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={() => setForm({ relationship: 'subscriber', effectiveDate: today })}>
            Reset
          </Button>
          <div style={{ flex: 1 }} />
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Member + Enrollment'}
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
