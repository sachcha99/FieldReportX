/**
 * Integration Test — Full report lifecycle across Redux store
 *
 * These tests run both the auth and reports slices together in a single
 * store, verifying that the slices interact correctly and that selectors
 * return the right derived state at each stage of a report's life.
 */

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
  saveSignOff,
  deleteReport,
  selectAllReports,
  selectReportById,
  selectReportProgress,
  selectOverallScore,
} from '../src/store/slices/reportsSlice';

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, reports: reportsReducer },
  });
}

describe('Integration — report lifecycle with auth', () => {
  let store;
  let reportId;

  beforeEach(async () => {
    store = makeStore();
    // Step 1: user logs in as guest
    await store.dispatch(loginAsGuest('Integration Tester'));
  });

  // ── Auth precondition ────────────────────────────────────────────────────
  it('user is authenticated after guest login', () => {
    expect(selectIsAuthenticated(store.getState())).toBe(true);
    expect(selectCurrentUser(store.getState()).displayName).toBe('Integration Tester');
  });

  // ── Create report ────────────────────────────────────────────────────────
  describe('after creating a general report', () => {
    beforeEach(() => {
      const user = selectCurrentUser(store.getState());
      store.dispatch(createReport({ type: 'general', title: 'Site Inspection', createdBy: user.displayName }));
      reportId = selectAllReports(store.getState())[0].id;
    });

    it('report appears in state with draft status', () => {
      const report = selectReportById(reportId)(store.getState());
      expect(report).toBeDefined();
      expect(report.title).toBe('Site Inspection');
      expect(report.status).toBe('draft');
      expect(report.createdBy).toBe('Integration Tester');
    });

    it('progress starts at 0%', () => {
      expect(selectReportProgress(reportId)(store.getState())).toBe(0);
    });

    // ── Fill section ─────────────────────────────────────────────────────
    describe('after filling the first section', () => {
      let sectionId;

      beforeEach(() => {
        const report = selectReportById(reportId)(store.getState());
        sectionId = report.sections[0].id;

        // Add notes
        store.dispatch(updateSectionNotes({ reportId, sectionId, notes: 'Site is clear' }));

        // Toggle first checklist item
        const key = Object.keys(report.sections[0].checklist)[0];
        store.dispatch(toggleChecklistItem({ reportId, sectionId, key }));

        // Attach a photo
        store.dispatch(addPhotoToSection({
          reportId,
          sectionId,
          photo: { uri: 'file://test/photo.jpg', timestamp: new Date().toISOString() },
        }));
      });

      it('section notes are saved', () => {
        const report = selectReportById(reportId)(store.getState());
        expect(report.sections[0].conditionNotes).toBe('Site is clear');
      });

      it('checklist item is toggled to true', () => {
        const report = selectReportById(reportId)(store.getState());
        const section = report.sections[0];
        const firstKey = Object.keys(section.checklist)[0];
        expect(section.checklist[firstKey]).toBe(true);
      });

      it('photo is attached to section', () => {
        const report = selectReportById(reportId)(store.getState());
        expect(report.sections[0].photos).toHaveLength(1);
        expect(report.sections[0].photos[0].uri).toBe('file://test/photo.jpg');
      });

      // ── Mark section complete ──────────────────────────────────────────
      describe('after marking section complete', () => {
        beforeEach(() => {
          store.dispatch(markSectionComplete({ reportId, sectionId }));
        });

        it('section.complete is true', () => {
          const report = selectReportById(reportId)(store.getState());
          expect(report.sections[0].complete).toBe(true);
        });

        it('report status changes to in_progress', () => {
          const report = selectReportById(reportId)(store.getState());
          expect(report.status).toBe('in_progress');
        });

        it('progress is above 0%', () => {
          expect(selectReportProgress(reportId)(store.getState())).toBeGreaterThan(0);
        });

        // ── Complete all sections ────────────────────────────────────────
        describe('after completing all sections', () => {
          beforeEach(() => {
            const report = selectReportById(reportId)(store.getState());
            // Complete remaining sections
            report.sections.slice(1).forEach((s) => {
              store.dispatch(markSectionComplete({ reportId, sectionId: s.id }));
            });
          });

          it('progress reaches 100%', () => {
            expect(selectReportProgress(reportId)(store.getState())).toBe(100);
          });

          it('marking report complete sets status to completed', () => {
            store.dispatch(markReportComplete({ reportId }));
            const report = selectReportById(reportId)(store.getState());
            expect(report.status).toBe('completed');
          });
        });
      });
    });
  });

  // ── Driving report + score integration ─────────────────────────────────
  describe('driving report scoring integration', () => {
    beforeEach(() => {
      store.dispatch(createReport({ type: 'driving', title: 'Drive Test', createdBy: 'Tester' }));
      reportId = selectAllReports(store.getState())[0].id;
    });

    it('overall score is null before any section scored', () => {
      expect(selectOverallScore(reportId)(store.getState())).toBeNull();
    });

    it('overall score reflects average of scored sections', () => {
      const report = selectReportById(reportId)(store.getState());
      store.dispatch(setSectionScore({ reportId, sectionId: report.sections[0].id, score: 80 }));
      store.dispatch(setSectionScore({ reportId, sectionId: report.sections[1].id, score: 60 }));
      const score = selectOverallScore(reportId)(store.getState());
      expect(score).toBe(70);
    });
  });

  // ── Sign-off integration ─────────────────────────────────────────────────
  describe('sign-off integration', () => {
    beforeEach(() => {
      store.dispatch(createReport({ type: 'legal', title: 'Evidence Report', createdBy: 'Inspector' }));
      reportId = selectAllReports(store.getState())[0].id;
    });

    it('saves sign-off data to the report', () => {
      store.dispatch(saveSignOff({
        reportId,
        userSignature: 'Alice Smith',
        supervisorSignature: 'Bob Jones',
      }));
      const report = selectReportById(reportId)(store.getState());
      expect(report.signOff).toBeDefined();
      expect(report.signOff.userSignature).toBe('Alice Smith');
      expect(report.signOff.supervisorSignature).toBe('Bob Jones');
      expect(report.signOff.approvedAt).toBeDefined();
    });
  });

  // ── Delete integration ───────────────────────────────────────────────────
  describe('delete integration', () => {
    it('removes report from state; auth is unaffected', async () => {
      store.dispatch(createReport({ type: 'service', title: 'To Delete', createdBy: 'Tester' }));
      const id = selectAllReports(store.getState())[0].id;
      store.dispatch(deleteReport(id));
      expect(selectAllReports(store.getState())).toHaveLength(0);
      // Auth slice untouched
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });
  });

  // ── Logout clears auth but not reports ──────────────────────────────────
  describe('logout after creating reports', () => {
    it('clears auth user while reports remain in state', async () => {
      store.dispatch(createReport({ type: 'general', title: 'Persisted', createdBy: 'Tester' }));
      await store.dispatch(logoutUser());
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(selectAllReports(store.getState())).toHaveLength(1);
    });
  });
});
