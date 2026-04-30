import React from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { markerTheme } from '../theme/markerTheme';

interface ScannerHUDProps {
  progress: number; // 0 to 1
  statusText: string;
}

export const ScannerHUD: React.FC<ScannerHUDProps> = ({ progress, statusText }) => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top Info Bar */}
      <View style={styles.topBar}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SCANNING</Text>
        </View>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {/* Reticle */}
      <View style={styles.reticleContainer}>
        <View style={styles.reticle}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* Bottom Notification */}
      <View style={styles.bottomHud}>
        {statusText === 'MARKER CAPTURED' && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>MARKER CAPTURED ✓</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const RETICLE_SIZE = 280;
const CORNER_LEN = 32;
const CORNER_THICK = 4;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 120,
    alignItems: 'center',
    width: '100%',
  },
  badge: {
    backgroundColor: markerTheme.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reticleContainer: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: '100%',
    height: '100%',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: markerTheme.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderBottomRightRadius: 12,
  },
  bottomHud: {
    position: 'absolute',
    bottom: 140,
    alignItems: 'center',
    width: '100%',
  },
  toast: {
    backgroundColor: markerTheme.success || '#2A9D8F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
