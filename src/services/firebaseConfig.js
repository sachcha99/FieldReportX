import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV, isFirebaseConfigured as _isFirebaseConfigured } from '../config/env';

// Re-export so screens can import directly from this module
export { isFirebaseConfigured } from '../config/env';

let app = null;
let db = null;
let auth = null;

export function initFirebase() {
  // Already fully initialized — skip
  if (db !== null && auth !== null) return true;
  if (!_isFirebaseConfigured()) return false;
  try {
    if (getApps().length > 0) {
      app = getApps()[0];
      // getAuth returns the already-created auth instance for this app
      auth = getAuth(app);
    } else {
      app = initializeApp(ENV.firebase);
      // Use React Native persistence so auth state survives app restarts
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
    db = getFirestore(app);
    return true;
  } catch (err) {
    console.warn('Firebase init error:', err.message);
    return false;
  }
}

export function getDb() {
  return db;
}

export function getFirebaseAuth() {
  return auth;
}

export function isFirebaseReady() {
  return db !== null && auth !== null;
}
