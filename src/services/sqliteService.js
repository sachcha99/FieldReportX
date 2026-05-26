import * as SQLite from 'expo-sqlite';

let db = null;

export async function initDatabase() {
  db = await SQLite.openDatabaseAsync('fieldreportx.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rentals (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      property_address TEXT,
      inspector_name TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_synced ON reports(synced);
    CREATE INDEX IF NOT EXISTS idx_rentals_synced ON rentals(synced);
  `);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDatabase() first.');
  return db;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function upsertReportLocal(report) {
  await getDb().runAsync(
    `INSERT INTO reports (id, type, title, status, created_by, created_at, updated_at, synced, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       status = excluded.status,
       updated_at = excluded.updated_at,
       synced = 0,
       data = excluded.data`,
    [
      report.id,
      report.type,
      report.title,
      report.status,
      report.createdBy || '',
      report.createdAt || new Date().toISOString(),
      new Date().toISOString(),
      JSON.stringify(report),
    ]
  );
}

export async function getReportLocal(reportId) {
  const row = await getDb().getFirstAsync(
    'SELECT data FROM reports WHERE id = ?',
    [reportId]
  );
  return row ? JSON.parse(row.data) : null;
}

export async function getAllReportsLocal() {
  const rows = await getDb().getAllAsync(
    'SELECT data FROM reports ORDER BY created_at DESC'
  );
  return rows.map((r) => JSON.parse(r.data));
}

export async function markReportSynced(reportId) {
  await getDb().runAsync(
    'UPDATE reports SET synced = 1 WHERE id = ?',
    [reportId]
  );
}

export async function getUnsyncedReports() {
  const rows = await getDb().getAllAsync(
    'SELECT data FROM reports WHERE synced = 0'
  );
  return rows.map((r) => JSON.parse(r.data));
}

export async function deleteReportLocal(reportId) {
  await getDb().runAsync('DELETE FROM reports WHERE id = ?', [reportId]);
}

// ─── Rentals ──────────────────────────────────────────────────────────────────

export async function upsertRentalLocal(rental) {
  await getDb().runAsync(
    `INSERT INTO rentals (id, title, property_address, inspector_name, status, created_at, updated_at, synced, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       status = excluded.status,
       updated_at = excluded.updated_at,
       synced = 0,
       data = excluded.data`,
    [
      rental.id,
      rental.title,
      rental.propertyAddress || '',
      rental.inspectorName || '',
      rental.status,
      rental.createdAt || new Date().toISOString(),
      new Date().toISOString(),
      JSON.stringify(rental),
    ]
  );
}

export async function getAllRentalsLocal() {
  const rows = await getDb().getAllAsync(
    'SELECT data FROM rentals ORDER BY created_at DESC'
  );
  return rows.map((r) => JSON.parse(r.data));
}

export async function markRentalSynced(rentalId) {
  await getDb().runAsync(
    'UPDATE rentals SET synced = 1 WHERE id = ?',
    [rentalId]
  );
}

export async function getUnsyncedRentals() {
  const rows = await getDb().getAllAsync(
    'SELECT data FROM rentals WHERE synced = 0'
  );
  return rows.map((r) => JSON.parse(r.data));
}

export async function deleteRentalLocal(rentalId) {
  await getDb().runAsync('DELETE FROM rentals WHERE id = ?', [rentalId]);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDbStats() {
  const [reportCount, rentalCount, unsyncedCount] = await Promise.all([
    getDb().getFirstAsync('SELECT COUNT(*) as count FROM reports'),
    getDb().getFirstAsync('SELECT COUNT(*) as count FROM rentals'),
    getDb().getFirstAsync(
      'SELECT COUNT(*) as count FROM reports WHERE synced = 0'
    ),
  ]);
  return {
    reports: reportCount?.count ?? 0,
    rentals: rentalCount?.count ?? 0,
    unsynced: unsyncedCount?.count ?? 0,
  };
}
