import { z } from 'zod';
import * as v from '@/lib/validation';

export const notesSchema = z.object({
  notes: v.optionalText('Notes', v.LIMITS.longText),
  authorMessage: v.optionalText('Message to the author', v.LIMITS.longText),
});
export type NotesValues = z.infer<typeof notesSchema>;

export const manualPlagiarismSchema = z.object({
  similarityScore: v.decimal('Similarity score', 0, 100),
  verdict: v.requiredSelect(['CLEAR', 'CONCERN'], 'Choose a verdict'),
  provider: v.optionalText('Provider', 100),
  providerReference: v.optionalText('Provider reference', 200),
  notes: v.optionalText('Notes', v.LIMITS.longText),
});
export type ManualPlagiarismValues = z.infer<typeof manualPlagiarismSchema>;

export const decisionSchema = z.object({
  decision: v.requiredSelect(['ACCEPT', 'REJECT', 'REQUEST_REVISION'], 'Choose a decision'),
  notes: v.optionalText('Internal decision notes', v.LIMITS.longText),
  authorMessage: v.optionalText('Message to the author', v.LIMITS.longText),
});
export type DecisionValues = z.infer<typeof decisionSchema>;

export const paymentSchema = z.object({
  status: v.requiredId('Choose a status'),
  amount: v.optionalAmount('Amount'),
  currency: v.currency,
  providerReference: v.optionalText('Provider reference', 200),
  note: v.optionalText('Note', v.LIMITS.note),
});
export type PaymentValues = z.infer<typeof paymentSchema>;

export const publicationMetadataSchema = z.object({
  doi: v.doi,
  volume: v.optionalText('Volume', 20),
  issue: v.optionalText('Issue', 20),
  pages: v.optionalText('Pages', 40),
  license: v.optionalText('License', 200),
  copyright: v.optionalText('Copyright', 300),
  citation: v.optionalText('Citation', v.LIMITS.note),
});
export type PublicationMetadataValues = z.infer<typeof publicationMetadataSchema>;
