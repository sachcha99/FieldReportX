import * as Location from 'expo-location';

let cachedPermission = null;

export async function requestLocationPermission() {
  if (cachedPermission === 'granted') return { ok: true };
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    cachedPermission = status;
    if (status !== 'granted') {
      return { ok: false, error: 'Location permission denied' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function getCurrentLocation() {
  const perm = await requestLocationPermission();
  if (!perm.ok) return perm;
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      ok: true,
      data: {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        timestamp: loc.timestamp,
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function formatCoords(loc) {
  if (!loc) return 'No GPS data';
  const { latitude, longitude, accuracy } = loc;
  return `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (±${Math.round(accuracy || 0)}m)`;
}
