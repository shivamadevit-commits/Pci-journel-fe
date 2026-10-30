import { z } from 'zod';
import * as v from '@/lib/validation';

export const authorEntrySchema = z.object({
  firstName: v.personName('First name'),
  lastName: v.personName('Last name'),
  email: v.email,
  affiliation: v.optionalText('Affiliation', v.LIMITS.mediumText),
  isCorresponding: z.boolean(),
});

export const submissionSchema = z
  .object({
    title: v.requiredText('Title', 500, 5),
    abstract: v.requiredText('Abstract', v.LIMITS.longText, 20),
    ethicsStatement: v.requiredText('Ethics statement', v.LIMITS.longText, 5),
    subjectAreaId: z.string().optional(),
    keywords: v.keywordList(),
    authors: z.array(authorEntrySchema).min(1, 'At least one author is required').max(30, 'At most 30 authors'),
    confirmAnonymised: z.boolean().refine((x) => x === true, 'You must confirm the manuscript is anonymised for double-blind review'),
  })
  .refine((x) => x.authors.some((a) => a.isCorresponding), { path: ['authors'], message: 'Mark one author as the corresponding author' });

export type SubmissionInput = z.input<typeof submissionSchema>;
export type SubmissionValues = z.output<typeof submissionSchema>;

export const correctionSchema = z.object({
  feedback: v.optionalText('Feedback', v.LIMITS.longText),
  corrections: z
    .array(
      z.object({
        type: z.enum(['MINOR', 'MAJOR']),
        location: v.optionalText('Location', 300),
        description: v.requiredText('Description', v.LIMITS.longNote),
      }),
    )
    .min(1, 'List at least one correction')
    .max(100, 'At most 100 corrections'),
});
export type CorrectionValues = z.infer<typeof correctionSchema>;

export const revisionSchema = z.object({ changeNote: v.optionalText('Change note', v.LIMITS.note) });
export type RevisionValues = z.infer<typeof revisionSchema>;
