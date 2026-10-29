'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDate } from '@/lib/format';
import type { ReviewerProfileRow, SubjectArea } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';
import { KeyValue } from '@/components/shared/stat-card';
import { ToneBadge } from '@/components/shared/status-badge';

export default function ReviewerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const key = ['editor', 'reviewer', id];
  const q = useQuery({ queryKey: key, queryFn: async () => (await api.get<ReviewerProfileRow>(`/editorial/reviewers/${id}`)).data });
  return (
    <QueryBoundary query={q}>
      {(r) => (
        <>
          <PageHeader
            breadcrumbs={[{ label: 'Reviewer pool', href: '/editor/reviewers' }, { label: r.reviewerCode }]}
            title={`${r.user.firstName} ${r.user.lastName}`}
            description={<span className="flex items-center gap-2"><span className="font-mono">{r.reviewerCode}</span><ToneBadge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Active' : 'Inactive'}</ToneBadge></span>}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Profile &amp; eligibility</CardTitle><CardDescription>Proposed minimum: M.Pharm or 10 years’ teaching — the Editor decides.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <KeyValue
                  items={[
                    { label: 'Email', value: r.user.email },
                    { label: 'Institution', value: r.institution },
                    { label: 'Designation', value: r.designation },
                    { label: 'Highest qualification', value: r.highestQualification },
                    { label: 'M.Pharm', value: r.holdsMPharm ? 'Yes' : 'No' },
                    { label: 'Years teaching', value: r.yearsTeaching },
                    { label: 'Meets proposed criteria', value: <ToneBadge tone={r.meetsProposedEligibility ? 'success' : 'warning'}>{r.meetsProposedEligibility ? 'Yes' : 'No'}</ToneBadge> },
                    { label: 'Approved', value: formatDate(r.approvedAt) },
                  ]}
                />
                {r.qualificationNotes && <p className="text-sm"><span className="text-muted-foreground">Qualifications: </span>{r.qualificationNotes}</p>}
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Assignment history</p>
                  <div className="flex flex-wrap gap-2">
                    {(r.assignmentHistory ?? []).length === 0 ? <span className="text-sm text-muted-foreground">No assignments yet.</span> : r.assignmentHistory!.map((h) => <Badge key={h.status} variant="secondary">{h.status.toLowerCase()}: {h.count}</Badge>)}
                  </div>
                </div>
              </CardContent>
            </Card>
            <ManageCard key={`${r.id}-${r.isActive}-${r.subjectAreas.map((s) => s.id).join()}`} reviewer={r} invalidate={[key, ['editor', 'reviewers']]} />
          </div>
        </>
      )}
    </QueryBoundary>
  );
}

function ManageCard({ reviewer: r, invalidate }: { reviewer: ReviewerProfileRow; invalidate: string[][] }) {
  const areas = useQuery({ queryKey: ['subject-areas'], queryFn: async () => (await api.get<SubjectArea[]>('/subject-areas')).data });
  const [active, setActive] = useState(r.isActive);
  const [notes, setNotes] = useState(r.eligibilityNotes ?? '');
  const [selected, setSelected] = useState<string[]>(r.subjectAreas.map((s) => s.id));

  const save = useAction({
    fn: () => api.patch(`/editorial/reviewers/${r.id}`, { isActive: active, eligibilityNotes: notes || undefined, subjectAreaIds: selected }),
    invalidate,
  });
  return (
    <Card>
      <CardHeader><CardTitle>Manage reviewer</CardTitle><CardDescription>Internal notes are never shown to the reviewer or authors.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <Field orientation="horizontal">
          <Switch id="active" checked={active} onCheckedChange={setActive} />
          <FieldLabel htmlFor="active" className="font-normal">Active — can be assigned to manuscripts</FieldLabel>
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">Subject areas</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(areas.data ?? []).map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selected.includes(a.id)} onCheckedChange={(c) => setSelected((s) => (c === true ? [...s, a.id] : s.filter((x) => x !== a.id)))} />
                {a.name}
              </label>
            ))}
          </div>
        </div>
        <Field>
          <FieldLabel htmlFor="notes">Eligibility notes (editors only)</FieldLabel>
          <Textarea id="notes" rows={4} maxLength={3000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <LoadingButton loading={save.isPending} disabled={selected.length === 0} onClick={() => save.mutate()}>Save changes</LoadingButton>
      </CardContent>
    </Card>
  );
}
