import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIconText}>⚙️</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Settings & Preferences</Text>
          <Text style={styles.headerSubtitle}>
            Configure local device behavior, storage, and privacy controls.
          </Text>
        </View>
      </View>

      {/* Section: Stage Roadmap Context */}
      <View style={styles.noticeCard}>
        <Text style={styles.noticeBadge}>STAGE 2 ROADMAP NOTICE</Text>
        <Text style={styles.noticeText}>
          LifeHub operates as a 100% offline, privacy-first application. Settings
          controls below outline the configuration architecture planned across
          Stage 2 (Stabilize) and Stage 3 (Module Expansion).
        </Text>
      </View>

      {/* Section: Appearance */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>APPEARANCE & THEME</Text>
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Color Scheme</Text>
            <Text style={styles.optionDescription}>
              Follows system appearance (automatic dark and light mode).
            </Text>
          </View>
          <View style={styles.badgeActive}>
            <Text style={styles.badgeActiveText}>System Default</Text>
          </View>
        </View>
      </View>

      {/* Section: Persistence & Storage */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>STORAGE & LOCAL PERSISTENCE</Text>
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Storage Engine</Text>
            <Text style={styles.optionDescription}>
              Local-first SQLite database (`lifehub.db`).
            </Text>
          </View>
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeSuccessText}>Active (Local)</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Cloud Telemetry</Text>
            <Text style={styles.optionDescription}>
              Zero remote analytics, tracking, or cloud storage.
            </Text>
          </View>
          <View style={styles.badgeNeutral}>
            <Text style={styles.badgeNeutralText}>Disabled (Zero Sync)</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Demo Data</Text>
            <Text style={styles.optionDescription}>
              Load realistic sample records from the Daily Dashboard quick-start card.
            </Text>
          </View>
          <View style={styles.badgeActive}>
            <Text style={styles.badgeActiveText}>Available</Text>
          </View>
        </View>
      </View>

      {/* Section: Notifications */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>NOTIFICATIONS & ALERTS</Text>
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Local Event Reminders</Text>
            <Text style={styles.optionDescription}>
              Local-only push notifications for upcoming events (planned for Stage 3).
            </Text>
          </View>
          <View style={styles.badgeNeutral}>
            <Text style={styles.badgeNeutralText}>Stage 3 Planned</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Habit Consistency Nudges</Text>
            <Text style={styles.optionDescription}>
              Daily reminders to complete active habits without cloud services.
            </Text>
          </View>
          <View style={styles.badgeNeutral}>
            <Text style={styles.badgeNeutralText}>Stage 3 Planned</Text>
          </View>
        </View>
      </View>

      {/* Section: About & System Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>ABOUT LIFEHUB</Text>
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Application Version</Text>
            <Text style={styles.optionDescription}>
              LifeHub v1.0.0 (Stage 2 Stabilize Baseline)
            </Text>
          </View>
          <View style={styles.badgeNeutral}>
            <Text style={styles.badgeNeutralText}>v1.0.0</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open About LifeHub modal"
          onPress={() => router.push('/modal')}
          style={({ pressed }) => [
            styles.aboutButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.aboutButtonText}>View Project Information & Architecture</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  headerIconText: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  noticeCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noticeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  badgeActive: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  badgeActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  badgeSuccess: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  badgeNeutral: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeNeutralText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  aboutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  chevron: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.65,
  },
});
