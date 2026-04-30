import React, {useMemo} from 'react';
import {FlatList, Image, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useMarkerStore} from '../navigation/AppNavigator';
import {markerLayout, markerTheme} from '../theme/markerTheme';
import {NavBar} from '../components/NavBar';

type GallerySlot = {
  key: string;
  imageBase64?: string;
  index: number;
};

export default function ResultsScreen() {
  const {markers, resetMarkers, setActiveTab, activeTab} = useMarkerStore();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();

  const gridData = useMemo<GallerySlot[]>(() => {
    const slotCount = Math.max(markers.length, 6);
    return Array.from({length: slotCount}, (_, index) => ({
      key: `slot-${index}`,
      index,
      imageBase64: markers[index],
    }));
  }, [markers]);

  const cellWidth = Math.floor((width - 48 - 16) / 2);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      {/* Enterprise Header */}
      <View style={[styles.header, {paddingTop: insets.top + 16}]}>
        <View>
          <Text style={styles.headerTitle}>COLLECTION</Text>
          <Text style={styles.headerSubtitle}>{markers.length} MARKERS CAPTURED</Text>
        </View>
        <Pressable style={styles.resetButton} onPress={resetMarkers}>
          <Text style={styles.resetText}>RESET BATCH</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <FlatList
          data={gridData}
          numColumns={2}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={[styles.grid, {paddingBottom: 120}]}
          renderItem={({item}) => {
            const isEmpty = item.imageBase64 == null;
            return (
              <View style={[styles.cell, {width: cellWidth}]}> 
                {isEmpty ? (
                  <View style={styles.emptyCell}>
                    <Text style={styles.emptyIcon}>⊞</Text>
                  </View>
                ) : (
                  <View style={styles.previewWrap}>
                    <Image
                      source={{uri: `data:image/jpeg;base64,${item.imageBase64}`}}
                      style={styles.preview}
                      resizeMode="cover"
                    />
                  </View>
                )}
                <View style={styles.cellFooter}>
                  <Text style={styles.cellLabel}>{`FRAME_${String(item.index + 1).padStart(2, '0')}`}</Text>
                </View>
              </View>
            );
          }}
        />
      </View>

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
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: markerTheme.border,
  },
  headerTitle: {
    color: markerTheme.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: markerTheme.secondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetText: {
    color: '#FF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  grid: {
    paddingTop: 24,
  },
  columnWrap: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cell: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  previewWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 1,
    backgroundColor: '#F0F0F0',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  emptyCell: {
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: markerTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  emptyIcon: {
    color: markerTheme.border,
    fontSize: 32,
  },
  cellFooter: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  cellLabel: {
    color: markerTheme.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

});
