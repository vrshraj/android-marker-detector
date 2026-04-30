import React from 'react';
import {ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {markerTheme} from '../theme/markerTheme';
import {NavBar} from '../components/NavBar';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={[styles.header, {paddingTop: insets.top + 16}]}>
        <Text style={styles.headerTitle}>ALEMENO</Text>
        <Text style={styles.headerSubtitle}>MARKER DETECTOR</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, {paddingBottom: 140}]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About This App</Text>
          <Text style={styles.cardText}>
            The Alemeno Marker Detector uses advanced computer vision to automatically detect and capture our custom markers from your camera feed.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to Use</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Tap the SCAN tab to open the camera.</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Point the camera at a printed Alemeno marker.</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Hold the camera steady. The app will automatically capture the marker.</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Go to the SAVED tab to view your captured markers.</Text>
          </View>
        </View>
      </ScrollView>

      <NavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: markerTheme.border,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    color: markerTheme.primary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: markerTheme.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    color: markerTheme.black,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  cardText: {
    color: markerTheme.gray,
    fontSize: 14,
    lineHeight: 22,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  stepNumber: {
    backgroundColor: markerTheme.accentSoft,
    color: markerTheme.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '800',
    fontSize: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  stepText: {
    color: markerTheme.gray,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
