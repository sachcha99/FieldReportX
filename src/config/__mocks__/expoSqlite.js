// Jest mock for expo-sqlite
const makeDb = () => ({
  execAsync: jest.fn(() => Promise.resolve()),
  runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
  getFirstAsync: jest.fn(() => Promise.resolve(null)),
  getAllAsync: jest.fn(() => Promise.resolve([])),
  closeAsync: jest.fn(() => Promise.resolve()),
  withTransactionAsync: jest.fn((fn) => fn()),
});

export const openDatabaseAsync = jest.fn(() => Promise.resolve(makeDb()));
export const openDatabaseSync = jest.fn(() => makeDb());
export const deleteDatabaseAsync = jest.fn(() => Promise.resolve());
export const SQLiteDatabase = jest.fn();
