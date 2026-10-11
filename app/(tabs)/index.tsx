import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LifeHub</Text>
      <Text style={styles.subtitle}>Personal Life Management</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <View style={styles.card} lightColor="#f9f9f9" darkColor="#1a1a1a">
        <Text style={styles.cardHeader}>Stage 0: Application Scaffold</Text>
        <Text style={styles.cardBody}>
          Welcome to LifeHub! The mobile foundation is running with Expo Router and TypeScript.
        </Text>
        <Text style={styles.cardNote}>
          Core offline modules (Finance, Calendar, Habits) will be enabled in subsequent milestones.
        </Text>
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
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  separator: {
    marginVertical: 24,
    height: 1,
    width: '80%',
  },
  card: {
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardNote: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
});
