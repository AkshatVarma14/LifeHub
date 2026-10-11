import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function OverviewScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>System Overview</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

      <View style={styles.listContainer}>
        <View style={styles.itemRow}>
          <Text style={styles.label}>Architecture:</Text>
          <Text style={styles.value}>React Native + Expo SDK 57 + TypeScript</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.label}>Navigation:</Text>
          <Text style={styles.value}>Expo Router (File-based)</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.label}>Primary Demo:</Text>
          <Text style={styles.value}>Android (Simulator / Expo Go)</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.label}>Persistence:</Text>
          <Text style={styles.value}>expo-sqlite (Stage 1)</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.label}>State Management:</Text>
          <Text style={styles.value}>React Context & Hooks</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.label}>Backend & Sync:</Text>
          <Text style={styles.value}>Deferred (Local-first MVP)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: '80%',
  },
  listContainer: {
    width: '100%',
    maxWidth: 420,
    padding: 16,
    borderRadius: 12,
  },
  itemRow: {
    marginVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
  value: {
    fontSize: 15,
    marginTop: 2,
  },
});
