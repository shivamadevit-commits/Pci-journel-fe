import { z } from 'zod';

/**
 * Common validation primitives. Every form in the app builds its schema from these so that rules,
 * limits and messages stay identical everywhere. The API remains authoritative; this is instant feedback.
 */

export const LIMITS = {
  name: 100,
  email: 254,
  shortText: 150,
  mediumText: 250,
  note: 2000,
  longNote: 3000,
  longText: 5000,
  review: 10000,
  password: { min: 10, max: 128 },
  otp: { min: 4, max: 10 },
  phone: { min: 6, max: 20 },
} as const;

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;
const PHONE_RE = /^\+?[0-9()\-\s.]+$/;
const DOI_RE = /^10\.\d{4,9}\/\S+$/;
const CURRENCY_RE = /^[A-Za-z]{3}$/;

const requiredMsg = (label: string) => `${label} is required`;

/** Required free text. */
export const requiredText = (label: string, max: number = LIMITS.mediumText, min = 1) =>
  z
    .string({ error: requiredMsg(label) })
    .trim()
    .min(1, requiredMsg(label))
    .pipe(z.string().min(min, `${label} must be at least ${min} characters`).max(max, `${label} must be at most ${max} characters`));

/** Optional free text; an empty string is accepted. */
export const optionalText = (label: string, max: number = LIMITS.mediumText) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

/** Optional text that must match a pattern when something is entered. */
const optionalPattern = (label: string, re: RegExp, max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .refine((s) => s === '' || re.test(s), message)
    .optional();

export const personName = (label: string) =>
  requiredText(label, LIMITS.name).refine((s) => NAME_RE.test(s), `${label} can only contain letters, spaces, hyphens and apostrophes`);

export const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(LIMITS.email, `Email must be at most ${LIMITS.email} characters`)
  .pipe(z.email('Please enter a valid email address'));

export const password = z
  .string({ error: 'Password is required' })
  .min(1, 'Password is required')
  .pipe(
    z
      .string()
      .min(LIMITS.password.min, `At least ${LIMITS.password.min} characters`)
      .max(LIMITS.password.max, `At most ${LIMITS.password.max} characters`)
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[0-9]/, 'Include a digit'),
  );

/** Existing-password field: presence only, no strength rules. */
export const currentPassword = z.string({ error: 'Password is required' }).min(1, 'Password is required').max(LIMITS.password.max);

export const otp = z
  .string({ error: 'Enter the verification code' })
  .trim()
  .regex(new RegExp(`^\\d{${LIMITS.otp.min},${LIMITS.otp.max}}$`), 'Enter the numeric code from the email');

export const phone = z
  .string()
  .trim()
  .max(LIMITS.phone.max, `Phone number must be at most ${LIMITS.phone.max} characters`)
  .refine((s) => s === '' || (PHONE_RE.test(s) && s.replace(/\D/g, '').length >= 6), 'Enter a valid phone number')
  .optional();

export const doi = optionalPattern('DOI', DOI_RE, 200, 'DOI must look like 10.xxxx/yyyy');

export const currency = optionalPattern('Currency', CURRENCY_RE, 3, 'Use a 3-letter currency code');

/** Same rule as `currency` but always a string, for forms whose default value is ''. */
export const currencyOrBlank = z.string().trim().refine((s) => s === '' || CURRENCY_RE.test(s), 'Use a 3-letter currency code');

export const requiredSelect = <T extends [string, ...string[]]>(values: T, message: string) => z.enum(values, { error: message });

export const requiredId = (message: string) => z.string({ error: message }).min(1, message);

/** Required whole number within a range, e.g. a <Input type="number" /> registered with valueAsNumber. */
export const integer = (label: string, min: number, max: number) =>
  z.number({ error: `${label}: enter a number` }).int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`);

export const decimal = (label: string, min: number, max: number) =>
  z.number({ error: `${label}: enter a number` }).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`);

/** A number input that may be left blank (valueAsNumber yields NaN or '' when empty). */
export const optionalInteger = (label: string, min: number, max: number) => z.union([z.literal(''), integer(label, min, max)]);
export const optionalDecimal = (label: string, min: number, max: number) => z.union([z.literal(''), decimal(label, min, max)]);

/** Amount typed into a text input. */
export const optionalAmount = (label = 'Amount') =>
  z
    .string()
    .trim()
    .refine((s) => s === '' || (/^\d+(\.\d{1,2})?$/.test(s) && Number(s) >= 0), `${label} must be a positive number with at most 2 decimals`)
    .optional();

export const isoDate = (label: string, opts: { min?: string; max?: string; required?: boolean } = {}) =>
  z
    .string()
    .trim()
    .refine((s) => (opts.required ? s !== '' : true), requiredMsg(label))
    .refine((s) => s === '' || !Number.isNaN(Date.parse(s)), `${label} must be a valid date`)
    .refine((s) => s === '' || !opts.min || s >= opts.min, `${label} cannot be before ${opts.min}`)
    .refine((s) => s === '' || !opts.max || s <= opts.max, `${label} cannot be after ${opts.max}`);

/** "a, b; c" → ['a','b','c'] with per-item and count limits. */
export const keywordList = (opts: { itemMin?: number; itemMax?: number; maxItems?: number } = {}) => {
  const { itemMin = 2, itemMax = 60, maxItems = 10 } = opts;
  return z
    .string()
    .transform((s) => s.split(/[,;\n]/).map((k) => k.trim()).filter(Boolean))
    .pipe(
      z
        .array(z.string().min(itemMin, `Each keyword needs at least ${itemMin} characters`).max(itemMax, `Keywords can have at most ${itemMax} characters`))
        .min(1, 'Add at least one keyword')
        .max(maxItems, `At most ${maxItems} keywords`),
    );
};

export const mustMatch = <T extends z.ZodType>(schema: T, a: string, b: string, message = 'Passwords do not match') =>
  schema.refine((v) => (v as Record<string, unknown>)[a] === (v as Record<string, unknown>)[b], { path: [b], message });

/**
 * Run a schema against a loose (non-react-hook-form) input and return the first error message, or undefined when valid.
 * Use for small state-driven inputs so they show the same messages as full forms.
 */
export function firstError(schema: z.ZodType, value: unknown): string | undefined {
  const r = schema.safeParse(value);
  return r.success ? undefined : r.error.issues[0]?.message;
}
