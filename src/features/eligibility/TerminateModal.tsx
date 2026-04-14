import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Enrollment } from '../../api/types';
import { terminateEnrollment } from '../../api/bff';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import styles from './TerminateModal.module.css';

interface Props {
  row: Enrollment;
  onClose: () => void;
}

export function TerminateModal({ row, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [validTo, setValidTo] = useState(today);

  const mutation = useMutation({
    mutationFn: () => terminateEnrollment(row.memberId, row.planId, validTo),
    onSuccess: (eids) => {
      qc.invalidateQueries({ queryKey: ['search'] });
      qc.invalidateQueries({ queryKey: ['timeline', row.memberId] });
      toast.success(
        'Enrollment terminated',
        `${row.memberName} · ${row.planName ?? 'plan'} ends ${validTo} (${eids.length} segment${eids.length === 1 ? '' : 's'} closed)`,
      );
      onClose();
    },
    onError: (e) => toast.error('Termination failed', (e as Error).message),
  });

  return (
    <Modal open onClose={onClose} title="Terminate Enrollment" size="md">
      <div className={styles.body}>
        <div className={styles.summary}>
          <div className={styles.label}>Member</div>
          <div className={styles.value}>{row.memberName}</div>
          <div className={styles.label}>Card #</div>
          <div className={styles.value}>{row.cardNumber ?? '—'}</div>
          <div className={styles.label}>Employer</div>
          <div className={styles.value}>{row.employerName ?? '—'}</div>
          <div className={styles.label}>Plan</div>
          <div className={styles.value}>{row.planName ?? '—'}</div>
          <div className={styles.label}>Effective</div>
          <div className={styles.value}>{row.effectiveDate}</div>
          <div className={styles.label}>Status</div>
          <div className={styles.value}>{row.status}</div>
        </div>

        <label className={styles.field}>
          <span>Termination date *</span>
          <input
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            min="2020-01-01"
          />
        </label>

        <div className={styles.warning}>
          ⚠ This will close the in-force enrollment and write a TERMED segment via atlas
          <code>POST /commands</code>. The bitemporal timeline preserves the original ACTIVE row
          (txn_to is set, not deleted) so audit history stays intact.
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Terminating…' : 'Terminate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
