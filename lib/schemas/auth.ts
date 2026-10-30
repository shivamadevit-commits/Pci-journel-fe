import { z } from 'zod';
import * as v from '@/lib/validation';

// Mirrors backend src/schemas/common.ts. The API is authoritative; these give instant feedback.
export const emailSchema = v.email;
export const passwordSchema = v.password;
export const otpSchema = v.otp;

export const loginSchema = z.object({ email: v.email, password: v.currentPassword });
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firstName: v.personName('First name'),
  lastName: v.personName('Last name'),
  email: v.email,
  affiliation: v.optionalText('Affiliation', v.LIMITS.mediumText),
  country: v.optionalText('Country', v.LIMITS.name),
  password: v.password,
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email: v.email });

export const resetSchema = v.mustMatch(z.object({ newPassword: v.password, confirm: z.string().min(1, 'Please confirm your password') }), 'newPassword', 'confirm');
export type ResetValues = z.infer<typeof resetSchema>;

export const changePasswordSchema = v.mustMatch(
  z.object({ currentPassword: v.currentPassword, newPassword: v.password, confirm: z.string().min(1, 'Please confirm your password') }),
  'newPassword',
  'confirm',
);
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({ email: v.email, otp: v.otp });

export const reviewerApplicationSchema = z.object({
  firstName: v.personName('First name'),
  lastName: v.personName('Last name'),
  email: v.email,
  institution: v.requiredText('Institution', v.LIMITS.mediumText),
  designation: v.optionalText('Designation', v.LIMITS.shortText),
  highestQualification: v.requiredText('Highest qualification', v.LIMITS.shortText),
  holdsMPharm: z.boolean(),
  yearsTeaching: v.integer('Years of teaching', 0, 70),
  statement: v.requiredText('Statement', 3000, 20),
  subjectAreaIds: z.array(z.string()).min(1, 'Select at least one subject area').max(20, 'Select at most 20 subject areas'),
});
export type ReviewerApplicationValues = z.infer<typeof reviewerApplicationSchema>;

/** Only same-origin relative paths are accepted for post-login redirects. */
export const safeNext = (n: string | null | undefined): string | null => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : null);
