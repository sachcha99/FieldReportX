import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { getUnsyncedReports, getUnsyncedRentals, markReportSynced, markRentalSynced } from './sqliteService';
import { batchSyncReports, batchSyncRentals } from './firestoreService';

export const BACKGROUND_SYNC_TASK = 'FIELDREPORTX_BACKGROUND_SYNC';

// Define the task — must be called at module level (top of file, outside components)
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const [unsyncedReports, unsyncedRentals] = await Promise.all([
      getUnsyncedReports(),
      getUnsyncedRentals(),
    ]);

    if (unsyncedReports.length === 0 && unsyncedRentals.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const [reportResult, rentalResult] = await Promise.all([
      batchSyncReports(unsyncedReports),
      batchSyncRentals(unsyncedRentals),
    ]);

    // Mark successfully synced items
    await Promise.all([
      ...unsyncedReports.slice(0, reportResult.synced).map((r) => markReportSynced(r.id)),
      ...unsyncedRentals.slice(0, rentalResult.synced).map((r) => markRentalSynced(r.id)),
    ]);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    // Task already registered or not supported on this platform
    console.warn('Background sync registration:', err.message);
  }
}

export async function unregisterBackgroundSync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  } catch {
    // Not registered, ignore
  }
}

export async function getBackgroundSyncStatus() {
  const status = await BackgroundFetch.getStatusAsync();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  return { status, isRegistered };
}
