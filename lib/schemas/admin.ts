import { z } from 'zod';
import * as v from '@/lib/validation';

export const PUBLICATION_META_FIELDS = ['doi', 'volume', 'issue', 'pages', 'license', 'copyright', 'citation'] as const;

export const staffSchema = z.object({
  firstName: v.personName('First name'),
  lastName: v.personName('Last name'),
  email: v.email,
  role: v.requiredSelect(['CHIEF_EDITOR_ADMIN', 'EDITOR', 'PRODUCTION'], 'Choose a role'),
  designation: v.optionalText('Designation', v.LIMITS.shortText),
});
export type StaffValues = z.infer<typeof staffSchema>;

export const profileSchema = z.object({
  firstName: v.personName('First name'),
  lastName: v.personName('Last name'),
  affiliation: v.optionalText('Affiliation', v.LIMITS.mediumText),
  country: v.optionalText('Country', v.LIMITS.name),
  phone: v.phone,
  designation: v.optionalText('Designation', v.LIMITS.shortText),
  institution: v.optionalText('Institution', v.LIMITS.mediumText),
  qualificationNotes: v.optionalText('Qualification notes', v.LIMITS.note),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const configSchema = z.object({
  wordLimit: v.integer('Word limit', 1, 200000),
  paymentEnabled: z.boolean(),
  apcEnforcement: z.enum(['none', 'flag', 'block']),
  apcDefaultAmount: v.optionalDecimal('APC amount', 0, 10_000_000),
  apcCurrency: v.currencyOrBlank,
  allowRevisionAfterReview: z.boolean(),
  reviewDueDays: v.optionalInteger('Review due days', 1, 365),
  reviewerMinYearsTeaching: v.integer('Minimum years of teaching', 0, 80),
  publicationRequiredMetadata: z.array(z.enum(PUBLICATION_META_FIELDS)),
});
export type ConfigInput = z.input<typeof configSchema>;
export type ConfigValues = z.output<typeof configSchema>;

export const subjectAreaNameSchema = v.requiredText('Name', 120, 2);

export const auditFilterSchema = z
  .object({
    action: v.optionalText('Event prefix', 100),
    entityType: v.optionalText('Entity type', 100),
    entityId: v.optionalText('Entity ID', 100),
    from: v.isoDate('From date'),
    to: v.isoDate('To date'),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, { path: ['to'], message: 'To date cannot be before the From date' });
export type AuditFilterValues = z.infer<typeof auditFilterSchema>;
