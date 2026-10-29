import { z } from 'zod';

// Mirrors backend src/schemas/common.ts. The API is authoritative; these give instant feedback.
export const emailSchema = z.string().trim().toLowerCase().min(1, 'Email is required').max(254).pipe(z.email('Please enter a valid email address'));

export const passwordSchema = z
  .string()
  .min(10, 'At least 10 characters')
  .max(128, 'At most 128 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a digit');

export const otpSchema = z.string().trim().regex(/^\d{4,10}$/, 'Enter the numeric code from the email');

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Password is required') });
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(100),
  lastName: z.string().trim().min(1, 'Required').max(100),
  email: emailSchema,
  affiliation: z.string().trim().max(250).optional(),
  country: z.string().trim().max(100).optional(),
  password: passwordSchema,
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export type ResetValues = z.infer<typeof resetSchema>;

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Required'), newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const reviewerApplicationSchema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(100),
  lastName: z.string().trim().min(1, 'Required').max(100),
  email: emailSchema,
  institution: z.string().trim().min(1, 'Required').max(250),
  designation: z.string().trim().max(150).optional(),
  highestQualification: z.string().trim().min(1, 'Required').max(150),
  holdsMPharm: z.boolean(),
  yearsTeaching: z.number({ error: 'Enter a number' }).int().min(0).max(70),
  statement: z.string().trim().min(20, 'Please write at least 20 characters').max(3000),
  subjectAreaIds: z.array(z.string()).min(1, 'Select at least one subject area').max(20),
});
export type ReviewerApplicationValues = z.infer<typeof reviewerApplicationSchema>;

/** Only same-origin relative paths are accepted for post-login redirects. */
export const safeNext = (n: string | null | undefined): string | null => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : null);
