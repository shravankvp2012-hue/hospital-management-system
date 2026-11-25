import { useEffect, useMemo, useState } from 'react';
import { Ban, Check, CheckCircle2, Copy, KeyRound, Plus, Search, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import { invokeManageUsers, USER_ROLE_OPTIONS } from '@/lib/manageUsers';
import type { AccountStatus, ManagedUser, UserRole } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { EmptyState, FullPageSpinner } from '@/components/Feedback';
import { Input, Select } from '@/components/Field';
import { UserFormModal } from '@/components/UserFormModal';
import { Modal } from '@/components/Modal';

const MANAGED_ROLES = USER_ROLE_OPTIONS.filter(([role]) => role !== 'master') as [Exclude<UserRole, 'master'>, string][];

export function MasterAdmin() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Exclude<UserRole, 'master'>>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [credentialLabel, setCredentialLabel] = useState('');
  const [copied, setCopied] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const { data, error: listError } = await invokeManageUsers<{ users: ManagedUser[] }>({ action: 'list' });
    if (listError) setError(listError);
    else if (data?.users) setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => { void loadUsers(); }, []);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesQuery = !normalized || `${user.fullName} ${user.username} ${user.email}`.toLowerCase().includes(normalized);
      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);

  function openCreate() {
    setEditingUser(null);
    setError('');
    setFormOpen(true);
  }

  function openEdit(user: ManagedUser) {
    if (user.role === 'master') return;
    setEditingUser(user);
    setError('');
    setFormOpen(true);
  }

  function handleSaved(message: string) {
    setFormOpen(false);
    setEditingUser(null);
    void loadUsers();
    setError('');
    setNoticeText(message);
  }

  async function toggleStatus(user: ManagedUser) {
    if (user.role === 'master') return;
    setError('');
    const nextStatus: AccountStatus = user.accountStatus === 'active' ? 'disabled' : 'active';
    const { error: updateError } = await invokeManageUsers({
      action: 'update', userId: user.id, fullName: user.fullName, role: user.role,
      department: user.department ?? '', phoneNumber: user.phoneNumber ?? '', accountStatus: nextStatus,
    });
    if (updateError) setError(updateError);
    else await loadUsers();
  }

  async function resetPassword(user: ManagedUser) {
    setError('');
    const { data, error: resetError } = await invokeManageUsers<{ temporaryPassword: string }>({ action: 'reset_password', userId: user.id });
    if (resetError) setError(resetError);
    else if (data?.temporaryPassword) {
      setCredentialLabel('New temporary password');
      setTemporaryPassword(data.temporaryPassword);
      setCopied(false);
    }
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
  }

  const activeCount = users.filter((user) => user.accountStatus === 'active').length;
  const pendingCount = users.filter((user) => user.mustChangePassword).length;

  if (loading) return <FullPageSpinner label="Loading user administration..." />;

  return <div>
    <PageHeader title="Master administration" subtitle="Manage staff access, roles, and account credentials." actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />Create account</Button>} />
    {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
    {noticeText && <div role="status" className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><span>{noticeText}</span><button onClick={() => setNoticeText('')} aria-label="Dismiss notice"><X className="h-4 w-4" /></button></div>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/10"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">Total accounts</p><Users className="h-5 w-5 text-cyan-400" /></div><p className="mt-4 text-3xl font-bold">{users.length}</p><p className="mt-1 text-xs text-slate-400">Including your Master account</p></div><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">Active access</p><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div><p className="mt-4 text-3xl font-bold text-slate-900">{activeCount}</p><p className="mt-1 text-xs text-slate-500">Accounts ready to use</p></div><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">First sign-in pending</p><KeyRound className="h-5 w-5 text-amber-500" /></div><p className="mt-4 text-3xl font-bold text-slate-900">{pendingCount}</p><p className="mt-1 text-xs text-slate-500">Temporary password still active</p></div></div>
    <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, username, or email" className="pl-10" /></div><Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)} className="sm:w-52"><option value="all">All roles</option>{MANAGED_ROLES.map(([role, label]) => <option key={role} value={role}>{label}</option>)}</Select></div>
    {visibleUsers.length === 0 ? <EmptyState icon={<UserCog className="h-7 w-7" />} title="No accounts found" description="Create an account or adjust your search." action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Create account</Button>} /> : <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="hidden grid-cols-[minmax(0,1.5fr)_180px_150px_160px_120px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 lg:grid"><span>Team member</span><span>Role</span><span>Last sign-in</span><span>Status</span><span className="text-right">Actions</span></div><div className="divide-y divide-slate-100">{visibleUsers.map((user) => <div key={user.id} className="grid gap-4 px-5 py-5 transition-colors hover:bg-slate-50/60 lg:grid-cols-[minmax(0,1.5fr)_180px_150px_160px_120px] lg:items-center lg:px-6"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${user.role === 'master' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'}`}>{user.role === 'master' ? <ShieldCheck className="h-5 w-5" /> : user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{user.fullName || 'Unnamed user'}{user.role === 'master' && <span className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">Master</span>}</p><p className="truncate text-xs text-slate-500">{user.username} · {user.email}</p></div></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">Role</p><p className="text-sm font-medium text-slate-700">{MANAGED_ROLES.find(([role]) => role === user.role)?.[1] ?? 'Master administrator'}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">Last sign-in</p><p className="text-sm text-slate-600">{formatLastSeen(user.lastSignInAt)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">Status</p><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.accountStatus === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.accountStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{user.accountStatus === 'active' ? 'Active' : 'Disabled'}{user.mustChangePassword && <span className="ml-1 text-amber-600">· Setup pending</span>}</span></div><div className="flex items-center justify-start gap-1 lg:justify-end">{user.role !== 'master' && <><button onClick={() => openEdit(user)} className="rounded-lg p-2 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600" aria-label={`Edit ${user.fullName}`}><UserCog className="h-4 w-4" /></button><button onClick={() => void resetPassword(user)} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600" aria-label={`Reset password for ${user.fullName}`}><KeyRound className="h-4 w-4" /></button><button onClick={() => void toggleStatus(user)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`${user.accountStatus === 'active' ? 'Disable' : 'Enable'} ${user.fullName}`}>{user.accountStatus === 'active' ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}</button></>}</div></div>)}</div></div>}
    {formOpen && <UserFormModal user={editingUser} onClose={() => { setFormOpen(false); setEditingUser(null); }} onSaved={handleSaved} />}
    <Modal open={Boolean(temporaryPassword)} onClose={() => setTemporaryPassword('')} title="Account credentials ready" subtitle="Copy this temporary password and share it with the team member securely." footer={<Button type="button" onClick={() => setTemporaryPassword('')}>Done</Button>}><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><KeyRound className="h-4 w-4" />{credentialLabel}</div><div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-amber-200"><code className="min-w-0 flex-1 break-all text-sm font-bold tracking-wide text-slate-900">{temporaryPassword}</code><button type="button" onClick={() => void copyPassword()} className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}</button></div><p className="mt-3 text-xs leading-5 text-amber-800">This password will not be shown again. The team member will be required to choose a private password after signing in.</p></div></Modal>
  </div>;
}

function formatLastSeen(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never signed in';
}
