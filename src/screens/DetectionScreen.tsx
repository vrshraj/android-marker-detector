import React, {useCallback, useState} from 'react';
import {StyleSheet, View, Text, StatusBar, TouchableOpacity} from 'react-native';
import {CameraView} from '../components/CameraView';
import {MarkerOverlay} from '../components/MarkerOverlay';

export function DetectionScreen() {
  const [detectedValue, setDetectedValue] = useState<string>('');
  const [isScanning, setIsScanning] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  const handleCodeDetected = useCallback((value: string) => {
    if (value === detectedValue) {
      return;
    }
    setDetectedValue(value);
    setHistory(prev => [value, ...prev.slice(0, 4)]);
  }, [detectedValue]);

  const handleClear = () => {
    setDetectedValue('');
    setHistory([]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Camera feed */}
      <CameraView onCodeDetected={handleCodeDetected} isActive={isScanning} />

      {/* Scanning frame guide */}
      <View style={styles.frameContainer} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.hint}>Point at a QR code or barcode</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MarkerDetector</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* History */}
      {history.length > 1 && (
        <View style={styles.historyContainer}>
          {history.slice(1).map((item, idx) => (
            <View key={idx} style={styles.historyItem}>
              <Text style={styles.historyText} numberOfLines={1}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Detected marker overlay */}
      <MarkerOverlay value={detectedValue} visible={detectedValue.length > 0} />
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  clearText: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.8,
  },
  frameContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#00C896',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 20,
    textAlign: 'center',
  },
  historyContainer: {
    position: 'absolute',
    top: 110,
    right: 16,
    gap: 6,
  },
  historyItem: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  historyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
});
