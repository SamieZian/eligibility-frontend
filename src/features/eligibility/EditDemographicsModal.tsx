import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Enrollment } from '../../api/types';
import { updateMemberDemographics } from '../../api/bff';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import styles from './EditDemographicsModal.module.css';

interface Props {
  row: Enrollment;
  onClose: () => void;
}

export function EditDemographicsModal({ row, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const [firstName, setFirstName] = useState(row.firstName ?? '');
  const [lastName, setLastName] = useState(row.lastName ?? '');
  const [dob, setDob] = useState(row.dob ?? '');
  const [gender, setGender] = useState(row.gender ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      updateMemberDemographics({
        memberId: row.memberId,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        dob: dob || null,
        gender: gender || null,
      }),
    onSuccess: (ok) => {
      if (!ok) {
        toast.error('Update failed', 'Member service rejected the change.');
        return;
      }
      qc.invalidateQueries({ queryKey: ['search'] });
      qc.invalidateQueries({ queryKey: ['timeline', row.memberId] });
      const newName = `${firstName.trim()} ${lastName.trim()}`.trim().toUpperCase();
      toast.success('Member updated', `${newName || row.memberName} details saved`);
      onClose();
    },
    onError: (e) => toast.error('Update failed', (e as Error).message),
  });

  const changed =
    firstName.trim() !== (row.firstName ?? '').trim() ||
    lastName.trim() !== (row.lastName ?? '').trim() ||
    dob !== (row.dob ?? '') ||
    gender !== (row.gender ?? '');

  return (
    <Modal open onClose={onClose} title="Edit Member Details" size="md">
      <div className={styles.body}>
        <div className={styles.summary}>
          <div className={styles.label}>Card #</div>
          <div className={styles.value}>{row.cardNumber ?? '—'}</div>
          <div className={styles.label}>Employer</div>
          <div className={styles.value}>{row.employerName ?? '—'}</div>
          <div className={styles.label}>Plan</div>
          <div className={styles.value}>{row.planName ?? '—'}</div>
          <div className={styles.label}>Relationship</div>
          <div className={styles.value}>{row.relationship ?? '—'}</div>
        </div>

        <div className={styles.fields}>
          <label className={styles.field}>
            <span>First name</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="PRIYA"
            />
          </label>
          <label className={styles.field}>
            <span>Last name</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="SHARMA"
            />
          </label>
          <label className={styles.field}>
            <span>Date of birth</span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Gender</span>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">— Unspecified —</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="U">Unknown</option>
            </select>
          </label>
        </div>

        <div className={styles.info}>
          ℹ Updates the authoritative member record in <code>member_db</code> and emits
          <code> MemberUpserted</code>. The projector fans the new name into
          <code> eligibility_view</code> so the grid refreshes within a few seconds.
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => mutation.mutate()}
            disabled={!changed || mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
