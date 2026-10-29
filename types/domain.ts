import type { ArticleStatus, PaymentStatus } from '@/lib/constants/status';
import type { Role } from '@/lib/constants/roles';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: string;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  authorProfile?: { affiliation: string | null; country: string | null; phone: string | null } | null;
  editorProfile?: { designation: string | null } | null;
  reviewerProfile?: {
    id: string;
    reviewerCode: string;
    institution: string | null;
    designation: string | null;
    highestQualification: string | null;
    holdsMPharm: boolean;
    yearsTeaching: number;
    qualificationNotes: string | null;
    isActive: boolean;
    subjectAreas: SubjectArea[];
  } | null;
}

export interface SubjectArea {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface Payment {
  id?: string;
  status: PaymentStatus;
  amount: string | null;
  currency: string | null;
  paidAt?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  note?: string | null;
}

export interface ArticleSummary {
  id: string;
  submissionId: string;
  title: string;
  status: ArticleStatus;
  statusLabel: string;
  submittedAt: string;
  currentWordCount: number;
  wordLimitExceeded: boolean;
  subjectArea: SubjectArea | null;
  payment: Payment | null;
  author?: { id: string; firstName: string; lastName: string; email: string };
  editor?: { id: string; firstName: string; lastName: string } | null;
}

export interface CoAuthor {
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string | null;
  isCorresponding: boolean;
}

export interface ManuscriptVersion {
  id?: string;
  versionNumber: number;
  kind: 'ORIGINAL' | 'REVISION';
  wordCount: number;
  changeNote: string | null;
  createdAt: string;
  fileId: string;
  titlePageFileId: string | null;
}

export interface ProofSummary {
  id: string;
  versionNumber: number;
  sentToAuthorAt: string | null;
  authorStatus: 'PENDING_DELIVERY' | 'PENDING_REVIEW' | 'APPROVED' | 'CORRECTIONS_REQUESTED' | 'SUPERSEDED';
  authorRespondedAt?: string | null;
  authorFeedback?: string | null;
  notes?: string | null;
  fileId: string;
  corrections?: Correction[];
}

export interface Correction {
  id: string;
  proofId?: string;
  type: 'MINOR' | 'MAJOR';
  status: 'OPEN' | 'IMPLEMENTED' | 'ESCALATED' | 'APPROVED_BY_EDITOR' | 'REJECTED_BY_EDITOR';
  location: string | null;
  description: string;
  productionNote?: string | null;
  editorNote?: string | null;
  implementedAt?: string | null;
  escalatedAt?: string | null;
  editorDecidedAt?: string | null;
  createdAt?: string;
}

export interface ApprovedComments {
  label: string;
  comments: { section: string; text: string }[];
}

export interface AuthorArticleDetail extends ArticleSummary {
  abstract: string;
  ethicsStatement: string;
  acceptedAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  screeningRejected: boolean;
  coAuthors: CoAuthor[];
  keywords: string[];
  versions: ManuscriptVersion[];
  decisions: { decision: string; authorMessage: string | null; decidedAt: string }[];
  statusHistory: { from: ArticleStatus | null; to: ArticleStatus; at: string; toLabel: string }[];
  proofs: ProofSummary[];
  publication: { status: string; publishedAt: string | null } | null;
  wordLimit: number;
  approvedReviewerComments: ApprovedComments[];
}

export interface AuthorDashboard {
  totals: { status: ArticleStatus; label: string; count: number }[];
  recentSubmissions: ArticleSummary[];
  pendingActions: {
    proofsAwaitingReview: { id: string; versionNumber: number; sentToAuthorAt: string; article: { id: string; submissionId: string; title: string } }[];
    revisionsRequested: { id: string; submissionId: string; title: string }[];
  };
  unreadNotifications: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PlagiarismCheck {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  source: 'API' | 'MANUAL';
  provider: string | null;
  providerReference?: string | null;
  similarityScore: string | null;
  verdict: 'CLEAR' | 'CONCERN' | null;
  reportFileId: string | null;
  notes: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  section: string;
  body: string;
  approvedForAuthor: boolean;
  editedBody: string | null;
  approvedAt?: string | null;
}

export interface EditorReviewRow {
  assignmentId: string;
  slot: number;
  label: string;
  status: 'ASSIGNED' | 'SUBMITTED' | 'DECLINED' | 'REVOKED';
  assignedAt: string;
  dueDate: string | null;
  respondedAt: string | null;
  declineReason: string | null;
  reviewer: { id: string; reviewerCode: string; name: string; email: string; institution: string | null };
  report: { recommendation: string; submittedAt: string; comments: ReviewComment[] } | null;
}

export interface EditorDecisionRow {
  id: string;
  decision: string;
  fromStatus: ArticleStatus;
  toStatus: ArticleStatus;
  notes: string | null;
  authorMessage: string | null;
  decidedAt: string;
  decidedBy: { id: string; firstName: string; lastName: string };
}

export interface EditorArticleDetail extends ArticleSummary {
  abstract: string;
  ethicsStatement: string;
  acceptedAt: string | null;
  closedAt: string | null;
  publishedAt: string | null;
  screeningRejected: boolean;
  coAuthors: CoAuthor[];
  keywords: string[];
  versions: ManuscriptVersion[];
  decisions: EditorDecisionRow[];
  plagiarismChecks: PlagiarismCheck[];
  payment: Payment | null;
  productionTask: { status: string; assignedTo: { id: string; firstName: string; lastName: string } | null; startedAt: string | null; completedAt: string | null } | null;
  reviews: EditorReviewRow[];
}

export interface HistoryRow {
  fromStatus: ArticleStatus | null;
  toStatus: ArticleStatus;
  fromLabel: string | null;
  toLabel: string;
  reason: string | null;
  createdAt: string;
  actorRole: Role | null;
  actor: { id: string; firstName: string; lastName: string } | null;
}

export interface ReviewerProfileRow {
  id: string;
  reviewerCode: string;
  institution: string | null;
  designation: string | null;
  highestQualification: string | null;
  holdsMPharm: boolean;
  yearsTeaching: number;
  qualificationNotes: string | null;
  eligibilityNotes: string | null;
  isActive: boolean;
  approvedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; status: string };
  subjectAreas: SubjectArea[];
  activeAssignments: number;
  meetsProposedEligibility: boolean;
  assignmentHistory?: { status: string; count: number }[];
}

export interface ReviewerApplicationRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  institution: string;
  designation: string | null;
  highestQualification: string;
  holdsMPharm: boolean;
  yearsTeaching: number;
  statement: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  cvFileId: string | null;
  subjectAreas: SubjectArea[];
  meetsProposedEligibility: boolean;
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface EligibilityResult {
  reviewerId: string;
  reviewerCode: string;
  isActive: boolean;
  meetsProposedEligibility: boolean;
  subjectAreaMatch: boolean;
  currentOpenAssignments: number;
  conflicts: string[];
  canBeAssigned: boolean;
  blockers: string[];
}

export interface MajorChangeRow {
  id: string;
  status: Correction['status'];
  location: string | null;
  description: string;
  productionNote: string | null;
  escalatedAt: string | null;
  editorNote: string | null;
  editorDecidedAt: string | null;
  article: { id: string; submissionId: string; title: string };
}

export interface EditorDashboard {
  queues: {
    awaitingScreening: number;
    plagiarismCheck: number;
    readyForReviewerAssignment: number;
    underReview: number;
    awaitingDecision: number;
    majorContentChanges: number;
    pendingReviewerApplications: number;
    overdueReviews: number;
  };
  totals: { status: ArticleStatus; label: string; count: number }[];
  recentSubmissions: ArticleSummary[];
}

export interface AssignmentRow {
  id: string;
  slot: number;
  status: 'ASSIGNED' | 'SUBMITTED' | 'DECLINED' | 'REVOKED';
  assignedAt: string;
  dueDate: string | null;
  respondedAt: string | null;
  article: { id: string; submissionId: string; title: string; status: ArticleStatus; subjectArea: { name: string } | null };
  report: { status: 'DRAFT' | 'SUBMITTED'; recommendation: string | null; submittedAt: string | null } | null;
}

export interface AssignmentDetail extends Omit<AssignmentRow, 'article' | 'report'> {
  version: { versionNumber: number; wordCount: number; fileId: string };
  article: AssignmentRow['article'] & { abstract: string; ethicsStatement: string; keywords: string[] };
  report: { id: string; status: 'DRAFT' | 'SUBMITTED'; recommendation: string | null; submittedAt: string | null; comments: { id: string; section: string; body: string }[] } | null;
  canSubmit: boolean;
}

export interface ReviewerDashboard {
  reviewerCode: string | null;
  counts: { status: string; count: number }[];
  pending: { id: string; dueDate: string | null; assignedAt: string; article: { submissionId: string; title: string } }[];
  overdue: number;
}

export interface ProductionRow {
  id: string;
  submissionId: string;
  title: string;
  status: ArticleStatus;
  statusLabel: string;
  acceptedAt: string | null;
  subjectArea: { name: string } | null;
  productionTask: { status: string; startedAt: string | null; assignedTo: { id: string; firstName: string; lastName: string } | null } | null;
}

export interface PublicationMetadata {
  doi: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  license: string | null;
  copyright: string | null;
  citation: string | null;
  extra?: Record<string, string | number | boolean | null> | null;
}

export interface ProductionDetail extends ProductionRow {
  abstract: string;
  ethicsStatement: string;
  currentWordCount: number;
  coAuthors: CoAuthor[];
  keywords: string[];
  currentManuscript: { versionNumber: number; wordCount: number; fileId: string } | null;
  proofs: ProofSummary[];
  corrections: Correction[];
  publication: { status: string; htmlFileId: string | null; pdfFileId: string | null; publishedAt: string | null; metadata: PublicationMetadata | null } | null;
}

export interface PublicationStaffView {
  article: { submissionId: string; title: string; status: ArticleStatus; statusLabel: string };
  publication: { htmlFileId: string | null; pdfFileId: string | null; status: string; publishedAt: string | null; metadata: PublicationMetadata | null } | null;
  requiredMetadata: string[];
  readiness: { ready: boolean; missing: string[] };
}

export interface PublishedArticle {
  submissionId: string;
  title: string;
  abstract: string;
  publishedAt: string;
  acceptedAt: string | null;
  submittedAt: string;
  subjectArea: SubjectArea | null;
  authors: { firstName: string; lastName: string; affiliation: string | null; isCorresponding: boolean }[];
  keywords: string[];
  metadata: PublicationMetadata | null;
  files: { html: string | null; pdf: string | null };
}

export interface AdminUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  reviewerProfile: { id: string; reviewerCode: string; isActive: boolean } | null;
}

export interface PortalConfig {
  paymentEnabled: boolean;
  wordLimit: number;
  apcEnforcement: 'none' | 'flag' | 'block';
  apcDefaultAmount: number | null;
  apcCurrency: string | null;
  allowRevisionAfterReview: boolean;
  reviewDueDays: number | null;
  reviewerMinYearsTeaching: number;
  publicationRequiredMetadata: string[];
}

export interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  actor: { id: string; name: string; email: string } | null;
  actorRole: Role | null;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
}

export interface AdminDashboard {
  users: { role: Role; status: string; count: number }[];
  articles: { status: ArticleStatus; label: string; count: number }[];
  pendingReviewerApplications: number;
  auditEventsLast24h: number;
}

export interface ProductionDashboard {
  totals: { status: ArticleStatus; label: string; count: number }[];
  awaitingStart: number;
  myOpenTasks: number;
}
