import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Line} from 'react-native-svg';
import {markerTheme} from '../theme/markerTheme';

type Props = {
  size?: number;
  scanning?: boolean;
  flashTrigger?: number;
};

export default function ViewfinderOverlay({size = 240, scanning = true, flashTrigger = 0}: Props) {
  const bracket = 28;
  const stroke = 3;

  return (
    <View pointerEvents="none" style={[styles.container, {width: size, height: size}]}> 
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Line x1={0} y1={0} x2={bracket} y2={0} stroke={markerTheme.accent} strokeWidth={stroke} strokeLinecap="round" />
        <Line x1={0} y1={0} x2={0} y2={bracket} stroke={markerTheme.accent} strokeWidth={stroke} strokeLinecap="round" />

        <Line x1={size - bracket} y1={0} x2={size} y2={0} stroke={markerTheme.accent} strokeWidth={stroke} strokeLinecap="round" />
        <Line x1={size} y1={0} x2={size} y2={bracket} stroke={markerTheme.accent} strokeWidth={stroke} strokeLinecap="round" />

        <Line x1={0} y1={size - bracket} x2={0} y2={size} stroke={markerTheme.accent} strokeWidth={stroke} strokeLinecap="round" />
        <Line x1={0} y1={size} x2={bracket} y2={size} stroke={markerTheme.accent} strokeWidth={stroke} strokeLinecap="round" />

        <Line x1={size - bracket} y1={size} x2={size} y2={size} stroke={markerTheme.accent} strokeWidth={stroke} strokeLinecap="round" />
        <Line x1={size} y1={size - bracket} x2={size} y2={size} stroke={markerTheme.accent} strokeWidth={stroke} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});
