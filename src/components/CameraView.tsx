import React, {useEffect} from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  useCameraFormat,
} from 'react-native-vision-camera';

interface Props {
  onCodeDetected?: (value: string) => void;
  isActive?: boolean;
}

export function CameraView({onCodeDetected, isActive = true}: Props) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');

  const format = useCameraFormat(device, [
    { videoResolution: { width: 3840, height: 2160 } }, // try 4K first
    { videoResolution: { width: 2560, height: 1440 } }, // then 1440p
    { videoResolution: { width: 1920, height: 1080 } }, // fallback
  ]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'data-matrix', 'aztec', 'code-128', 'code-39', 'ean-13'],
    onCodeScanned: codes => {
      if (codes.length > 0 && onCodeDetected) {
        onCodeDetected(codes[0].value ?? '');
      }
    },
  });

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.icon}>📷</Text>
        <Text style={styles.message}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.message}>No camera device found</Text>
      </View>
    );
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isActive}
      codeScanner={codeScanner}
      format={format}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 20,
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  button: {
    backgroundColor: '#00C896',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
