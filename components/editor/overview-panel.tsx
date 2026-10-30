'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCog } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDate, formatDateTime } from '@/lib/format';
import { fullName } from '@/lib/links';
import type { Role } from '@/lib/constants/roles';
import type { EditorArticleDetail } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DownloadButton } from '@/components/shared/download-button';
import { LoadingButton } from '@/components/shared/loading-button';
import { KeyValue } from '@/components/shared/stat-card';
import { EnumBadge } from '@/components/shared/status-badge';
import { refreshArticle } from './keys';

export function OverviewPanel({ article: a, role }: { article: EditorArticleDetail; role: Role }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Manuscript</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <KeyValue
            items={[
              { label: 'Submitting author', value: a.author ? `${fullName(a.author)} · ${a.author.email}` : '—' },
              { label: 'Submitted', value: formatDateTime(a.submittedAt) },
              { label: 'Subject area', value: a.subjectArea?.name },
              { label: 'Word count', value: <span>{a.currentWordCount.toLocaleString()} {a.wordLimitExceeded && <Badge variant="outline" className="ml-1 border-amber-400 text-amber-700">Over limit</Badge>}</span> },
              { label: 'Assigned editor', value: a.editor ? fullName(a.editor) : 'Unassigned' },
              { label: 'Keywords', value: <span className="flex flex-wrap gap-1">{a.keywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</span> },
              ...(a.acceptedAt ? [{ label: 'Accepted', value: formatDate(a.acceptedAt) }] : []),
              ...(a.publishedAt ? [{ label: 'Published', value: formatDate(a.publishedAt) }] : []),
            ]}
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Abstract</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{a.abstract}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ethics statement</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{a.ethicsStatement}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Authors</CardTitle><CardDescription>Visible to editorial staff only — never to reviewers.</CardDescription></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {a.coAuthors.map((c, i) => (
              <li key={i} className="py-2">
                <span className="font-medium">{c.firstName} {c.lastName}</span> {c.isCorresponding && <Badge variant="secondary">Corresponding</Badge>}
                <p className="text-xs text-muted-foreground">{c.email}{c.affiliation ? ` · ${c.affiliation}` : ''}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Manuscript versions</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {a.versions.map((v) => (
              <li key={v.versionNumber} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <span className="font-medium">Version {v.versionNumber}</span> <EnumBadge value={v.kind} />
                  <p className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)} · {v.wordCount.toLocaleString()} words{v.changeNote ? ` · ${v.changeNote}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <DownloadButton fileId={v.fileId}>Manuscript</DownloadButton>
                  {v.titlePageFileId && <DownloadButton fileId={v.titlePageFileId}>Title page</DownloadButton>}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {role === 'ADMIN' && <AssignEditorCard article={a} />}
    </div>
  );
}

function AssignEditorCard({ article }: { article: EditorArticleDetail }) {
  const [editorId, setEditorId] = useState<string>(article.editor?.id ?? '');
  const editors = useQuery({ queryKey: ['admin', 'editors'], queryFn: async () => (await api.get<{ id: string; firstName: string; lastName: string; email: string }[]>('/admin/editors', { pageSize: 100 })).data });
  const assign = useAction({ fn: () => api.put(`/admin/articles/${article.id}/editor`, { editorId }), invalidate: refreshArticle(article.id) });
  const closed = ['REJECTED_AT_SCREENING', 'REJECTED', 'PUBLISHED'].includes(article.status);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserCog className="size-5" /> Editor assignment</CardTitle>
        <CardDescription>Admin only.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={editorId || undefined} onValueChange={setEditorId} disabled={closed}>
          <SelectTrigger className="sm:w-80" aria-label="Editor"><SelectValue placeholder={editors.isLoading ? 'Loading editors…' : 'Select an editor'} /></SelectTrigger>
          <SelectContent>
            {(editors.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <LoadingButton loading={assign.isPending} disabled={!editorId || editorId === article.editor?.id || closed} onClick={() => assign.mutate()}>Assign editor</LoadingButton>
      </CardContent>
    </Card>
  );
}
