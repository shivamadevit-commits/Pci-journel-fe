'use client';

import { FieldValidation } from '@/components/forms/field-validation';
import { decisionNoteSchema, routeReasonSchema } from '@/lib/schemas/editorial';
import { firstError } from '@/lib/validation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileCode2, FileText, PackageCheck, PlayCircle, Send, Upload, UserPlus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDateTime } from '@/lib/format';
import type { Correction, ProductionDetail, ProofSummary, PublicationStaffView } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DownloadButton } from '@/components/shared/download-button';
import { FileInput } from '@/components/shared/file-input';
import { LoadingButton } from '@/components/shared/loading-button';
import { PublicationMetadataForm } from '@/components/shared/publication-metadata-form';
import { EmptyState, QueryBoundary } from '@/components/shared/states';
import { EnumBadge } from '@/components/shared/status-badge';

export const prodKey = (id: string) => ['production', 'article', id];
const refresh = (id: string) => [prodKey(id), ['production', 'queue'], ['production', 'dashboard'], ['publication', id]];

const PROOF_TONE = { PENDING_REVIEW: 'warning', APPROVED: 'success', CORRECTIONS_REQUESTED: 'info', SUPERSEDED: 'neutral', PENDING_DELIVERY: 'neutral' } as const;
const CORR_TONE = { OPEN: 'warning', IMPLEMENTED: 'success', ESCALATED: 'warning', APPROVED_BY_EDITOR: 'info', REJECTED_BY_EDITOR: 'danger' } as const;

// ───────────────────────────── task control ─────────────────────────────

export function TaskPanel({ article, myId }: { article: ProductionDetail; myId: string }) {
  const id = article.id;
  const assignMe = useAction({ fn: () => api.put(`/production/articles/${id}/assignment`, { assigneeId: myId }), invalidate: refresh(id) });
  const start = useAction({ fn: () => api.post(`/production/articles/${id}/start`), invalidate: refresh(id) });
  const assignedToMe = article.productionTask?.assignedTo?.id === myId;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Production task</CardTitle>
        <CardDescription>Status: {article.productionTask?.status.replace(/_/g, ' ').toLowerCase() ?? '—'} · assigned to {article.productionTask?.assignedTo ? `${article.productionTask.assignedTo.firstName} ${article.productionTask.assignedTo.lastName}` : 'nobody'}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {!assignedToMe && article.status !== 'PUBLISHED' && (
          <LoadingButton variant="outline" loading={assignMe.isPending} onClick={() => assignMe.mutate()}><UserPlus className="size-4" /> Assign to me</LoadingButton>
        )}
        {article.status === 'ACCEPTED_PRODUCTION_PENDING' && (
          <LoadingButton loading={start.isPending} onClick={() => start.mutate()}><PlayCircle className="size-4" /> Start production</LoadingButton>
        )}
        {article.currentManuscript && <DownloadButton fileId={article.currentManuscript.fileId} fallbackName="manuscript.docx">Accepted manuscript (v{article.currentManuscript.versionNumber})</DownloadButton>}
      </CardContent>
    </Card>
  );
}

// ───────────────────────────── proofs ─────────────────────────────

export function ProofsPanel({ article }: { article: ProductionDetail }) {
  const id = article.id;
  const [uploadOpen, setUploadOpen] = useState(false);
  const send = useAction({ fn: (proofId: string) => api.post(`/production/articles/${id}/proofs/${proofId}/send`), invalidate: refresh(id) });
  const canUpload = article.status === 'IN_PRODUCTION' || article.status === 'CORRECTION_REQUIRED';
  const openCorrections = article.corrections.filter((c) => ['OPEN', 'ESCALATED', 'APPROVED_BY_EDITOR'].includes(c.status)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="size-5" /> Proofs</CardTitle>
        <CardDescription>Upload the formatted proof and deliver it to the author. A new proof supersedes earlier ones.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {article.proofs.length === 0 ? (
          <EmptyState title="No proofs yet" description={canUpload ? 'Upload the first typeset proof.' : 'Start production to upload proofs.'} />
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {article.proofs.map((p: ProofSummary) => (
              <li key={p.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">Proof v{p.versionNumber}</span><EnumBadge value={p.authorStatus} tone={PROOF_TONE[p.authorStatus]} /></div>
                  <p className="text-xs text-muted-foreground">{p.sentToAuthorAt ? `Sent ${formatDateTime(p.sentToAuthorAt)}` : 'Not sent to the author'}{p.authorRespondedAt ? ` · author responded ${formatDateTime(p.authorRespondedAt)}` : ''}</p>
                  {p.notes && <p className="text-xs">Notes: {p.notes}</p>}
                  {p.authorFeedback && <p className="text-xs">Author feedback: {p.authorFeedback}</p>}
                </div>
                <div className="flex gap-2">
                  <DownloadButton fileId={p.fileId} />
                  {p.authorStatus === 'PENDING_DELIVERY' && canUpload && openCorrections === 0 && (
                    <LoadingButton size="sm" loading={send.isPending} onClick={() => send.mutate(p.id)}><Send className="size-3.5" /> Send to author</LoadingButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canUpload && openCorrections > 0 && <Alert><AlertDescription>{openCorrections} correction(s) must be implemented (or decided by the Editor) before a revised proof can be sent.</AlertDescription></Alert>}
        {canUpload && (
          <Button onClick={() => setUploadOpen(true)}><Upload className="size-4" /> Upload proof</Button>
        )}
      </CardContent>
      {uploadOpen && <UploadProofDialog articleId={id} onClose={() => setUploadOpen(false)} hold={openCorrections > 0} />}
    </Card>
  );
}

function UploadProofDialog({ articleId, onClose, hold }: { articleId: string; onClose: () => void; hold: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [sendNow, setSendNow] = useState(!hold);
  const [err, setErr] = useState<string>();
  const upload = useAction({
    fn: () => {
      const fd = new FormData();
      fd.append('proof', file!);
      if (notes.trim()) fd.append('notes', notes.trim());
      fd.append('sendToAuthor', String(sendNow));
      return api.upload('POST', `/production/articles/${articleId}/proofs`, fd);
    },
    invalidate: refresh(articleId),
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !upload.isPending && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload proof</DialogTitle><DialogDescription>PDF, Word or HTML. The author is notified when it is sent.</DialogDescription></DialogHeader>
        <FileInput label="Proof file" required accept=".pdf,.docx,.html" value={file} onChange={(f) => { setFile(f); setErr(undefined); }} error={err} />
        <Field>
          <FieldLabel htmlFor="pnotes">Notes for the author (optional)</FieldLabel>
          <Textarea id="pnotes" rows={3} maxLength={3000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <FieldValidation schema={decisionNoteSchema} value={notes} />
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="sendnow" checked={sendNow} disabled={hold} onCheckedChange={(c) => setSendNow(c === true)} />
          <FieldLabel htmlFor="sendnow" className="font-normal">Send to the author now{hold ? ' (unavailable while corrections are pending)' : ''}</FieldLabel>
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={upload.isPending}>Cancel</Button>
          <LoadingButton loading={upload.isPending} disabled={!!firstError(decisionNoteSchema, notes)} onClick={() => (file ? upload.mutate() : setErr('Choose the proof file.'))}>Upload</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── corrections ─────────────────────────────

export function CorrectionsPanel({ article }: { article: ProductionDetail }) {
  const id = article.id;
  const [acting, setActing] = useState<{ c: Correction; kind: 'implement' | 'escalate' } | null>(null);
  const handling = article.status === 'CORRECTION_REQUIRED';
  return (
    <Card>
      <CardHeader>
        <CardTitle>Author corrections</CardTitle>
        <CardDescription>Minor corrections (grammar, spelling, typography) are implemented by production. Major content changes must be approved by the Editor first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {article.status === 'MAJOR_CONTENT_CHANGE_EDITOR_REVIEW' && <Alert><AlertDescription>Waiting for the Editor to decide on the major content change(s). Production is paused.</AlertDescription></Alert>}
        {article.corrections.length === 0 ? (
          <EmptyState title="No corrections" description="Corrections requested by the author appear here." />
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {article.corrections.map((c) => {
              const canImplement = handling && ((c.type === 'MINOR' && c.status === 'OPEN') || c.status === 'APPROVED_BY_EDITOR');
              const canEscalate = handling && c.status === 'OPEN';
              return (
                <li key={c.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-2"><EnumBadge value={c.type} tone={c.type === 'MAJOR' ? 'warning' : 'neutral'} /><EnumBadge value={c.status} tone={CORR_TONE[c.status]} /></div>
                    <p className="whitespace-pre-wrap">{c.description}</p>
                    {c.location && <p className="text-xs text-muted-foreground">Location: {c.location}</p>}
                    {c.editorNote && <p className="text-xs text-muted-foreground">Editor: {c.editorNote}</p>}
                    {c.productionNote && <p className="text-xs text-muted-foreground">Production: {c.productionNote}</p>}
                  </div>
                  {(canImplement || canEscalate) && (
                    <div className="flex shrink-0 gap-2">
                      {canImplement && <Button size="sm" onClick={() => setActing({ c, kind: 'implement' })}><CheckCircle2 className="size-3.5" /> Implemented</Button>}
                      {canEscalate && <Button size="sm" variant="outline" onClick={() => setActing({ c, kind: 'escalate' })}>Route to Editor</Button>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      {acting && <CorrectionDialog articleId={id} {...acting} onClose={() => setActing(null)} />}
    </Card>
  );
}

function CorrectionDialog({ articleId, c, kind, onClose }: { articleId: string; c: Correction; kind: 'implement' | 'escalate'; onClose: () => void }) {
  const [text, setText] = useState('');
  const implement = kind === 'implement';
  const act = useAction({
    fn: () => (implement ? api.post(`/production/corrections/${c.id}/implement`, { note: text.trim() || undefined }) : api.post(`/production/corrections/${c.id}/escalate`, { reason: text.trim() })),
    invalidate: refresh(articleId),
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !act.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{implement ? 'Mark correction as implemented' : 'Route to the Editor as a major change'}</DialogTitle>
          <DialogDescription>{c.description}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="ctext">{implement ? 'Note (optional)' : 'Why is this a major content change?'}</FieldLabel>
          <Textarea id="ctext" rows={3} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} />
          <FieldValidation schema={implement ? decisionNoteSchema : routeReasonSchema} value={text} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={act.isPending}>Cancel</Button>
          <LoadingButton loading={act.isPending} disabled={!!firstError(implement ? decisionNoteSchema : routeReasonSchema, text)} onClick={() => act.mutate()}>{implement ? 'Confirm' : 'Route to Editor'}</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── final files & hand-off ─────────────────────────────

export function FinalPanel({ article }: { article: ProductionDetail }) {
  const id = article.id;
  const final = article.status === 'FINAL_PRODUCTION';
  const pubKey = ['publication', id];
  const view = useQuery({
    queryKey: pubKey,
    enabled: ['IN_PRODUCTION', 'PROOF_SENT_TO_AUTHOR', 'CORRECTION_REQUIRED', 'FINAL_PRODUCTION', 'PUBLISHED'].includes(article.status),
    queryFn: async () => (await api.get<PublicationStaffView>(`/publication/articles/${id}`)).data,
  });
  const complete = useAction({ fn: () => api.post(`/production/articles/${id}/complete`), invalidate: refresh(id) });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageCheck className="size-5" /> Final files &amp; publication hand-off</CardTitle>
          <CardDescription>Available once the author has approved the proof (Final Production). The Editor then authorises publication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FinalFileUpload articleId={id} kind="html" fileId={article.publication?.htmlFileId} enabled={final} />
            <FinalFileUpload articleId={id} kind="pdf" fileId={article.publication?.pdfFileId} enabled={final} />
          </div>
          {final && (
            <ConfirmDialog
              title="Complete production?"
              description="This hands the article to the Editor for publication authorisation. Replacing a file afterwards re-opens this step."
              confirmLabel="Complete & hand off"
              disabled={!article.publication?.htmlFileId || !article.publication?.pdfFileId || article.productionTask?.status === 'COMPLETED'}
              onConfirm={() => complete.mutateAsync()}
              trigger={<LoadingButton loading={complete.isPending} disabled={!article.publication?.htmlFileId || !article.publication?.pdfFileId || article.productionTask?.status === 'COMPLETED'}>{article.productionTask?.status === 'COMPLETED' ? 'Handed off to the Editor' : 'Complete production & hand off…'}</LoadingButton>}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Publication metadata</CardTitle><CardDescription>Author names and keywords come from the submission; add the remaining publication details.</CardDescription></CardHeader>
        <CardContent>
          <QueryBoundary query={view} skeleton={<p className="text-sm text-muted-foreground">Loading…</p>}>
            {(v) => (
              <div className="space-y-4">
                {v.readiness.missing.length > 0 && final && <Alert><AlertDescription>Still needed before publication: {v.readiness.missing.join(', ')}.</AlertDescription></Alert>}
                <PublicationMetadataForm articleId={id} metadata={v.publication?.metadata} required={v.requiredMetadata} invalidate={refresh(id)} disabled={article.status === 'PUBLISHED'} />
              </div>
            )}
          </QueryBoundary>
        </CardContent>
      </Card>
    </div>
  );
}

function FinalFileUpload({ articleId, kind, fileId, enabled }: { articleId: string; kind: 'html' | 'pdf'; fileId?: string | null; enabled: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useAction({
    fn: () => {
      const fd = new FormData();
      fd.append('file', file!);
      return api.upload('PUT', `/production/articles/${articleId}/final-files/${kind}`, fd);
    },
    invalidate: refresh(articleId),
    onSuccess: () => setFile(null),
  });
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="flex items-center gap-2 text-sm font-medium">{kind === 'html' ? <FileCode2 className="size-4" /> : <FileText className="size-4" />} Final {kind.toUpperCase()}</p>
      {fileId ? <DownloadButton fileId={fileId}>Current {kind.toUpperCase()}</DownloadButton> : <p className="text-sm text-muted-foreground">Not uploaded.</p>}
      {enabled && (
        <>
          <FileInput label={fileId ? 'Replace file' : 'Upload file'} accept={`.${kind}`} value={file} onChange={setFile} />
          <LoadingButton size="sm" loading={upload.isPending} disabled={!file} onClick={() => upload.mutate()}>Upload {kind.toUpperCase()}</LoadingButton>
        </>
      )}
    </div>
  );
}
