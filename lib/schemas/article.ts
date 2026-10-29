import { z } from 'zod';
import { emailSchema } from '@/lib/schemas/auth';

const trimmed = (min: number, max: number, label = 'This field') =>
  z.string().trim().min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`).max(max, `${label} must be at most ${max} characters`);

export const authorEntrySchema = z.object({
  firstName: trimmed(1, 100, 'First name'),
  lastName: trimmed(1, 100, 'Last name'),
  email: emailSchema,
  affiliation: z.string().trim().max(250).optional(),
  isCorresponding: z.boolean(),
});

export const submissionSchema = z
  .object({
    title: trimmed(5, 500, 'Title'),
    abstract: trimmed(20, 5000, 'Abstract'),
    ethicsStatement: trimmed(5, 5000, 'Ethics statement'),
    subjectAreaId: z.string().optional(),
    keywords: z
      .string()
      .transform((s) => s.split(/[,;\n]/).map((k) => k.trim()).filter(Boolean))
      .pipe(z.array(z.string().min(2, 'Each keyword needs at least 2 characters').max(60, 'Keywords can have at most 60 characters')).min(1, 'Add at least one keyword').max(10, 'At most 10 keywords')),
    authors: z.array(authorEntrySchema).min(1, 'At least one author is required').max(30),
    confirmAnonymised: z.boolean().refine((v) => v === true, 'You must confirm the manuscript is anonymised for double-blind review'),
  })
  .refine((v) => v.authors.some((a) => a.isCorresponding), { path: ['authors'], message: 'Mark one author as the corresponding author' });

export type SubmissionInput = z.input<typeof submissionSchema>;
export type SubmissionValues = z.output<typeof submissionSchema>;

export const correctionSchema = z.object({
  feedback: z.string().trim().max(5000).optional(),
  corrections: z
    .array(
      z.object({
        type: z.enum(['MINOR', 'MAJOR']),
        location: z.string().trim().max(300).optional(),
        description: trimmed(1, 3000, 'Description'),
      }),
    )
    .min(1, 'List at least one correction')
    .max(100),
});
export type CorrectionValues = z.infer<typeof correctionSchema>;
