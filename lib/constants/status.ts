export const ARTICLE_STATUSES = [
  'SUBMITTED',
  'UNDER_EDITORIAL_SCREENING',
  'REJECTED_AT_SCREENING',
  'PLAGIARISM_CHECK',
  'READY_FOR_REVIEWER_ASSIGNMENT',
  'UNDER_REVIEW',
  'REVIEWS_RECEIVED',
  'UNDER_EDITORIAL_DECISION',
  'REVISION_REQUESTED',
  'REJECTED',
  'ACCEPTED_PRODUCTION_PENDING',
  'IN_PRODUCTION',
  'PROOF_SENT_TO_AUTHOR',
  'CORRECTION_REQUIRED',
  'MAJOR_CONTENT_CHANGE_EDITOR_REVIEW',
  'FINAL_PRODUCTION',
  'PUBLISHED',
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/** BRD status terminology. */
export const STATUS_LABELS: Record<ArticleStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_EDITORIAL_SCREENING: 'Under Editorial Screening',
  REJECTED_AT_SCREENING: 'Rejected at Screening',
  PLAGIARISM_CHECK: 'Plagiarism Check',
  READY_FOR_REVIEWER_ASSIGNMENT: 'Ready for Reviewer Assignment',
  UNDER_REVIEW: 'Under Review',
  REVIEWS_RECEIVED: 'Reviews Received',
  UNDER_EDITORIAL_DECISION: 'Under Editorial Decision',
  REVISION_REQUESTED: 'Revision Requested',
  REJECTED: 'Rejected',
  ACCEPTED_PRODUCTION_PENDING: 'Accepted – Production Pending',
  IN_PRODUCTION: 'In Production',
  PROOF_SENT_TO_AUTHOR: 'Proof Sent to Author',
  CORRECTION_REQUIRED: 'Correction Required',
  MAJOR_CONTENT_CHANGE_EDITOR_REVIEW: 'Major Content Change – Editor Review',
  FINAL_PRODUCTION: 'Final Production',
  PUBLISHED: 'Published',
};

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export const STATUS_TONE: Record<ArticleStatus, Tone> = {
  SUBMITTED: 'neutral',
  UNDER_EDITORIAL_SCREENING: 'info',
  REJECTED_AT_SCREENING: 'danger',
  PLAGIARISM_CHECK: 'warning',
  READY_FOR_REVIEWER_ASSIGNMENT: 'warning',
  UNDER_REVIEW: 'info',
  REVIEWS_RECEIVED: 'info',
  UNDER_EDITORIAL_DECISION: 'warning',
  REVISION_REQUESTED: 'warning',
  REJECTED: 'danger',
  ACCEPTED_PRODUCTION_PENDING: 'success',
  IN_PRODUCTION: 'info',
  PROOF_SENT_TO_AUTHOR: 'warning',
  CORRECTION_REQUIRED: 'warning',
  MAJOR_CONTENT_CHANGE_EDITOR_REVIEW: 'warning',
  FINAL_PRODUCTION: 'info',
  PUBLISHED: 'success',
};

/** The main happy-path sequence shown by the workflow stepper (BRD §10). */
export const MAIN_FLOW: ArticleStatus[] = [
  'SUBMITTED',
  'UNDER_EDITORIAL_SCREENING',
  'PLAGIARISM_CHECK',
  'READY_FOR_REVIEWER_ASSIGNMENT',
  'UNDER_REVIEW',
  'REVIEWS_RECEIVED',
  'UNDER_EDITORIAL_DECISION',
  'ACCEPTED_PRODUCTION_PENDING',
  'IN_PRODUCTION',
  'PROOF_SENT_TO_AUTHOR',
  'FINAL_PRODUCTION',
  'PUBLISHED',
];

/** Statuses off the main path, mapped to the main-flow step they relate to. */
export const BRANCH_ANCHOR: Partial<Record<ArticleStatus, ArticleStatus>> = {
  REJECTED_AT_SCREENING: 'UNDER_EDITORIAL_SCREENING',
  REJECTED: 'UNDER_EDITORIAL_DECISION',
  REVISION_REQUESTED: 'UNDER_EDITORIAL_DECISION',
  CORRECTION_REQUIRED: 'PROOF_SENT_TO_AUTHOR',
  MAJOR_CONTENT_CHANGE_EDITOR_REVIEW: 'PROOF_SENT_TO_AUTHOR',
};

export const TERMINAL: ArticleStatus[] = ['REJECTED_AT_SCREENING', 'REJECTED', 'PUBLISHED'];

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-secondary text-secondary-foreground border-transparent',
  info: 'bg-blue-100 text-blue-800 border-transparent dark:bg-blue-950 dark:text-blue-200',
  warning: 'bg-amber-100 text-amber-900 border-transparent dark:bg-amber-950 dark:text-amber-200',
  success: 'bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-200',
  danger: 'bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-200',
};

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_TONE: Record<PaymentStatus, Tone> = { PENDING: 'warning', PAID: 'success', FAILED: 'danger', REFUNDED: 'neutral', WAIVED: 'info' };
/** Mirrors the backend transition table (payment.service.ts). */
export const PAYMENT_NEXT: Record<PaymentStatus, PaymentStatus[]> = { PENDING: ['PAID', 'FAILED', 'WAIVED'], FAILED: ['PENDING', 'PAID', 'WAIVED'], PAID: ['REFUNDED'], WAIVED: [], REFUNDED: [] };

export const RECOMMENDATIONS = [
  { value: 'ACCEPT', label: 'Accept' },
  { value: 'MINOR_REVISION', label: 'Minor revision' },
  { value: 'MAJOR_REVISION', label: 'Major revision' },
  { value: 'REJECT', label: 'Reject' },
] as const;

export const COMMENT_SECTIONS = [
  { value: 'SUMMARY', label: 'Summary' },
  { value: 'ORIGINALITY', label: 'Originality' },
  { value: 'METHODOLOGY', label: 'Methodology' },
  { value: 'RESULTS', label: 'Results' },
  { value: 'ETHICS', label: 'Ethics' },
  { value: 'LANGUAGE', label: 'Language' },
  { value: 'OTHER', label: 'Other' },
  { value: 'CONFIDENTIAL_TO_EDITOR', label: 'Confidential to editor' },
] as const;

export const sectionLabel = (v: string) => COMMENT_SECTIONS.find((s) => s.value === v)?.label ?? v;
export const recommendationLabel = (v: string | null | undefined) => RECOMMENDATIONS.find((r) => r.value === v)?.label ?? v ?? '—';

/** Statuses visible to the Production Team (accepted articles onwards). */
export const PRODUCTION_STATUSES: ArticleStatus[] = [
  'ACCEPTED_PRODUCTION_PENDING',
  'IN_PRODUCTION',
  'PROOF_SENT_TO_AUTHOR',
  'CORRECTION_REQUIRED',
  'MAJOR_CONTENT_CHANGE_EDITOR_REVIEW',
  'FINAL_PRODUCTION',
  'PUBLISHED',
];
