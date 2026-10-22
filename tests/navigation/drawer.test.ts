import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRAWER_MENU_ITEMS,
  getActiveRouteKey,
} from '../../src/components/navigation/drawerConfig.ts';
import type { DrawerRouteKey } from '../../src/components/navigation/drawerConfig.ts';

test('Drawer Menu Items: Exactly 6 documented items exist with valid configuration', () => {
  const expectedKeys: DrawerRouteKey[] = [
    'dashboard',
    'finance',
    'calendar',
    'habits',
    'settings',
    'profile',
  ];

  assert.strictEqual(DRAWER_MENU_ITEMS.length, 6);

  const keys = DRAWER_MENU_ITEMS.map((item) => item.key);
  assert.deepStrictEqual(keys, expectedKeys);

  for (const item of DRAWER_MENU_ITEMS) {
    assert.ok(item.title.length > 0, `Title must not be empty for ${item.key}`);
    assert.ok(item.subtitle.length > 0, `Subtitle must not be empty for ${item.key}`);
    assert.ok(item.route.startsWith('/(tabs)'), `Route must start with /(tabs) for ${item.key}`);
    assert.ok(item.icon.length > 0, `Icon must not be empty for ${item.key}`);
  }
});

test('Drawer Menu Items: Distinct and correct routes are mapped', () => {
  const routeMap = Object.fromEntries(
    DRAWER_MENU_ITEMS.map((item) => [item.key, item.route])
  );

  assert.strictEqual(routeMap.dashboard, '/(tabs)');
  assert.strictEqual(routeMap.finance, '/(tabs)/finance');
  assert.strictEqual(routeMap.calendar, '/(tabs)/calendar');
  assert.strictEqual(routeMap.habits, '/(tabs)/habits');
  assert.strictEqual(routeMap.settings, '/(tabs)/settings');
  assert.strictEqual(routeMap.profile, '/(tabs)/profile');
});

test('getActiveRouteKey: Root and default paths resolve to dashboard', () => {
  assert.strictEqual(getActiveRouteKey('/'), 'dashboard');
  assert.strictEqual(getActiveRouteKey(''), 'dashboard');
  assert.strictEqual(getActiveRouteKey(null), 'dashboard');
  assert.strictEqual(getActiveRouteKey(undefined), 'dashboard');
  assert.strictEqual(getActiveRouteKey('/(tabs)'), 'dashboard');
  assert.strictEqual(getActiveRouteKey('/(tabs)/index'), 'dashboard');
});

test('getActiveRouteKey: Specific tab subpaths map to their corresponding keys', () => {
  assert.strictEqual(getActiveRouteKey('/(tabs)/finance'), 'finance');
  assert.strictEqual(getActiveRouteKey('/finance'), 'finance');

  assert.strictEqual(getActiveRouteKey('/(tabs)/calendar'), 'calendar');
  assert.strictEqual(getActiveRouteKey('/calendar'), 'calendar');

  assert.strictEqual(getActiveRouteKey('/(tabs)/habits'), 'habits');
  assert.strictEqual(getActiveRouteKey('/habits'), 'habits');

  assert.strictEqual(getActiveRouteKey('/(tabs)/settings'), 'settings');
  assert.strictEqual(getActiveRouteKey('/settings'), 'settings');

  assert.strictEqual(getActiveRouteKey('/(tabs)/profile'), 'profile');
  assert.strictEqual(getActiveRouteKey('/profile'), 'profile');
});

test('getActiveRouteKey: Fallback for unknown or unmatched subpaths defaults to dashboard', () => {
  assert.strictEqual(getActiveRouteKey('/unknown-screen'), 'dashboard');
  assert.strictEqual(getActiveRouteKey('/modal'), 'dashboard');
});
