import React, {useMemo, useState} from 'react';
import {Alert, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Camera} from 'react-native-vision-camera';
import {markerTheme} from '../theme/markerTheme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';

type Props = {
  onContinue: () => void;
};



export default function SplashScreen({onContinue}: Props) {
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handlePermission = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const status = await Camera.getCameraPermissionStatus();
      const nextStatus = status === 'granted' ? status : await Camera.requestCameraPermission();

      if (nextStatus === 'granted') {
        onContinue();
        return;
      }
      Alert.alert('Camera permission required', 'Enable camera access to continue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Svg width="64" height="64" viewBox="0 0 24 24" fill={markerTheme.primary}>
            <Path d="M12 2L2 9l3.5 11h13L22 9l-10-7zm0 3.5L16 11l-4 5.5L8 11l4-5.5z" />
          </Svg>
        </View>

        <Text style={styles.title}>ALEMENO</Text>
        <Text style={styles.subtitle}>MARKER DETECTOR</Text>

        <Pressable onPress={handlePermission} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>{loading ? 'INITIALIZING...' : 'GET STARTED'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: markerTheme.gray,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 48,
  },
  button: {
    backgroundColor: markerTheme.accent,
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: markerTheme.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
