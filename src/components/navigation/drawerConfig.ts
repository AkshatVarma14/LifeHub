export type DrawerRouteKey =
  | 'dashboard'
  | 'finance'
  | 'calendar'
  | 'habits'
  | 'settings'
  | 'profile';

export interface DrawerMenuItem {
  key: DrawerRouteKey;
  title: string;
  subtitle: string;
  route: string;
  icon: string;
}

export const DRAWER_MENU_ITEMS: DrawerMenuItem[] = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Daily highlights & overview',
    route: '/(tabs)',
    icon: '📊',
  },
  {
    key: 'finance',
    title: 'Finance',
    subtitle: 'Budgets & expense tracking',
    route: '/(tabs)/finance',
    icon: '💳',
  },
  {
    key: 'calendar',
    title: 'Calendar',
    subtitle: 'Schedule & upcoming events',
    route: '/(tabs)/calendar',
    icon: '📅',
  },
  {
    key: 'habits',
    title: 'Habits & Focus',
    subtitle: 'Daily streaks & focus timer',
    route: '/(tabs)/habits',
    icon: '⏱️',
  },
  {
    key: 'settings',
    title: 'Settings',
    subtitle: 'Preferences & local storage',
    route: '/(tabs)/settings',
    icon: '⚙️',
  },
  {
    key: 'profile',
    title: 'Profile',
    subtitle: 'User identity & offline vault',
    route: '/(tabs)/profile',
    icon: '👤',
  },
];

export function getActiveRouteKey(pathname?: string | null): DrawerRouteKey {
  if (!pathname || pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index') {
    return 'dashboard';
  }
  const clean = pathname.toLowerCase();
  if (clean.includes('finance')) return 'finance';
  if (clean.includes('calendar')) return 'calendar';
  if (clean.includes('habits')) return 'habits';
  if (clean.includes('settings')) return 'settings';
  if (clean.includes('profile')) return 'profile';
  return 'dashboard';
}
