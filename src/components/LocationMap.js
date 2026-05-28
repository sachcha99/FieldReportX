import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { formatCoords } from '../services/locationService';

// Lazy-require react-native-maps — not available in Expo Go without a custom dev client
let MapView, Marker, Polyline;
try {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  Polyline = RNMaps.Polyline;
} catch {
  // Maps not available (Expo Go)
}

const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

function routeBounds(points) {
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const pad = 0.002;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(maxLat - minLat + pad, 0.005),
    longitudeDelta: Math.max(maxLon - minLon + pad, 0.005),
  };
}

// location — single { latitude, longitude } point (report creation GPS)
// routePoints — array of { latitude, longitude } for polyline (service delivery / driving)
// markers — optional array of { latitude, longitude, title, description, pinColor } for custom pins (e.g. stops)
export default function LocationMap({ location, routePoints, markers, style, height = 200 }) {
  const hasRoute = routePoints && routePoints.length > 1;
  const hasLocation = location?.latitude && location?.longitude;
  const hasMarkers = markers && markers.length > 0;

  if (!hasLocation && !hasRoute && !hasMarkers) {
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
        {hasLocation && <Text style={styles.coordText}>{formatCoords(location)}</Text>}
        {hasRoute && <Text style={styles.coordText}>{routePoints.length} route points</Text>}
        {hasMarkers && <Text style={styles.coordText}>{markers.length} stop marker{markers.length !== 1 ? 's' : ''}</Text>}
        <Text style={styles.fallbackNote}>Map available in production build</Text>
      </View>
    );
  }

  const allPoints = [
    ...(hasRoute ? routePoints : []),
    ...(hasMarkers ? markers : []),
    ...(hasLocation ? [location] : []),
  ];

  const region = allPoints.length > 1
    ? routeBounds(allPoints)
    : { latitude: allPoints[0].latitude, longitude: allPoints[0].longitude, ...DEFAULT_DELTA };

  return (
    <MapView
      style={[styles.map, { height }, style]}
      initialRegion={region}
      scrollEnabled={false}
      zoomEnabled={false}
    >
      {hasLocation && (
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          title="Report Location"
          description={formatCoords(location)}
          pinColor="#2563EB"
        />
      )}
      {hasRoute && (
        <>
          <Polyline
            coordinates={routePoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeColor="#10b981"
            strokeWidth={3}
          />
          <Marker
            coordinate={{ latitude: routePoints[0].latitude, longitude: routePoints[0].longitude }}
            title="Start"
            pinColor="#10b981"
          />
          <Marker
            coordinate={{ latitude: routePoints[routePoints.length - 1].latitude, longitude: routePoints[routePoints.length - 1].longitude }}
            title="Current / End"
            pinColor="#ef4444"
          />
        </>
      )}
      {hasMarkers && markers.map((m, i) => (
        <Marker
          key={i}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          title={m.title || `Stop ${i + 1}`}
          description={m.description}
          pinColor={m.pinColor || '#f59e0b'}
        />
      ))}
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
