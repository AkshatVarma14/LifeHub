import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Animated,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
  BackHandler,
  StatusBar,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DrawerRouteKey,
  DrawerMenuItem,
  DRAWER_MENU_ITEMS,
  getActiveRouteKey,
} from './drawerConfig';

export * from './drawerConfig';

export interface AppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute?: DrawerRouteKey;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, Math.floor(SCREEN_WIDTH * 0.82));

export function AppDrawer({ isOpen, onClose, activeRoute }: AppDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [isRendered, setIsRendered] = useState(isOpen);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currentActiveKey = activeRoute || getActiveRouteKey(pathname);

  const animateClose = useCallback(
    (callback?: () => void) => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
        onClose();
        if (callback) callback();
      });
    },
    [fadeAnim, onClose, slideAnim]
  );

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isRendered) {
      animateClose();
    }
  }, [isOpen, animateClose, isRendered, slideAnim, fadeAnim]);

  // Intercept hardware back button on Android
  useEffect(() => {
    if (!isOpen) return;
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        animateClose();
        return true;
      }
    );
    return () => backSubscription.remove();
  }, [isOpen, animateClose]);

  const handleNavigate = useCallback(
    (item: DrawerMenuItem) => {
      if (item.key === currentActiveKey) {
        animateClose();
        return;
      }
      animateClose(() => {
        router.navigate(item.route as any);
      });
    },
    [animateClose, currentActiveKey, router]
  );

  if (!isRendered) {
    return null;
  }

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <Modal
      transparent
      visible={isRendered}
      onRequestClose={() => animateClose()}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Dimmed backdrop - touching closes the drawer */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation drawer"
            style={StyleSheet.absoluteFill}
            onPress={() => animateClose()}
          />
        </Animated.View>

        {/* Sliding Drawer Container */}
        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: DRAWER_WIDTH,
              paddingTop: topPadding,
              paddingBottom: bottomPadding,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Drawer Header with Brand & Close Button */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>LH</Text>
              </View>
              <View style={styles.brandTextContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.brandTitle}>LifeHub</Text>
                  <View style={styles.versionPill}>
                    <Text style={styles.versionPillText}>v1.0</Text>
                  </View>
                </View>
                <Text style={styles.brandSubtitle}>Personal Life Operating System</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close navigation menu"
              onPress={() => animateClose()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.headerDivider} />

          {/* Navigation Menu Items */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionHeading}>MODULES & VIEWS</Text>
            {DRAWER_MENU_ITEMS.map((item) => {
              const isActive = item.key === currentActiveKey;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} navigation item`}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => handleNavigate(item)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    isActive && styles.menuItemActive,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      isActive && styles.iconCircleActive,
                    ]}
                  >
                    <Text style={styles.iconText}>{item.icon}</Text>
                  </View>

                  <View style={styles.menuItemTextContainer}>
                    <Text
                      style={[
                        styles.menuItemTitle,
                        isActive && styles.menuItemTitleActive,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.menuItemSubtitle,
                        isActive && styles.menuItemSubtitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  </View>

                  {isActive ? (
                    <View style={styles.activePill}>
                      <View style={styles.activeDot} />
                    </View>
                  ) : (
                    <Text style={styles.chevronText}>›</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Drawer Footer */}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Text style={styles.footerIcon}>🔒</Text>
              <View style={styles.footerTextContainer}>
                <Text style={styles.footerTitle}>100% Offline & Private</Text>
                <Text style={styles.footerSubtitle}>
                  Device-local SQLite • Zero telemetry
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  drawerContainer: {
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  brandBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  versionPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  versionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  buttonPressed: {
    opacity: 0.65,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 18,
    marginBottom: 8,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 52,
  },
  menuItemActive: {
    backgroundColor: '#eff6ff',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircleActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  iconText: {
    fontSize: 18,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  menuItemTitleActive: {
    fontWeight: '800',
    color: '#1d4ed8',
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  menuItemSubtitleActive: {
    color: '#3b82f6',
  },
  activePill: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginRight: 4,
  },
  activeDot: {
    flex: 1,
  },
  chevronText: {
    fontSize: 20,
    color: '#cbd5e1',
    fontWeight: '600',
    marginRight: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  footerIcon: {
    fontSize: 16,
  },
  footerTextContainer: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  footerSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
});
