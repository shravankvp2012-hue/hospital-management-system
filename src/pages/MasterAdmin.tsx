import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Ban, Check, CheckCircle2, Copy, KeyRound, Plus, Search, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { EmptyState, FullPageSpinner } from '@/components/Feedback';
import { Field, Input, Select } from '@/components/Field';
import { Modal } from '@/components/Modal';

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  doctor_id: string | null;
  account_status: 'active' | 'disabled';
  must_change_password: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  created_at: string;
}

interface UserForm {
  fullName: string;
  email: string;
  role: Exclude<UserRole, 'master'>;
  password: string;
}

const ROLE_LABELS: Record<Exclude<UserRole, 'master'>, string> = {
  admin: 'Administrator',
  manager: 'Department manager',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  billing: 'Billing staff',
};

const EMPTY_FORM: UserForm = { fullName: '', email: '', role: 'receptionist', password: '' };

function formatLastSeen(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never signed in';
}

export function MasterAdmin() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Exclude<UserRole, 'master'>>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [credentialLabel, setCredentialLabel] = useState('');
  const [copied, setCopied] = useState(false);

  async function callManager(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const { data, error: functionError } = await supabase.functions.invoke('manage-users', { body });
    if (functionError || !data || typeof data !== 'object') {
      setError('Could not complete that account action. Please try again.');
      return null;
    }
    const result = data as Record<string, unknown>;
    if (typeof result.error === 'string') { setError(result.error); return null; }
    return result;
  }

  async function loadUsers() {
    setLoading(true);
    const result = await callManager({ action: 'list' });
    if (result && Array.isArray(result.users)) setUsers(result.users as ManagedUser[]);
    setLoading(false);
  }

  useEffect(() => { void loadUsers(); }, []);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesQuery = !normalized || `${user.full_name} ${user.email}`.toLowerCase().includes(normalized);
      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);

  function openCreate() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(user: ManagedUser) {
    if (user.role === 'master') return;
    setEditingUser(user);
    setForm({ fullName: user.full_name, email: user.email, role: user.role, password: '' });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const result = await callManager(editingUser ? {
      action: 'update', userId: editingUser.id, role: form.role, accountStatus: editingUser.account_status,
    } : {
      action: 'create', fullName: form.fullName, email: form.email, role: form.role, password: form.password || undefined,
    });
    if (result) {
      setModalOpen(false);
      await loadUsers();
      if (typeof result.temporaryPassword === 'string') {
        setCredentialLabel(editingUser ? 'New temporary password' : 'Temporary password');
        setTemporaryPassword(result.temporaryPassword);
        setCopied(false);
      }
    }
    setSaving(false);
  }

  async function toggleStatus(user: ManagedUser) {
    if (user.role === 'master') return;
    setError('');
    const result = await callManager({ action: 'update', userId: user.id, role: user.role, accountStatus: user.account_status === 'active' ? 'disabled' : 'active' });
    if (result) await loadUsers();
  }

  async function resetPassword(user: ManagedUser) {
    setError('');
    const result = await callManager({ action: 'reset_password', userId: user.id });
    if (result && typeof result.temporaryPassword === 'string') {
      setCredentialLabel('New temporary password');
      setTemporaryPassword(result.temporaryPassword);
      setCopied(false);
    }
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
  }

  const activeCount = users.filter((user) => user.account_status === 'active').length;
  const pendingCount = users.filter((user) => user.must_change_password).length;

  if (loading) return <FullPageSpinner label="Loading user administration..." />;

  return <div>
    <PageHeader title="Master administration" subtitle="Manage staff access, roles, and account credentials." actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />Create account</Button>} />
    {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/10"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">Total accounts</p><Users className="h-5 w-5 text-cyan-400" /></div><p className="mt-4 text-3xl font-bold">{users.length}</p><p className="mt-1 text-xs text-slate-400">Including your Master account</p></div><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">Active access</p><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div><p className="mt-4 text-3xl font-bold text-slate-900">{activeCount}</p><p className="mt-1 text-xs text-slate-500">Accounts ready to use</p></div><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">First sign-in pending</p><KeyRound className="h-5 w-5 text-amber-500" /></div><p className="mt-4 text-3xl font-bold text-slate-900">{pendingCount}</p><p className="mt-1 text-xs text-slate-500">Temporary password still active</p></div></div>
    <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" className="pl-10" /></div><Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)} className="sm:w-52"><option value="all">All roles</option>{Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</Select></div>
    {visibleUsers.length === 0 ? <EmptyState icon={<UserCog className="h-7 w-7" />} title="No accounts found" description="Create an account or adjust your search." action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Create account</Button>} /> : <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="hidden grid-cols-[minmax(0,1.5fr)_180px_150px_160px_120px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 lg:grid"><span>Team member</span><span>Role</span><span>Last sign-in</span><span>Status</span><span className="text-right">Actions</span></div><div className="divide-y divide-slate-100">{visibleUsers.map((user) => <div key={user.id} className="grid gap-4 px-5 py-5 transition-colors hover:bg-slate-50/60 lg:grid-cols-[minmax(0,1.5fr)_180px_150px_160px_120px] lg:items-center lg:px-6"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${user.role === 'master' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'}`}>{user.role === 'master' ? <ShieldCheck className="h-5 w-5" /> : user.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{user.full_name || 'Unnamed user'}{user.role === 'master' && <span className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">Master</span>}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">Role</p><p className="text-sm font-medium text-slate-700">{user.role === 'master' ? 'Master administrator' : ROLE_LABELS[user.role]}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">Last sign-in</p><p className="text-sm text-slate-600">{formatLastSeen(user.lastSignInAt)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">Status</p><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.account_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.account_status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{user.account_status === 'active' ? 'Active' : 'Disabled'}{user.must_change_password && <span className="ml-1 text-amber-600">· Setup pending</span>}</span></div><div className="flex items-center justify-start gap-1 lg:justify-end">{user.role !== 'master' && <><button onClick={() => openEdit(user)} className="rounded-lg p-2 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600" aria-label={`Edit ${user.full_name}`}><UserCog className="h-4 w-4" /></button><button onClick={() => void resetPassword(user)} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600" aria-label={`Reset password for ${user.full_name}`}><KeyRound className="h-4 w-4" /></button><button onClick={() => void toggleStatus(user)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`${user.account_status === 'active' ? 'Disable' : 'Enable'} ${user.full_name}`}>{user.account_status === 'active' ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}</button></>}</div></div>)}</div></div>}
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Edit account access' : 'Create staff account'} subtitle={editingUser ? 'Update this team member’s role and access.' : 'Create credentials for a new member of the hospital team.'} footer={<><Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" form="user-form" disabled={saving}>{saving ? 'Saving...' : editingUser ? 'Save changes' : 'Create account'}</Button></>}><form id="user-form" onSubmit={handleSubmit} className="space-y-5"><Field label="Full name" required><Input required disabled={Boolean(editingUser)} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="e.g. Dr. Anita Rao" /></Field><Field label="Email address" required><Input required disabled={Boolean(editingUser)} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@medicorehospital.com" /></Field><Field label="Role" required><Select required value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserForm['role'] })}>{Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</Select></Field>{!editingUser && <Field label="Temporary password"><Input type="text" minLength={10} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Optional · at least 10 characters" /><span className="mt-1 block text-xs text-slate-500">Leave blank to generate a secure one-time password.</span></Field>}</form></Modal>
    <Modal open={Boolean(temporaryPassword)} onClose={() => setTemporaryPassword('')} title="Account credentials ready" subtitle="Copy this temporary password and share it with the team member securely." footer={<Button type="button" onClick={() => setTemporaryPassword('')}>Done</Button>}><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><KeyRound className="h-4 w-4" />{credentialLabel}</div><div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-amber-200"><code className="min-w-0 flex-1 break-all text-sm font-bold tracking-wide text-slate-900">{temporaryPassword}</code><button type="button" onClick={() => void copyPassword()} className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}</button></div><p className="mt-3 text-xs leading-5 text-amber-800">This password will not be shown again. The team member will be required to choose a private password after signing in.</p></div></Modal>
  </div>;
}
