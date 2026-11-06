import { FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { invokeManageUsers, USER_ROLE_OPTIONS } from '@/lib/manageUsers';
import type { AccountStatus, ManagedUser, UserRole } from '@/types/database';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

interface UserFormModalProps {
  user: ManagedUser | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface UserFormState {
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  phoneNumber: string;
  accountStatus: AccountStatus;
  password: string;
  confirmPassword: string;
}

export function UserFormModal({ user, onClose, onSaved }: UserFormModalProps) {
  const [form, setForm] = useState<UserFormState>(() => ({
    fullName: user?.fullName ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'receptionist',
    department: user?.department ?? '',
    phoneNumber: user?.phoneNumber ?? '',
    accountStatus: user?.accountStatus ?? 'active',
    password: '',
    confirmPassword: '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = user !== null;

  function update<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): string | null {
    if (isEdit) return null;
    if (!USERNAME_PATTERN.test(form.username.trim().toLowerCase())) return 'Usernames use 3 to 32 lowercase letters, numbers, dots, dashes, or underscores.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'The passwords do not match.';
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    const shared = {
      fullName: form.fullName.trim(),
      role: form.role,
      department: form.department.trim(),
      phoneNumber: form.phoneNumber.trim(),
      accountStatus: form.accountStatus,
    };
    const { error: saveError } = await invokeManageUsers(isEdit
      ? { action: 'update', userId: user.id, ...shared }
      : { action: 'create', ...shared, username: form.username.trim().toLowerCase(), email: form.email.trim().toLowerCase(), password: form.password });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    onSaved(isEdit ? 'User details updated.' : 'User account created. They can sign in now with their username and password.');
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit user' : 'Add new user'}
      subtitle={isEdit ? 'Update role, department, contact details, and account status.' : 'Create a login account for a hospital team member.'}
      footer={<>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="user-form" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create user'}</Button>
      </>}
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} placeholder="e.g. Dr. Anita Rao" />
          </Field>
          <Field label="Username" required>
            <Input required disabled={isEdit} value={form.username} onChange={(event) => update('username', event.target.value)} placeholder="e.g. anita.rao" autoComplete="off" />
            <span className="mt-1 block text-xs text-slate-500">{isEdit ? 'Usernames cannot be changed.' : 'Used to sign in. Lowercase letters, numbers, dots, dashes, or underscores.'}</span>
          </Field>
          <Field label="Email address" required>
            <Input required disabled={isEdit} type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@medicorehospital.com" />
            {isEdit && <span className="mt-1 block text-xs text-slate-500">Email addresses cannot be changed here.</span>}
          </Field>
          <Field label="Role" required>
            <Select required value={form.role} onChange={(event) => update('role', event.target.value as UserRole)}>
              {USER_ROLE_OPTIONS.map(([role, label]) => <option key={role} value={role}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Department">
            <Input value={form.department} onChange={(event) => update('department', event.target.value)} placeholder="Optional, e.g. Cardiology" />
          </Field>
          <Field label="Phone number">
            <Input type="tel" value={form.phoneNumber} onChange={(event) => update('phoneNumber', event.target.value)} placeholder="Optional, e.g. +91 98765 43210" />
          </Field>
          <Field label="Account status" required>
            <Select required value={form.accountStatus} onChange={(event) => update('accountStatus', event.target.value as AccountStatus)}>
              <option value="active">Active</option>
              <option value="disabled">Inactive</option>
            </Select>
            <span className="mt-1 block text-xs text-slate-500">Inactive users cannot sign in.</span>
          </Field>
        </div>
        {!isEdit && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Password" required>
              <Input required type="password" autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 8 characters" />
            </Field>
            <Field label="Confirm password" required>
              <Input required type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} placeholder="Re-enter the password" />
            </Field>
          </div>
        )}
      </form>
    </Modal>
  );
}
