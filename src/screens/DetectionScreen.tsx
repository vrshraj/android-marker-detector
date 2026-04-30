import React, {useEffect, useMemo, useState, useRef} from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Camera, useCameraDevice, useCameraFormat} from 'react-native-vision-camera';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useMarkerDetectorFrameProcessor} from '../hooks/useMarkerDetectorFrameProcessor';
import {useMarkerStore} from '../navigation/AppNavigator';
import {ScannerHUD} from '../components/ScannerHUD';
import {NavBar} from '../components/NavBar';
import {markerLayout, markerTheme} from '../theme/markerTheme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

/**
 * Main camera detection interface.
 * Handles the frame processor lifecycle, manual capture logic, and HUD state.
 */
export default function DetectionScreen() {
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('back');
  
  // Camera configuration
  const format = useCameraFormat(device, [
    { videoResolution: { width: 3840, height: 2160 } },
    { videoResolution: { width: 1920, height: 1080 } },
  ]);

  // Global store and navigation
  const {
    markers: storeMarkers,
    setMarkers: setStoreMarkers,
    activeTab,
    setActiveTab,
    triggerCapturePulse,
  } = useMarkerStore();
  
  // Local state
  const markersRef = useRef<string[]>(storeMarkers);
  const [markers, setMarkers] = useState<string[]>(storeMarkers);
  const [captureFeedback, setCaptureFeedback] = useState(false);
  const [isMarkerInFrame, setIsMarkerInFrame] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<string | null>(null);

  const {frameProcessor, result} = useMarkerDetectorFrameProcessor();

  /**
   * Monitor the frame processor output.
   * Updates UI state when a marker enters or leaves the frame.
   */
  useEffect(() => {
    const isDetected = result?.value?.detected === true;
    setIsMarkerInFrame(isDetected);
    
    if (isDetected && result?.value?.imageBase64) {
      setPendingMarker(result.value.imageBase64);
    }
  }, [result?.value?.detected, result?.value?.timestamp]);

  /**
   * Performs the actual capture and saves it to the global store.
   */
  const handleCapture = () => {
    if (!pendingMarker || markers.length >= markerLayout.maxMarkers) return;
    
    if (!markersRef.current.includes(pendingMarker)) {
      const updatedMarkers = [...markersRef.current, pendingMarker];
      markersRef.current = updatedMarkers;
      setMarkers(updatedMarkers);
      setStoreMarkers(updatedMarkers);
      
      triggerCapturePulse();
      setCaptureFeedback(true);
      setPendingMarker(null);
    }
  };

  // Feedback timeout
  useEffect(() => {
    if (!captureFeedback) return;
    const timer = setTimeout(() => setCaptureFeedback(false), 900);
    return () => clearTimeout(timer);
  }, [captureFeedback]);

  // Navigate to results once batch is full
  useEffect(() => {
    if (markers.length >= markerLayout.maxMarkers && activeTab !== 'Results') {
      setActiveTab('Results');
    }
  }, [activeTab, markers.length, setActiveTab]);

  const progress = useMemo(() => {
    return Math.min(markers.length, markerLayout.maxMarkers) / markerLayout.maxMarkers;
  }, [markers.length]);

  if (!device) {
    return <View style={styles.fallback} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        format={format}
        resizeMode="cover"
        frameProcessor={frameProcessor}
        frameProcessorFps={10}
      />

      <View style={styles.overlay} />

      <Header insets={insets} count={markers.length} max={markerLayout.maxMarkers} />

      <ScannerHUD 
        progress={progress} 
        statusText={
          captureFeedback 
            ? 'MARKER CAPTURED' 
            : isMarkerInFrame 
              ? 'READY TO CAPTURE' 
              : 'POSITION MARKER IN FRAME'
        } 
      />

      <CaptureArea 
        insets={insets}
        active={isMarkerInFrame}
        limitReached={markers.length >= markerLayout.maxMarkers}
        onCapture={handleCapture}
      />

      <NavBar />
    </View>
  );
}

/**
 * Top branding and status header
 */
const Header = ({insets, count, max}: {insets: any, count: number, max: number}) => (
  <View style={[styles.header, {paddingTop: insets.top + 16}]}>
    <Text style={styles.headerTitle}>ALEMENO <Text style={styles.headerAccent}>MARKER</Text></Text>
    <View style={styles.batchContainer}>
      <Text style={styles.batchText}>{count}/{max}</Text>
    </View>
  </View>
);

/**
 * Bottom capture control area
 */
const CaptureArea = ({insets, active, limitReached, onCapture}: any) => (
  <View 
    style={[styles.captureContainer, {paddingBottom: insets.bottom + 140}]}
    pointerEvents="box-none"
  >
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onCapture}
      disabled={!active || limitReached}
      style={[
        styles.captureButton,
        (!active || limitReached) && styles.captureButtonDisabled
      ]}
    >
      <View style={[
        styles.captureInner,
        active && styles.captureInnerActive
      ]}>
        <View style={styles.captureDot} />
      </View>
    </TouchableOpacity>
    <Text style={[
      styles.captureLabel,
      !active && styles.captureLabelDisabled
    ]}>
      {active ? 'TAP TO CAPTURE' : 'SEARCHING...'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fallback: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: markerTheme.border,
    zIndex: 10,
  },
  headerTitle: {
    color: markerTheme.black,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerAccent: {
    fontWeight: '300',
    color: markerTheme.accent,
  },
  batchContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  batchText: {
    color: markerTheme.primary,
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  captureContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  captureButtonDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInnerActive: {
    backgroundColor: markerTheme.accent,
  },
  captureDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  captureLabel: {
    marginTop: 12,
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captureLabelDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
