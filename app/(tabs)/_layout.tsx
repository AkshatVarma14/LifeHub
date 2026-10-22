import React, { useState, useCallback } from 'react';
import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { StyleSheet, View, Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { AppDrawer } from '@/src/components/navigation/AppDrawer';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme].tint,
          // Disable the static render of the header on web
          // to prevent a hydration error in React Navigation v6.
          headerShown: useClientOnlyValue(false, true),
          tabBarStyle: { display: 'none' }, // Hides the bottom navigation tab bar completely
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
              onPress={handleOpenDrawer}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => [
                styles.hamburgerButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.hamburgerIcon}>
                <View
                  style={[
                    styles.hamburgerBar,
                    { backgroundColor: Colors[colorScheme].text },
                  ]}
                />
                <View
                  style={[
                    styles.hamburgerBar,
                    { backgroundColor: Colors[colorScheme].text },
                  ]}
                />
                <View
                  style={[
                    styles.hamburgerBar,
                    { backgroundColor: Colors[colorScheme].text },
                  ]}
                />
              </View>
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            headerRight: () => (
              <Link href="/modal" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="About LifeHub"
                  style={{ marginRight: 15 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {({ pressed }) => (
                    <SymbolView
                      name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                      size={24}
                      tintColor={Colors[colorScheme].text}
                      style={{ opacity: pressed ? 0.5 : 1 }}
                    />
                  )}
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: 'Finance',
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
          }}
        />
        <Tabs.Screen
          name="habits"
          options={{
            title: 'Habits & Focus',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
      </Tabs>

      <AppDrawer isOpen={drawerOpen} onClose={handleCloseDrawer} />
    </>
  );
}

const styles = StyleSheet.create({
  hamburgerButton: {
    marginLeft: 14,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerIcon: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  hamburgerBar: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  buttonPressed: {
    opacity: 0.5,
  },
});
