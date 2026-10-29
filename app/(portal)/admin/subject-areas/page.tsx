'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import type { SubjectArea } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';

const KEY = ['admin', 'subject-areas'];

export default function SubjectAreasPage() {
  const [name, setName] = useState('');
  const q = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<SubjectArea[]>('/admin/subject-areas')).data });
  const invalidate = [KEY, ['subject-areas']];
  const create = useAction({ fn: () => api.post('/admin/subject-areas', { name: name.trim() }), invalidate, onSuccess: () => setName('') });
  const update = useAction({ fn: (v: { id: string; name?: string; isActive?: boolean }) => api.patch(`/admin/subject-areas/${v.id}`, { name: v.name, isActive: v.isActive }), invalidate });

  return (
    <>
      <PageHeader title="Subject areas" description="Editorial categories used for articles and reviewer expertise. Deactivated areas stay on existing records but cannot be chosen for new ones." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>All subject areas</CardTitle></CardHeader>
          <CardContent>
            <QueryBoundary query={q}>
              {(areas) => (
                <ul className="divide-y">
                  {areas.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <RenameInline area={a} onSave={(n) => update.mutate({ id: a.id, name: n })} />
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch checked={a.isActive !== false} onCheckedChange={(v) => update.mutate({ id: a.id, isActive: v })} aria-label={`${a.name} active`} />
                        {a.isActive !== false ? 'Active' : 'Inactive'}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </QueryBoundary>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Add subject area</CardTitle><CardDescription>Names must be unique.</CardDescription></CardHeader>
          <CardContent>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}>
              <Input aria-label="New subject area name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pharmaceutical Analysis" />
              <LoadingButton type="submit" loading={create.isPending} disabled={!name.trim()}><Plus className="size-4" /> Add</LoadingButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function RenameInline({ area, onSave }: { area: SubjectArea; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(area.name);
  if (!editing) {
    return (
      <button type="button" className="text-left text-sm font-medium hover:underline" onClick={() => { setValue(area.name); setEditing(true); }}>
        {area.name}
      </button>
    );
  }
  return (
    <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (value.trim() && value.trim() !== area.name) onSave(value.trim()); setEditing(false); }}>
      <Input autoFocus aria-label="Subject area name" value={value} maxLength={120} onChange={(e) => setValue(e.target.value)} />
      <Button type="submit" size="sm">Save</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
    </form>
  );
}
