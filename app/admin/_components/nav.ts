export type AdminNavItem = {
  href: string;
  label: string;
};

export const adminNavItems: AdminNavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/calendar', label: 'Calendar' },
  { href: '/admin/reservations', label: 'Reservations' },
  { href: '/admin/requests', label: 'Requests' },
  { href: '/admin/properties', label: 'Properties' },
  { href: '/admin/users', label: 'Users & Trust' },
  { href: '/admin/inbox', label: 'Inbox' },
  { href: '/admin/ops', label: 'Ops Tasks' },
  { href: '/admin/disputes', label: 'Disputes' },
  { href: '/admin/finance', label: 'Finance' },
  { href: '/admin/settings', label: 'Settings' },
];
