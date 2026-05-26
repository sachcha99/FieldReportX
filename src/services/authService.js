import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { initFirebase, getFirebaseAuth, isFirebaseReady } from './firebaseConfig';

// Attempt lazy init in case Constants.expoConfig.extra wasn't ready at bootstrap
function ensureFirebase() {
  if (!isFirebaseReady()) initFirebase();
  return isFirebaseReady();
}

export async function signInAnon() {
  if (!ensureFirebase()) return null;
  const cred = await signInAnonymously(getFirebaseAuth());
  return cred.user;
}

export async function signInEmail(email, password) {
  if (!ensureFirebase()) return null;
  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return cred.user;
}

export async function registerEmail(email, password) {
  if (!ensureFirebase()) return null;
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  return cred.user;
}

export async function logout() {
  if (!ensureFirebase()) return;
  await signOut(getFirebaseAuth());
}

export function subscribeAuthState(callback) {
  if (!ensureFirebase()) return () => {};
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function getCurrentUser() {
  if (!ensureFirebase()) return null;
  return getFirebaseAuth().currentUser;
}
