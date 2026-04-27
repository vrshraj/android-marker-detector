import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Camera, useCameraDevice, type CameraDeviceFormat} from 'react-native-vision-camera';
import {useMarkerDetectorFrameProcessor} from './src/hooks/useMarkerDetectorFrameProcessor';

type PermissionState = 'checking' | 'granted' | 'denied';

const MAX_RESOLUTION = {width: 3000, height: 3000};
const MIN_RESOLUTION = {width: 2000, height: 2000};
const PREFERRED_FPS = 30;

type FormatSelection = {
  format: CameraDeviceFormat | undefined;
  fps: number;
  reason: string;
  requirementMet: boolean;
};

function clampFps(format: CameraDeviceFormat | undefined, preferred: number): number {
  if (format == null) {
    return preferred;
  }
  if (preferred < format.minFps) {
    return format.minFps;
  }
  if (preferred > format.maxFps) {
    return format.maxFps;
  }
  return preferred;
}

function pickBestFormat(formats: CameraDeviceFormat[]): FormatSelection {
  if (formats.length === 0) {
    return {
      format: undefined,
      fps: PREFERRED_FPS,
      reason: 'No formats reported by camera device.',
      requirementMet: false,
    };
  }

  const inRange = formats.filter(f => {
    return (
      f.videoWidth >= MIN_RESOLUTION.width &&
      f.videoHeight >= MIN_RESOLUTION.height &&
      f.videoWidth <= MAX_RESOLUTION.width &&
      f.videoHeight <= MAX_RESOLUTION.height
    );
  });

  if (inRange.length > 0) {
    // Pick the format closest to 3000x3000 while staying in range.
    const bestInRange = inRange.sort((a, b) => {
      const areaA = a.videoWidth * a.videoHeight;
      const areaB = b.videoWidth * b.videoHeight;
      const areaTarget = MAX_RESOLUTION.width * MAX_RESOLUTION.height;
      const areaDeltaA = Math.abs(areaTarget - areaA);
      const areaDeltaB = Math.abs(areaTarget - areaB);

      if (areaDeltaA !== areaDeltaB) {
        return areaDeltaA - areaDeltaB;
      }

      const fpsPenaltyA = Math.abs(clampFps(a, PREFERRED_FPS) - PREFERRED_FPS);
      const fpsPenaltyB = Math.abs(clampFps(b, PREFERRED_FPS) - PREFERRED_FPS);
      return fpsPenaltyA - fpsPenaltyB;
    })[0];

    return {
      format: bestInRange,
      fps: clampFps(bestInRange, PREFERRED_FPS),
      reason: 'Selected format inside required 2000..3000 bounds.',
      requirementMet: true,
    };
  }

  const atOrAboveShorter2000 = formats.filter(f => {
    const shorterSide = Math.min(f.videoWidth, f.videoHeight);
    return shorterSide >= 2000;
  });

  if (atOrAboveShorter2000.length > 0) {
    // Assignment fallback: choose closest format at or above 2000 on shorter side.
    const bestFallback = atOrAboveShorter2000.sort((a, b) => {
      const shorterA = Math.min(a.videoWidth, a.videoHeight);
      const shorterB = Math.min(b.videoWidth, b.videoHeight);
      const deltaA = shorterA - 2000;
      const deltaB = shorterB - 2000;

      if (deltaA !== deltaB) {
        return deltaA - deltaB;
      }

      const areaA = a.videoWidth * a.videoHeight;
      const areaB = b.videoWidth * b.videoHeight;
      return areaA - areaB;
    })[0];

    return {
      format: bestFallback,
      fps: clampFps(bestFallback, PREFERRED_FPS),
      reason: 'No exact 2000..3000 match. Using closest format with shorter side >= 2000.',
      requirementMet: false,
    };
  }

  // Final fallback: device cannot reach 2000 on shorter side.
  const maxAvailable = formats.sort((a, b) => {
    const areaA = a.videoWidth * a.videoHeight;
    const areaB = b.videoWidth * b.videoHeight;
    if (areaA !== areaB) {
      return areaB - areaA; // sort descending by area
    }
    const shorterA = Math.min(a.videoWidth, a.videoHeight);
    const shorterB = Math.min(b.videoWidth, b.videoHeight);
    return shorterB - shorterA; // tie-breaker: sort by shorter side
  })[0];

  return {
    format: maxAvailable,
    fps: clampFps(maxAvailable, PREFERRED_FPS),
    reason: 'Device does not support shorter side >= 2000. Using maximum available format.',
    requirementMet: false,
  };
}

export default function App() {
  const device = useCameraDevice('back');
  const {frameProcessor} = useMarkerDetectorFrameProcessor();

  const formatSelection = pickBestFormat(device?.formats ?? []);
  const selectedFormat = formatSelection.format;
  const selectedFps = formatSelection.fps;

  const [permissionState, setPermissionState] = useState<PermissionState>('checking');

  useEffect(() => {
    const requestPermission = async () => {
      const current = await Camera.getCameraPermissionStatus();

      if (current === 'granted') {
        setPermissionState('granted');
        return;
      }

      const next = await Camera.requestCameraPermission();
      setPermissionState(next === 'granted' ? 'granted' : 'denied');
    };

    requestPermission();
  }, []);

  useEffect(() => {
    if (!device) {
      return;
    }

    const lines = device.formats.map((f, index) => {
      return `${index + 1}) ${f.videoWidth}x${f.videoHeight} @ ${f.minFps}-${f.maxFps}fps`;
    });

    console.log(`Available camera formats (${device.formats.length}):\n${lines.join('\n')}`);
    console.log(`Selected format: ${selectedFormat?.videoWidth ?? 'unknown'}x${selectedFormat?.videoHeight ?? 'unknown'} @ ${selectedFps}fps`);
    console.log(`Selection note: ${formatSelection.reason}`);
  }, [device, selectedFormat, selectedFps, formatSelection.reason]);

  if (permissionState === 'denied') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.overlayText}>Permission Denied</Text>
      </View>
    );
  }

  if (permissionState !== 'granted' || !device || !selectedFormat) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.overlayText}>
          {permissionState !== 'granted' ? 'Requesting Camera...' : 'Selecting Camera Format...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={selectedFormat}
        isActive={true}
        fps={selectedFps}
        photo={true}
        video={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={60}
      />

      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.overlayText}>Camera Ready</Text>
        <Text style={styles.resultText}>
          video: {selectedFormat.videoWidth} x {selectedFormat.videoHeight} @ {selectedFps}fps
        </Text>
        <Text style={styles.resultText}>
          photo: {selectedFormat.photoWidth} x {selectedFormat.photoHeight}
        </Text>
        <Text style={styles.resultText}>
          requirement met: {String(formatSelection.requirementMet)}
        </Text>
        <Text style={styles.resultText}>{formatSelection.reason}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    alignItems: 'center',
    paddingTop: 48,
  },
  overlayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resultText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
