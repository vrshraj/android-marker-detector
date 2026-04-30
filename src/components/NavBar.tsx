import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path, Circle, Rect, Line, Polyline} from 'react-native-svg';
import {useMarkerStore} from '../navigation/AppNavigator';
import {markerTheme, type MarkerTabKey} from '../theme/markerTheme';

export const NavBar = () => {
  const insets = useSafeAreaInsets();
  const {activeTab, setActiveTab} = useMarkerStore();

  return (
    <View style={[styles.navBar, {paddingBottom: Math.max(insets.bottom, 16)}]}>
      <TabButton
        tabKey="Home"
        label="HOME"
        active={activeTab === 'Home'}
        onPress={() => setActiveTab('Home')}
      />
      <TabButton
        tabKey="Detection"
        label="SCAN"
        active={activeTab === 'Detection'}
        onPress={() => setActiveTab('Detection')}
      />
      <TabButton
        tabKey="Results"
        label="SAVED"
        active={activeTab === 'Results'}
        onPress={() => setActiveTab('Results')}
      />
    </View>
  );
};

type TabButtonProps = {
  tabKey: MarkerTabKey;
  label: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({tabKey, label, active, onPress}: TabButtonProps) {
  const color = active ? markerTheme.accent : markerTheme.gray;
  
  const renderIcon = () => {
    switch (tabKey) {
      case 'Home':
        return (
          <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" />
          </Svg>
        );
      case 'Detection':
        return (
          <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="3" />
            <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          </Svg>
        );
      case 'Results':
        return (
          <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <Line x1="3" y1="9" x2="21" y2="9" />
            <Line x1="9" y1="21" x2="9" y2="9" />
          </Svg>
        );
    }
  };

  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <View style={styles.iconContainer}>
        {renderIcon()}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    flexDirection: 'row',
    height: 72,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 50,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 4,
  },
  tabLabel: {
    color: markerTheme.gray,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: markerTheme.accent,
  },
});
