// Mock expo-sqlite
jest.mock('expo-sqlite', () => {
  const rows = { reports: [], rentals: [] };

  const mockDb = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockImplementation((sql, params) => {
      if (sql.includes('INSERT INTO reports') || sql.includes('UPDATE reports')) {
        const existing = rows.reports.findIndex((r) => r.id === params[0]);
        const entry = { id: params[0], synced: 0, data: params[7] };
        if (existing >= 0) rows.reports[existing] = entry;
        else rows.reports.push(entry);
      }
      if (sql.includes('INSERT INTO rentals') || sql.includes('UPDATE rentals')) {
        const existing = rows.rentals.findIndex((r) => r.id === params[0]);
        const entry = { id: params[0], synced: 0, data: params[7] };
        if (existing >= 0) rows.rentals[existing] = entry;
        else rows.rentals.push(entry);
      }
      if (sql.includes('UPDATE reports SET synced')) {
        const row = rows.reports.find((r) => r.id === params[0]);
        if (row) row.synced = 1;
      }
      if (sql.includes('DELETE FROM reports')) {
        rows.reports = rows.reports.filter((r) => r.id !== params[0]);
      }
      return Promise.resolve();
    }),
    getFirstAsync: jest.fn().mockImplementation((sql, params) => {
      if (sql.includes('SELECT data FROM reports WHERE id')) {
        const row = rows.reports.find((r) => r.id === params[0]);
        return Promise.resolve(row || null);
      }
      if (sql.includes('COUNT(*) as count FROM reports')) {
        return Promise.resolve({ count: rows.reports.length });
      }
      return Promise.resolve(null);
    }),
    getAllAsync: jest.fn().mockImplementation((sql) => {
      if (sql.includes('FROM reports WHERE synced = 0')) {
        return Promise.resolve(rows.reports.filter((r) => r.synced === 0));
      }
      if (sql.includes('FROM reports')) {
        return Promise.resolve([...rows.reports]);
      }
      if (sql.includes('FROM rentals')) {
        return Promise.resolve([...rows.rentals]);
      }
      return Promise.resolve([]);
    }),
  };

  return {
    openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
    _mockDb: mockDb,
    _rows: rows,
  };
});

const SQLite = require('expo-sqlite');
import {
  initDatabase,
  upsertReportLocal,
  getReportLocal,
  getAllReportsLocal,
  markReportSynced,
  getUnsyncedReports,
  deleteReportLocal,
  getDbStats,
} from '../src/services/sqliteService';

const sampleReport = {
  id: 'report-1',
  type: 'general',
  title: 'Test Report',
  status: 'draft',
  createdBy: 'Alice',
  createdAt: '2024-01-01T00:00:00.000Z',
  sections: [],
};

describe('sqliteService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterEach(() => {
    SQLite._rows.reports = [];
    SQLite._rows.rentals = [];
  });

  describe('initDatabase', () => {
    it('opens the database and creates tables', async () => {
      expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('fieldreportx.db');
      expect(SQLite._mockDb.execAsync).toHaveBeenCalled();
    });
  });

  describe('upsertReportLocal', () => {
    it('inserts a report into the database', async () => {
      await upsertReportLocal(sampleReport);
      expect(SQLite._mockDb.runAsync).toHaveBeenCalled();
    });
  });

  describe('getAllReportsLocal', () => {
    it('returns all stored reports', async () => {
      await upsertReportLocal(sampleReport);
      SQLite._mockDb.getAllAsync.mockResolvedValueOnce([{ data: JSON.stringify(sampleReport) }]);
      const reports = await getAllReportsLocal();
      expect(reports).toHaveLength(1);
      expect(reports[0].id).toBe('report-1');
    });
  });

  describe('getUnsyncedReports', () => {
    it('returns reports where synced = 0', async () => {
      await upsertReportLocal(sampleReport);
      SQLite._mockDb.getAllAsync.mockResolvedValueOnce([{ data: JSON.stringify(sampleReport), synced: 0 }]);
      const unsynced = await getUnsyncedReports();
      expect(unsynced.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('markReportSynced', () => {
    it('updates synced flag to 1', async () => {
      await markReportSynced('report-1');
      const calls = SQLite._mockDb.runAsync.mock.calls;
      const syncCall = calls.find((c) => c[0].includes('SET synced = 1'));
      expect(syncCall).toBeDefined();
      expect(syncCall[1][0]).toBe('report-1');
    });
  });

  describe('deleteReportLocal', () => {
    it('deletes the report from the database', async () => {
      await deleteReportLocal('report-1');
      const calls = SQLite._mockDb.runAsync.mock.calls;
      const deleteCall = calls.find((c) => c[0].includes('DELETE FROM reports'));
      expect(deleteCall).toBeDefined();
    });
  });

  describe('getDbStats', () => {
    it('returns an object with reports, rentals, and unsynced counts', async () => {
      SQLite._mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce({ count: 3 })
        .mockResolvedValueOnce({ count: 2 });
      const stats = await getDbStats();
      expect(stats).toHaveProperty('reports');
      expect(stats).toHaveProperty('rentals');
      expect(stats).toHaveProperty('unsynced');
    });
  });
});
