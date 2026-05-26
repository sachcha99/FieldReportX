import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb, isFirebaseReady } from './firebaseConfig';

const REPORTS_COL = 'reports';
const RENTALS_COL = 'rentals';

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function upsertReport(report) {
  if (!isFirebaseReady()) throw new Error('Firebase not initialised');
  const ref = doc(getDb(), REPORTS_COL, report.id);
  await setDoc(ref, { ...report, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fetchReport(reportId) {
  if (!isFirebaseReady()) throw new Error('Firebase not initialised');
  const snap = await getDoc(doc(getDb(), REPORTS_COL, reportId));
  return snap.exists() ? snap.data() : null;
}

export async function fetchAllReports(userId) {
  if (!isFirebaseReady()) throw new Error('Firebase not initialised');
  const q = query(
    collection(getDb(), REPORTS_COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function deleteReportFromFirestore(reportId) {
  if (!isFirebaseReady()) throw new Error('Firebase not initialised');
  await deleteDoc(doc(getDb(), REPORTS_COL, reportId));
}

// ─── Rentals ──────────────────────────────────────────────────────────────────

export async function upsertRental(rental) {
  if (!isFirebaseReady()) throw new Error('Firebase not initialised');
  const ref = doc(getDb(), RENTALS_COL, rental.id);
  await setDoc(ref, { ...rental, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fetchAllRentals(userId) {
  if (!isFirebaseReady()) throw new Error('Firebase not initialised');
  const q = query(
    collection(getDb(), RENTALS_COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// ─── Batch parallel sync ──────────────────────────────────────────────────────

export async function batchSyncReports(reports) {
  if (!isFirebaseReady()) return { synced: 0, failed: 0 };
  const results = await Promise.allSettled(reports.map((r) => upsertReport(r)));
  const synced = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  return { synced, failed };
}

export async function batchSyncRentals(rentals) {
  if (!isFirebaseReady()) return { synced: 0, failed: 0 };
  const results = await Promise.allSettled(rentals.map((r) => upsertRental(r)));
  const synced = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  return { synced, failed };
}
