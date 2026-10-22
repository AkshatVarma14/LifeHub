import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';

export default function ProfileScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header Card */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>LH</Text>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>LifeHub Demo User</Text>
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>Local Account</Text>
            </View>
          </View>
          <Text style={styles.profileRole}>PBL Student Demo Persona</Text>
          <Text style={styles.profileEmail}>offline.user@lifehub.local</Text>
        </View>
      </View>

      {/* Roadmap Scope Notice */}
      <View style={styles.noticeCard}>
        <Text style={styles.noticeBadge}>STAGE 2 ROADMAP NOTICE</Text>
        <Text style={styles.noticeText}>
          LifeHub operates without a cloud backend or third-party user identity
          providers. User accounts are maintained purely on device. Customizable
          profiles and cryptographic vaults will expand in Stage 3 and Stage 4.
        </Text>
      </View>

      {/* Section: Identity & Preferences */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>IDENTITY & PERSONALIZATION</Text>

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Display Name</Text>
          <Text style={styles.itemValue}>Demo User</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Account Type</Text>
          <Text style={styles.itemValue}>Device-Local (Offline First)</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Profile Customization</Text>
          <Text style={styles.itemSubvalue}>Scheduled for Stage 2 expansion</Text>
        </View>
      </View>

      {/* Section: Productivity & Wellness Preferences */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>PRODUCTIVITY & WELLNESS PREFERENCES</Text>

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Focus Timer Default</Text>
          <Text style={styles.itemValue}>25 minutes (Pomodoro)</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Habit Streaks</Text>
          <Text style={styles.itemValue}>Active & Tracked</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Fitness & Nutrition Logs</Text>
          <Text style={styles.itemSubvalue}>Planned for Stage 3</Text>
        </View>
      </View>

      {/* Section: Privacy & Security */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>PRIVACY & SECURITY</Text>

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Data Residency</Text>
          <Text style={styles.itemValue}>100% On-Device Only</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Third-Party Trackers</Text>
          <Text style={styles.itemValue}>None (0 SDKs)</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Encrypted Vault (Sensitive Notes)</Text>
          <Text style={styles.itemSubvalue}>Planned for Stage 4</Text>
        </View>
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
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  offlineBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  offlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  itemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSubvalue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
});
