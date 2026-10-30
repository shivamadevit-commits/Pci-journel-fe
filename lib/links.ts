import type { Role } from '@/lib/constants/roles';
import type { NotificationItem } from '@/types/domain';

/** Role-specific article page. Editors and the Admin share the /editor pages. */
export function articleHref(role: Role, articleId: string): string {
  switch (role) {
    case 'AUTHOR':
      return `/author/articles/${articleId}`;
    case 'PRODUCTION':
      return `/production/articles/${articleId}`;
    default:
      return `/editor/articles/${articleId}`;
  }
}

export function notificationHref(role: Role, n: Pick<NotificationItem, 'entityType' | 'entityId'>): string | null {
  if (!n.entityId) return null;
  if (n.entityType === 'Article') return articleHref(role, n.entityId);
  if (n.entityType === 'ReviewerAssignment' && role === 'REVIEWER') return `/reviewer/assignments/${n.entityId}`;
  if (n.entityType === 'ReviewerApplication' && (role === 'EDITOR' || role === 'ADMIN')) return '/editor/applications';
  return null;
}

export const fullName = (p?: { firstName: string; lastName: string } | null) => (p ? `${p.firstName} ${p.lastName}` : '—');
