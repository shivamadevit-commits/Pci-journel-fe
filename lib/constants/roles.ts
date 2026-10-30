import { BookOpenCheck, ClipboardList, FileText, Gauge, Layers, LayoutDashboard, ScrollText, Settings2, ShieldCheck, Tags, UserCheck, Users, Bell, UserCog, FilePlus2, History, GitPullRequestArrow, Newspaper, type LucideIcon } from 'lucide-react';

export type Role = 'ADMIN' | 'EDITOR' | 'REVIEWER' | 'AUTHOR' | 'PRODUCTION';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  REVIEWER: 'Reviewer',
  AUTHOR: 'Author',
  PRODUCTION: 'Production Team',
};

export const ROLE_HOME: Record<Role, string> = {
  AUTHOR: '/author',
  REVIEWER: '/reviewer',
  PRODUCTION: '/production',
  EDITOR: '/editor',
  ADMIN: '/admin',
};

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** exact match for active state */
  exact?: boolean;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

const editorial: NavGroup = {
  label: 'Editorial',
  items: [
    { label: 'Dashboard', href: '/editor', icon: LayoutDashboard, exact: true },
    { label: 'Manuscripts', href: '/editor/articles', icon: FileText },
    { label: 'Reviewer pool', href: '/editor/reviewers', icon: UserCheck },
    { label: 'Reviewer applications', href: '/editor/applications', icon: ClipboardList },
    { label: 'Major changes', href: '/editor/major-changes', icon: GitPullRequestArrow },
  ],
};

const account: NavGroup = {
  label: 'Account',
  items: [
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Profile & security', href: '/profile', icon: UserCog },
  ],
};

export const NAV: Record<Role, NavGroup[]> = {
  AUTHOR: [
    {
      label: 'Author',
      items: [
        { label: 'Dashboard', href: '/author', icon: LayoutDashboard, exact: true },
        { label: 'My submissions', href: '/author/articles', icon: FileText, exact: true },
        { label: 'New submission', href: '/author/articles/new', icon: FilePlus2 },
      ],
    },
    account,
  ],
  REVIEWER: [
    {
      label: 'Reviewer',
      items: [
        { label: 'Dashboard', href: '/reviewer', icon: LayoutDashboard, exact: true },
        { label: 'Assigned manuscripts', href: '/reviewer/assignments', icon: BookOpenCheck },
        { label: 'Review history', href: '/reviewer/history', icon: History },
      ],
    },
    account,
  ],
  PRODUCTION: [
    {
      label: 'Production',
      items: [
        { label: 'Dashboard', href: '/production', icon: Gauge, exact: true },
        { label: 'Production queue', href: '/production/articles', icon: Layers },
      ],
    },
    account,
  ],
  EDITOR: [editorial, account],
  ADMIN: [
    {
      label: 'Administration',
      items: [
        { label: 'Dashboard', href: '/admin', icon: ShieldCheck, exact: true },
        { label: 'Users & roles', href: '/admin/users', icon: Users },
        { label: 'Subject areas', href: '/admin/subject-areas', icon: Tags },
        { label: 'Portal configuration', href: '/admin/config', icon: Settings2 },
        { label: 'Audit log', href: '/admin/audit', icon: ScrollText },
      ],
    },
    {
      ...editorial,
      items: [{ label: 'Manuscripts', href: '/editor/articles', icon: FileText }, ...editorial.items.slice(2)],
    },
    account,
  ],
};

export const PUBLIC_NAV = [{ label: 'Published articles', href: '/articles', icon: Newspaper }];
