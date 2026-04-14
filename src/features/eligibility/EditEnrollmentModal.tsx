import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Enrollment } from '../../api/types';
import { changeEnrollmentPlan, plans } from '../../api/bff';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import styles from './EditEnrollmentModal.module.css';

interface Props {
  row: Enrollment;
  onClose: () => void;
}

export function EditEnrollmentModal({ row, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const [newPlanId, setNewPlanId] = useState<string>('');
  const today = new Date().toISOString().slice(0, 10);
  const [newValidFrom, setNewValidFrom] = useState(today);

  const { data: planList } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plans(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      changeEnrollmentPlan({
        memberId: row.memberId,
        oldPlanId: row.planId,
        newPlanId,
        employerId: row.employerId,
        newValidFrom,
        relationship: row.relationship || 'subscriber',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['search'] });
      qc.invalidateQueries({ queryKey: ['timeline', row.memberId] });
      const newPlan = planList?.find((p) => p.id === newPlanId)?.name ?? 'new plan';
      toast.success(
        'Plan changed',
        `${row.memberName} → ${newPlan} from ${newValidFrom}`,
      );
      onClose();
    },
    onError: (e) => toast.error('Plan change failed', (e as Error).message),
  });

  const otherPlans = (planList ?? []).filter((p) => p.id !== row.planId);
  const isValid = !!newPlanId && !!newValidFrom && newPlanId !== row.planId;

  return (
    <Modal open onClose={onClose} title="Change Plan" size="md">
      <div className={styles.body}>
        <div className={styles.summary}>
          <div className={styles.label}>Member</div>
          <div className={styles.value}>{row.memberName}</div>
          <div className={styles.label}>Employer</div>
          <div className={styles.value}>{row.employerName ?? '—'}</div>
          <div className={styles.label}>Current plan</div>
          <div className={styles.value}>
            <span className={styles.chip}>{row.planName ?? '—'}</span>
          </div>
          <div className={styles.label}>Current effective</div>
          <div className={styles.value}>{row.effectiveDate}</div>
        </div>

        <div className={styles.fields}>
          <label className={styles.field}>
            <span>New plan *</span>
            <select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)}>
              <option value="">— Select —</option>
              {otherPlans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.planCode})</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>New plan effective from *</span>
            <input
              type="date"
              value={newValidFrom}
              onChange={(e) => setNewValidFrom(e.target.value)}
            />
          </label>
        </div>

        <div className={styles.info}>
          Coverage on the current plan ends the day before the new effective date. Past
          enrollment history stays visible in the member's timeline.
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
          >
            {mutation.isPending ? 'Changing…' : 'Change Plan'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
