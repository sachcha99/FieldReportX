import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

async function ensureCameraPermission() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Camera Permission Required', 'Please enable camera access in Settings to capture photos.');
    return false;
  }
  return true;
}

async function ensureMediaLibraryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Photo Library Permission Required', 'Please enable photo library access in Settings.');
    return false;
  }
  return true;
}

export async function launchCamera(options = {}) {
  const granted = await ensureCameraPermission();
  if (!granted) return null;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8, ...options });
  return result.canceled ? null : result.assets[0];
}

export async function launchLibrary(options = {}) {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, ...options });
  return result.canceled ? null : result.assets[0];
}
