import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {StyleSheet, View} from 'react-native';

import SplashScreen from '../screens/SplashScreen';
import DetectionScreen from '../screens/DetectionScreen';
import ResultsScreen from '../screens/ResultsScreen';
import HomeScreen from '../screens/HomeScreen';
import {markerLayout, markerTheme, type MarkerTabKey} from '../theme/markerTheme';

/**
 * Global application state interface.
 */
interface MarkerState {
  markers: string[];
  setMarkers: (markers: string[]) => void;
  addMarker: (imageBase64: string) => void;
  resetMarkers: () => void;
  activeTab: MarkerTabKey;
  setActiveTab: (tab: MarkerTabKey) => void;
  capturePulseKey: number;
  triggerCapturePulse: () => void;
}

const MarkerContext = createContext<MarkerState | null>(null);

/**
 * Hook to access the global marker state.
 */
export const useMarkerStore = () => {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error('useMarkerStore must be used within an AppNavigator provider');
  }
  return context;
};

/**
 * Main application content container.
 * Handles conditional rendering based on the active tab.
 */
const AppContent = () => {
  const {activeTab} = useMarkerStore();

  return (
    <View style={styles.container}>
      <View style={styles.viewport}>
        {activeTab === 'Home' && <HomeScreen />}
        {activeTab === 'Detection' && <DetectionScreen />}
        {activeTab === 'Results' && <ResultsScreen />}
      </View>
    </View>
  );
};

/**
 * Root Navigator and State Provider.
 * Manages global state including detected markers and navigation tabs.
 */
export default function AppNavigator() {
  const [markers, setMarkers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<MarkerTabKey>('Detection');
  const [capturePulseKey, setCapturePulseKey] = useState(0);
  const [isMainVisible, setIsMainVisible] = useState(false);

  /**
   * Safe marker addition logic.
   */
  const addMarker = useCallback((imageBase64: string) => {
    setMarkers(prev => {
      if (prev.length >= markerLayout.maxMarkers || prev.includes(imageBase64)) {
        return prev;
      }
      return [...prev, imageBase64];
    });
    setCapturePulseKey(k => k + 1);
  }, []);

  const resetMarkers = useCallback(() => {
    setMarkers([]);
  }, []);

  const triggerCapturePulse = useCallback(() => {
    setCapturePulseKey(k => k + 1);
  }, []);

  const storeValue = useMemo<MarkerState>(() => ({
    markers,
    setMarkers,
    addMarker,
    resetMarkers,
    activeTab,
    setActiveTab,
    capturePulseKey,
    triggerCapturePulse,
  }), [markers, activeTab, capturePulseKey, addMarker, resetMarkers, triggerCapturePulse]);

  return (
    <MarkerContext.Provider value={storeValue}>
      {isMainVisible ? (
        <AppContent />
      ) : (
        <SplashScreen onContinue={() => setIsMainVisible(true)} />
      )}
    </MarkerContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: markerTheme.background,
  },
  viewport: {
    flex: 1,
  },
});
