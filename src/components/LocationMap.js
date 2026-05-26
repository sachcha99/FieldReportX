import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { formatCoords } from '../services/locationService';

// Lazy-require react-native-maps — not available in Expo Go without a custom dev client
let MapView, Marker;
try {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
} catch {
  // Maps not available (Expo Go)
}

const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

export default function LocationMap({ location, style, height = 200 }) {
  if (!location?.latitude || !location?.longitude) {
    return (
      <View style={[styles.noGps, { height }, style]}>
        <MapPin size={24} color="#9ca3af" strokeWidth={1.5} />
        <Text style={styles.noGpsText}>No GPS data</Text>
      </View>
    );
  }

  if (!MapView) {
    // Fallback coordinate display for Expo Go
    return (
      <View style={[styles.fallback, { height }, style]}>
        <MapPin size={20} color="#2563EB" strokeWidth={2} />
        <Text style={styles.coordText}>{formatCoords(location)}</Text>
        <Text style={styles.fallbackNote}>Map available in production build</Text>
      </View>
    );
  }

  const region = {
    latitude: location.latitude,
    longitude: location.longitude,
    ...DEFAULT_DELTA,
  };

  return (
    <MapView
      style={[styles.map, { height }, style]}
      initialRegion={region}
      scrollEnabled={false}
      zoomEnabled={false}
    >
      <Marker
        coordinate={{ latitude: location.latitude, longitude: location.longitude }}
        title="Report Location"
        description={formatCoords(location)}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: 8, overflow: 'hidden' },
  noGps: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noGpsText: { fontSize: 13, color: '#9ca3af' },
  fallback: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coordText: { fontSize: 13, color: '#1d4ed8', fontWeight: '600' },
  fallbackNote: { fontSize: 11, color: '#93c5fd' },
});
