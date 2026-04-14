import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  attachPlan,
  createEmployer,
  createPayer,
  createSubgroup,
  deleteEmployer,
  deleteSubgroup,
  detachPlan,
  groupAdmin,
} from '../../api/bff';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import styles from './GroupsAdmin.module.css';

export function GroupsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['groupAdmin'],
    queryFn: groupAdmin,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['groupAdmin'] });

  const [newPayer, setNewPayer] = useState('');
  const [newEmployer, setNewEmployer] = useState({ payerId: '', name: '', externalId: '' });
  const [newSubgroup, setNewSubgroup] = useState<Record<string, string>>({});

  const payerMut = useMutation({ mutationFn: createPayer, onSuccess: refresh });
  const employerMut = useMutation({
    mutationFn: ({ payerId, name, externalId }: { payerId: string; name: string; externalId?: string }) =>
      createEmployer(payerId, name, externalId),
    onSuccess: refresh,
  });
  const deleteEmployerMut = useMutation({ mutationFn: deleteEmployer, onSuccess: refresh });
  const subgroupMut = useMutation({
    mutationFn: ({ employerId, name }: { employerId: string; name: string }) =>
      createSubgroup(employerId, name),
    onSuccess: refresh,
  });
  const deleteSubgroupMut = useMutation({ mutationFn: deleteSubgroup, onSuccess: refresh });
  const attachMut = useMutation({
    mutationFn: ({ employerId, planId }: { employerId: string; planId: string }) =>
      attachPlan(employerId, planId),
    onSuccess: refresh,
  });
  const detachMut = useMutation({
    mutationFn: ({ employerId, planId }: { employerId: string; planId: string }) =>
      detachPlan(employerId, planId),
    onSuccess: refresh,
  });

  if (isLoading) return <Spinner />;
  const payers = data?.payers ?? [];
  const plans = data?.plans ?? [];
  const groups = data?.groupAdmin ?? [];

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1>Groups & Subgroups</h1>
        <p className={styles.lead}>
          Manage payers, employer groups, subgroups, and which plans each employer can offer.
          Bonus task per the assignment.
        </p>
      </header>

      {/* ─── Payers ─────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2>Payers ({payers.length})</h2>
        <div className={styles.row}>
          <input
            placeholder="New payer name (e.g. United Healthcare)"
            value={newPayer}
            onChange={(e) => setNewPayer(e.target.value)}
            className={styles.input}
          />
          <Button
            variant="primary"
            disabled={!newPayer.trim() || payerMut.isPending}
            onClick={() => {
              payerMut.mutate(newPayer.trim());
              setNewPayer('');
            }}
          >
            + Add Payer
          </Button>
        </div>
        <ul className={styles.pillList}>
          {payers.map((p) => (
            <li key={p.id} className={styles.pill}>{p.name}</li>
          ))}
        </ul>
      </section>

      {/* ─── New Employer ──────────────────────────────────── */}
      <section className={styles.section}>
        <h2>Add Employer (Group)</h2>
        <div className={styles.row}>
          <select
            value={newEmployer.payerId}
            onChange={(e) => setNewEmployer({ ...newEmployer, payerId: e.target.value })}
            className={styles.input}
          >
            <option value="">— Select Payer —</option>
            {payers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            placeholder="Employer name (e.g. Swiggy)"
            value={newEmployer.name}
            onChange={(e) => setNewEmployer({ ...newEmployer, name: e.target.value })}
            className={styles.input}
          />
          <input
            placeholder="External ID (e.g. SWIGGY)"
            value={newEmployer.externalId}
            onChange={(e) => setNewEmployer({ ...newEmployer, externalId: e.target.value })}
            className={styles.input}
          />
          <Button
            variant="primary"
            disabled={!newEmployer.payerId || !newEmployer.name.trim() || employerMut.isPending}
            onClick={() => {
              employerMut.mutate({
                payerId: newEmployer.payerId,
                name: newEmployer.name.trim(),
                externalId: newEmployer.externalId.trim() || undefined,
              });
              setNewEmployer({ payerId: '', name: '', externalId: '' });
            }}
          >
            + Add Employer
          </Button>
        </div>
      </section>

      {/* ─── Group cards ───────────────────────────────────── */}
      <section className={styles.section}>
        <h2>Employer Groups ({groups.length})</h2>
        <div className={styles.cards}>
          {groups.map((g) => (
            <article key={g.id} className={styles.card}>
              <header className={styles.cardHead}>
                <div>
                  <h3>{g.name}</h3>
                  <span className={styles.meta}>
                    {g.payerName ?? '—'} · external id: <code>{g.externalId ?? '—'}</code>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete employer "${g.name}" and all its subgroups + visibility?`)) {
                      deleteEmployerMut.mutate(g.id);
                    }
                  }}
                >
                  🗑 Delete
                </Button>
              </header>

              <div className={styles.cardBody}>
                <div className={styles.col}>
                  <h4>Subgroups</h4>
                  <ul className={styles.subList}>
                    {g.subgroups.map((sg) => (
                      <li key={sg.id} className={styles.subItem}>
                        <span>{sg.name}</span>
                        <button
                          type="button"
                          aria-label={`Delete ${sg.name}`}
                          className={styles.subDel}
                          onClick={() => deleteSubgroupMut.mutate(sg.id)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                    {g.subgroups.length === 0 && <li className={styles.muted}>No subgroups</li>}
                  </ul>
                  <div className={styles.row}>
                    <input
                      placeholder="New subgroup (e.g. SWIGGY-C)"
                      value={newSubgroup[g.id] ?? ''}
                      onChange={(e) => setNewSubgroup({ ...newSubgroup, [g.id]: e.target.value })}
                      className={styles.input}
                    />
                    <Button
                      onClick={() => {
                        const name = (newSubgroup[g.id] ?? '').trim();
                        if (!name) return;
                        subgroupMut.mutate({ employerId: g.id, name });
                        setNewSubgroup({ ...newSubgroup, [g.id]: '' });
                      }}
                    >
                      + Add
                    </Button>
                  </div>
                </div>

                <div className={styles.col}>
                  <h4>Plan visibility</h4>
                  <ul className={styles.planList}>
                    {plans.map((p) => {
                      const attached = g.visiblePlanIds.includes(p.id);
                      return (
                        <li key={p.id} className={styles.planItem}>
                          <label className={styles.planLabel}>
                            <input
                              type="checkbox"
                              checked={attached}
                              onChange={() => {
                                if (attached) {
                                  detachMut.mutate({ employerId: g.id, planId: p.id });
                                } else {
                                  attachMut.mutate({ employerId: g.id, planId: p.id });
                                }
                              }}
                            />
                            <span>{p.name}</span>
                            <code>{p.planCode}</code>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </article>
          ))}
          {groups.length === 0 && (
            <div className={styles.empty}>No employer groups yet — add one above.</div>
          )}
        </div>
      </section>
    </div>
  );
}
