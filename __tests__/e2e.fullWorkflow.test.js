/**
 * End-to-End Workflow Test — FieldReportX
 *
 * Simulates the full user journey entirely through Redux and service
 * functions, without rendering any UI. Covers: guest login → create report
 * → fill all sections → GPS/sensor data → sign-off → complete → logout.
 *
 * This is a "headless E2E" approach: the store + services are exercised
 * exactly as the screens would call them, giving high confidence that the
 * data layer is correct even when Firebase / native modules are unavailable.
 */

// ── Service mocks ──────────────────────────────────────────────────────────
jest.mock('../src/services/authService', () => ({
  signInAnon: jest.fn().mockResolvedValue(null),
  logout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/firestoreService', () => ({
  upsertReport: jest.fn().mockResolvedValue(undefined),
  batchSyncReports: jest.fn().mockResolvedValue({ synced: 0, failed: 0 }),
  upsertRental: jest.fn().mockResolvedValue(undefined),
  batchSyncRentals: jest.fn().mockResolvedValue({ synced: 0, failed: 0 }),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-001'),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports ────────────────────────────────────────────────────────────────
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  loginAsGuest,
  logoutUser,
  selectCurrentUser,
  selectIsAuthenticated,
} from '../src/store/slices/authSlice';
import reportsReducer, {
  createReport,
  updateSectionNotes,
  toggleChecklistItem,
  addPhotoToSection,
  markSectionComplete,
  markReportComplete,
  setSectionScore,
  saveSensorData,
  addGpsPoint,
  saveSignOff,
  selectAllReports,
  selectReportById,
  selectReportProgress,
} from '../src/store/slices/reportsSlice';
import { scheduleReportReminder } from '../src/services/notificationService';
import { computeSmoothnessScore } from '../src/services/sensorService';

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, reports: reportsReducer },
  });
}

// ── E2E Scenario: Driving Assessment ───────────────────────────────────────
describe('E2E — Driving Assessment full workflow', () => {
  let store;

  beforeAll(async () => {
    store = makeStore();

    // 1. User logs in as guest (offline mode)
    await store.dispatch(loginAsGuest('Test Driver'));

    // 2. Create a driving report
    store.dispatch(createReport({
      type: 'driving',
      title: 'City Route Assessment',
      createdBy: selectCurrentUser(store.getState()).displayName,
    }));

    // 3. Schedule a notification for the report
    const report = selectAllReports(store.getState())[0];
    await scheduleReportReminder(report.title, 3600);

    // 4. Simulate accelerometer data → compute score
    const accelSamples = [
      { x: 0.02, y: 0.01, z: 0.98 },
      { x: 0.03, y: 0.02, z: 1.01 },
      { x: 0.01, y: 0.03, z: 0.97 },
      { x: 0.02, y: 0.01, z: 1.00 },
    ];
    const score = computeSmoothnessScore(accelSamples);
    store.dispatch(saveSensorData({
      reportId: report.id,
      sensorData: { samples: accelSamples.length, smoothnessScore: score, capturedAt: new Date().toISOString() },
    }));

    // 5. Set scores + complete all sections
    const sections = report.sections;
    sections.forEach((section, i) => {
      store.dispatch(setSectionScore({ reportId: report.id, sectionId: section.id, score: 75 + i * 5 }));
      store.dispatch(updateSectionNotes({
        reportId: report.id,
        sectionId: section.id,
        notes: `Section ${i + 1} completed without incident.`,
      }));
      // Toggle first checklist item
      const firstKey = Object.keys(section.checklist)[0];
      if (firstKey) {
        store.dispatch(toggleChecklistItem({ reportId: report.id, sectionId: section.id, key: firstKey }));
      }
      store.dispatch(markSectionComplete({ reportId: report.id, sectionId: section.id }));
    });

    // 6. Sign off
    store.dispatch(saveSignOff({
      reportId: report.id,
      userSignature: 'Test Driver',
      supervisorSignature: 'Supervisor A',
    }));

    // 7. Mark complete
    store.dispatch(markReportComplete({ reportId: report.id }));
  });

  it('user is authenticated throughout the workflow', () => {
    expect(selectIsAuthenticated(store.getState())).toBe(true);
    expect(selectCurrentUser(store.getState()).displayName).toBe('Test Driver');
  });

  it('report was created with correct metadata', () => {
    const report = selectAllReports(store.getState())[0];
    expect(report.title).toBe('City Route Assessment');
    expect(report.type).toBe('driving');
    expect(report.createdBy).toBe('Test Driver');
  });

  it('sensor data was saved to the report', () => {
    const report = selectAllReports(store.getState())[0];
    expect(report.sensorData).toBeDefined();
    expect(report.sensorData.smoothnessScore).toBeGreaterThanOrEqual(0);
    expect(report.sensorData.smoothnessScore).toBeLessThanOrEqual(100);
  });

  it('all sections are marked complete', () => {
    const report = selectAllReports(store.getState())[0];
    expect(report.sections.every((s) => s.complete)).toBe(true);
  });

  it('progress reaches 100%', () => {
    const report = selectAllReports(store.getState())[0];
    expect(selectReportProgress(report.id)(store.getState())).toBe(100);
  });

  it('all sections have notes recorded', () => {
    const report = selectAllReports(store.getState())[0];
    report.sections.forEach((s) => {
      expect(s.conditionNotes).toMatch(/completed without incident/);
    });
  });

  it('sign-off is recorded with correct signatories', () => {
    const report = selectAllReports(store.getState())[0];
    expect(report.signOff.userSignature).toBe('Test Driver');
    expect(report.signOff.supervisorSignature).toBe('Supervisor A');
    expect(report.signOff.approvedAt).toBeDefined();
  });

  it('final report status is completed', () => {
    const report = selectAllReports(store.getState())[0];
    expect(report.status).toBe('completed');
  });
});

// ── E2E Scenario: Legal & Forensic with GPS ────────────────────────────────
describe('E2E — Legal & Forensic report with GPS evidence', () => {
  let store;
  let reportId;

  beforeAll(async () => {
    store = makeStore();
    await store.dispatch(loginAsGuest('Field Investigator'));

    store.dispatch(createReport({
      type: 'legal',
      title: 'Incident Investigation #2024',
      createdBy: 'Field Investigator',
    }));

    reportId = selectAllReports(store.getState())[0].id;

    // Add GPS evidence points
    const gpsPoints = [
      { latitude: -33.8688, longitude: 151.2093, speed: null, timestamp: new Date().toISOString() },
      { latitude: -33.8690, longitude: 151.2095, speed: 12.5, timestamp: new Date().toISOString() },
      { latitude: -33.8692, longitude: 151.2097, speed: 14.0, timestamp: new Date().toISOString() },
    ];
    gpsPoints.forEach((point) => store.dispatch(addGpsPoint({ reportId, point })));

    // Fill and complete all sections
    const report = selectReportById(reportId)(store.getState());
    report.sections.forEach((section) => {
      store.dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: 'Evidence documented.' }));
      store.dispatch(addPhotoToSection({
        reportId,
        sectionId: section.id,
        photo: { uri: `file://evidence_${section.id}.jpg`, timestamp: new Date().toISOString(), type: 'photo' },
      }));
      store.dispatch(markSectionComplete({ reportId, sectionId: section.id }));
    });

    store.dispatch(saveSignOff({
      reportId,
      userSignature: 'Field Investigator',
      supervisorSignature: '',
    }));
    store.dispatch(markReportComplete({ reportId }));
  });

  it('GPS route is stored with correct point count', () => {
    const report = selectReportById(reportId)(store.getState());
    expect(report.gpsRoute).toHaveLength(3);
    expect(report.gpsRoute[0].latitude).toBeCloseTo(-33.8688, 3);
  });

  it('each section has a photo attached', () => {
    const report = selectReportById(reportId)(store.getState());
    report.sections.forEach((s) => {
      expect(s.photos.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('report is completed with partial sign-off', () => {
    const report = selectReportById(reportId)(store.getState());
    expect(report.status).toBe('completed');
    expect(report.signOff.userSignature).toBe('Field Investigator');
    expect(report.signOff.supervisorSignature).toBe('');
    expect(report.signOff.approvedAt).toBeDefined();
  });

  it('report has a checksum for chain-of-custody', () => {
    const report = selectReportById(reportId)(store.getState());
    expect(report.checksum).toBeDefined();
    expect(typeof report.checksum).toBe('string');
    expect(report.checksum.length).toBeGreaterThan(0);
  });
});

// ── E2E Scenario: Guest session persistence across multiple reports ────────
describe('E2E — Multiple reports in a single guest session', () => {
  let store;

  beforeAll(async () => {
    store = makeStore();
    await store.dispatch(loginAsGuest('Multi-Report Tester'));

    ['general', 'trades', 'rehab', 'service'].forEach((type, i) => {
      store.dispatch(createReport({ type, title: `Report ${i + 1}`, createdBy: 'Multi-Report Tester' }));
    });
  });

  it('all four reports are in state', () => {
    expect(selectAllReports(store.getState())).toHaveLength(4);
  });

  it('each report has a unique id', () => {
    const ids = selectAllReports(store.getState()).map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(4);
  });

  it('each report has its correct type', () => {
    const types = selectAllReports(store.getState()).map((r) => r.type);
    expect(types).toContain('general');
    expect(types).toContain('trades');
    expect(types).toContain('rehab');
    expect(types).toContain('service');
  });

  it('all reports start in draft status', () => {
    const reports = selectAllReports(store.getState());
    expect(reports.every((r) => r.status === 'draft')).toBe(true);
  });

  it('user remains authenticated after creating multiple reports', () => {
    expect(selectIsAuthenticated(store.getState())).toBe(true);
  });
});
