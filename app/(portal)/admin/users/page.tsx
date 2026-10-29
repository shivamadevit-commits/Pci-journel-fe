'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { MailPlus, MoreHorizontal, UserPlus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { ROLE_LABELS, type Role } from '@/lib/constants/roles';
import { formatDate, formatDateTime } from '@/lib/format';
import { emailSchema } from '@/lib/schemas/auth';
import { useMe } from '@/hooks/use-auth';
import { useListState } from '@/hooks/use-list-state';
import type { AdminUserRow } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SelectField, TextField } from '@/components/forms/fields';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { ToneBadge } from '@/components/shared/status-badge';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';
import { ListToolbar } from '@/components/tables/list-toolbar';
import type { Tone } from '@/lib/constants/status';

const DEFAULTS = { page: '1', search: '', role: '', status: '', sortBy: 'createdAt', sortOrder: 'desc' };
const STATUS_TONE: Record<AdminUserRow['status'], Tone> = { ACTIVE: 'success', PENDING_VERIFICATION: 'warning', INACTIVE: 'neutral', SUSPENDED: 'danger' };
const STAFF_ROLES: Role[] = ['CHIEF_EDITOR_ADMIN', 'EDITOR', 'PRODUCTION'];

export default function AdminUsersPage() {
  const me = useMe();
  const { state, set, reset, page } = useListState(DEFAULTS);
  const [creating, setCreating] = useState(false);
  const [roleFor, setRoleFor] = useState<AdminUserRow | null>(null);
  const q = useQuery({
    queryKey: ['admin', 'users', state],
    queryFn: () => api.get<AdminUserRow[]>('/admin/users', { page, pageSize: 20, search: state.search, role: state.role, status: state.status, sortBy: state.sortBy, sortOrder: state.sortOrder }),
    placeholderData: (prev) => prev,
  });
  const invalidate = [['admin', 'users'], ['admin', 'dashboard'], ['admin', 'editors']];
  const status = useAction({ fn: (v: { id: string; status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }) => api.put(`/admin/users/${v.id}/status`, { status: v.status }), invalidate });
  const invite = useAction({
    fn: (id: string) => api.post<{ inviteEmailSent: boolean }>(`/admin/users/${id}/resend-invite`),
    invalidate,
    success: false,
    onSuccess: (r) => (r.inviteEmailSent ? toast.success('Invitation sent.') : toast.error('The invitation email could not be sent. Check the SMTP settings.')),
  });

  const columns: Column<AdminUserRow>[] = [
    { key: 'name', header: 'Name', sortKey: 'lastName', className: 'min-w-44', cell: (u) => <span className="font-medium">{u.firstName} {u.lastName}{u.reviewerProfile && <span className="block font-mono text-xs font-normal text-muted-foreground">{u.reviewerProfile.reviewerCode}</span>}</span> },
    { key: 'email', header: 'Email', sortKey: 'email', cell: (u) => u.email },
    { key: 'role', header: 'Role', cell: (u) => ROLE_LABELS[u.role] },
    { key: 'status', header: 'Status', cell: (u) => <ToneBadge tone={STATUS_TONE[u.status]}>{u.status.charAt(0) + u.status.slice(1).toLowerCase().replace(/_/g, ' ')}</ToneBadge> },
    { key: 'login', header: 'Last sign-in', sortKey: 'lastLoginAt', cell: (u) => formatDateTime(u.lastLoginAt) },
    { key: 'created', header: 'Created', sortKey: 'createdAt', cell: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (u) => {
        const self = u.id === me.data?.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.firstName} ${u.lastName}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{u.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {u.status === 'PENDING_VERIFICATION' && <DropdownMenuItem onSelect={() => invite.mutate(u.id)}><MailPlus /> Re-send invitation</DropdownMenuItem>}
              {STAFF_ROLES.includes(u.role) && !self && <DropdownMenuItem onSelect={() => setRoleFor(u)}>Change role…</DropdownMenuItem>}
              {!self && u.status !== 'PENDING_VERIFICATION' && (
                <>
                  {u.status !== 'ACTIVE' && <DropdownMenuItem onSelect={() => status.mutate({ id: u.id, status: 'ACTIVE' })}>Activate</DropdownMenuItem>}
                  {u.status === 'ACTIVE' && <DropdownMenuItem onSelect={() => status.mutate({ id: u.id, status: 'INACTIVE' })}>Deactivate</DropdownMenuItem>}
                  {u.status === 'ACTIVE' && <DropdownMenuItem variant="destructive" onSelect={() => status.mutate({ id: u.id, status: 'SUSPENDED' })}>Suspend</DropdownMenuItem>}
                </>
              )}
              {self && <DropdownMenuItem disabled>You cannot change your own account</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Authors self-register, reviewers join through application approval, and staff accounts are created here."
        actions={<Button onClick={() => setCreating(true)}><UserPlus className="size-4" /> Create staff account</Button>}
      />
      <ListToolbar
        search={state.search}
        onSearch={(v) => set({ search: v })}
        placeholder="Search name or email"
        dirty={!!(state.search || state.role || state.status)}
        onReset={reset}
        filters={[
          { key: 'role', label: 'Role', value: state.role, onChange: (v) => set({ role: v }), options: (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
          { key: 'status', label: 'Status', value: state.status, onChange: (v) => set({ status: v }), options: ['ACTIVE', 'PENDING_VERIFICATION', 'INACTIVE', 'SUSPENDED'].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') })) },
        ]}
      />
      <DataTable columns={columns} rows={q.data?.data} getKey={(u) => u.id} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} sort={{ sortBy: state.sortBy, sortOrder: state.sortOrder as 'asc' | 'desc' }} onSort={(s) => set(s)} empty={{ title: 'No users match' }} />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
      {creating && <CreateStaffDialog onClose={() => setCreating(false)} invalidate={invalidate} />}
      {roleFor && <ChangeRoleDialog user={roleFor} onClose={() => setRoleFor(null)} invalidate={invalidate} />}
    </>
  );
}

const staffSchema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(100),
  lastName: z.string().trim().min(1, 'Required').max(100),
  email: emailSchema,
  role: z.enum(['CHIEF_EDITOR_ADMIN', 'EDITOR', 'PRODUCTION'], { error: 'Choose a role' }),
  designation: z.string().trim().max(150).optional(),
});
type StaffValues = z.infer<typeof staffSchema>;
const ROLE_OPTIONS = STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

function CreateStaffDialog({ onClose, invalidate }: { onClose: () => void; invalidate: string[][] }) {
  const [sent, setSent] = useState<boolean | null>(null);
  const form = useForm<StaffValues>({ resolver: zodResolver(staffSchema), defaultValues: { firstName: '', lastName: '', email: '', role: undefined, designation: '' } });
  const create = useAction({
    fn: (v: StaffValues) => api.post<{ inviteEmailSent: boolean }>('/admin/users', { ...v, designation: v.designation || undefined }),
    form,
    invalidate,
    success: 'Account created.',
    onSuccess: (r) => setSent(r.inviteEmailSent),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create staff account</DialogTitle>
          <DialogDescription>The person receives an email to set their own password.</DialogDescription>
        </DialogHeader>
        {sent !== null ? (
          <>
            <Alert variant={sent ? 'default' : 'destructive'}><AlertDescription>{sent ? 'The invitation email was sent.' : 'The account was created but the invitation email could not be sent. Use “Re-send invitation” once email is working.'}</AlertDescription></Alert>
            <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
          </>
        ) : (
          <form id="staff-form" onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField form={form} name="firstName" label="First name" required />
              <TextField form={form} name="lastName" label="Last name" required />
            </div>
            <TextField form={form} name="email" label="Email" type="email" required />
            <SelectField form={form} name="role" label="Role" required options={ROLE_OPTIONS} />
            <TextField form={form} name="designation" label="Designation (editors)" />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
              <LoadingButton type="submit" loading={create.isPending}>Create &amp; invite</LoadingButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleDialog({ user, onClose, invalidate }: { user: AdminUserRow; onClose: () => void; invalidate: string[][] }) {
  const [role, setRole] = useState<Role>(user.role);
  const change = useAction({ fn: () => api.put(`/admin/users/${user.id}/role`, { role }), invalidate, onSuccess: onClose });
  return (
    <Dialog open onOpenChange={(o) => !o && !change.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role for {user.firstName} {user.lastName}</DialogTitle>
          <DialogDescription>Their sessions are signed out and the new role applies at the next sign-in. Roles can only change between Chief Editor, Editor and Production.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {STAFF_ROLES.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} /> {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={change.isPending}>Cancel</Button>
          <LoadingButton loading={change.isPending} disabled={role === user.role} onClick={() => change.mutate()}>Change role</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
