import { configureStore } from '@reduxjs/toolkit';
import reportsReducer, {
  createReport,
  updateSectionNotes,
  toggleChecklistItem,
  markSectionComplete,
  markReportComplete,
  deleteReport,
  setSectionScore,
  selectAllReports,
  selectReportById,
  selectReportProgress,
} from '../src/store/slices/reportsSlice';

function makeStore() {
  return configureStore({ reducer: { reports: reportsReducer } });
}

describe('reportsSlice', () => {
  describe('createReport', () => {
    it('adds a new report to state', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'general', title: 'Test Report', createdBy: 'Alice' }));
      const reports = selectAllReports(store.getState());
      expect(reports).toHaveLength(1);
      expect(reports[0].title).toBe('Test Report');
      expect(reports[0].type).toBe('general');
      expect(reports[0].status).toBe('draft');
    });

    it('assigns a unique id and checksum', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'trades', title: 'R1', createdBy: 'Bob' }));
      store.dispatch(createReport({ type: 'trades', title: 'R2', createdBy: 'Bob' }));
      const reports = selectAllReports(store.getState());
      expect(reports[0].id).not.toBe(reports[1].id);
      expect(reports[0].checksum).toBeDefined();
    });

    it('builds sections matching the report type', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'driving', title: 'Drive Test', createdBy: 'Carol' }));
      const reports = selectAllReports(store.getState());
      expect(reports[0].sections.length).toBeGreaterThan(0);
    });
  });

  describe('updateSectionNotes', () => {
    it('updates notes for the correct section', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'general', title: 'R', createdBy: 'X' }));
      const report = selectAllReports(store.getState())[0];
      const sectionId = report.sections[0].id;
      store.dispatch(updateSectionNotes({ reportId: report.id, sectionId, notes: 'All good' }));
      const updated = selectReportById(report.id)(store.getState());
      expect(updated.sections[0].conditionNotes).toBe('All good');
    });
  });

  describe('toggleChecklistItem', () => {
    it('flips a checklist item from false to true', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'trades', title: 'T', createdBy: 'Y' }));
      const report = selectAllReports(store.getState())[0];
      const section = report.sections[0];
      const key = Object.keys(section.checklist)[0];
      store.dispatch(toggleChecklistItem({ reportId: report.id, sectionId: section.id, key }));
      const updated = selectReportById(report.id)(store.getState());
      expect(updated.sections[0].checklist[key]).toBe(true);
    });
  });

  describe('setSectionScore', () => {
    it('sets the score on a section', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'driving', title: 'D', createdBy: 'Z' }));
      const report = selectAllReports(store.getState())[0];
      const sectionId = report.sections[0].id;
      store.dispatch(setSectionScore({ reportId: report.id, sectionId, score: 75 }));
      const updated = selectReportById(report.id)(store.getState());
      expect(updated.sections[0].score).toBe(75);
    });
  });

  describe('markSectionComplete + markReportComplete', () => {
    it('marks a section complete and transitions report to in_progress', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'general', title: 'G', createdBy: 'A' }));
      const report = selectAllReports(store.getState())[0];
      const sectionId = report.sections[0].id;
      store.dispatch(markSectionComplete({ reportId: report.id, sectionId }));
      const updated = selectReportById(report.id)(store.getState());
      expect(updated.sections[0].complete).toBe(true);
      expect(updated.status).toBe('in_progress');
    });

    it('marks the whole report complete', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'general', title: 'G2', createdBy: 'B' }));
      const report = selectAllReports(store.getState())[0];
      store.dispatch(markReportComplete({ reportId: report.id }));
      const updated = selectReportById(report.id)(store.getState());
      expect(updated.status).toBe('completed');
    });
  });

  describe('deleteReport', () => {
    it('removes the report from state', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'legal', title: 'L', createdBy: 'C' }));
      const id = selectAllReports(store.getState())[0].id;
      store.dispatch(deleteReport(id));
      expect(selectAllReports(store.getState())).toHaveLength(0);
    });
  });

  describe('selectReportProgress', () => {
    it('returns 0 when no sections are complete', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'general', title: 'P', createdBy: 'D' }));
      const id = selectAllReports(store.getState())[0].id;
      expect(selectReportProgress(id)(store.getState())).toBe(0);
    });

    it('returns 100 when all sections are complete', () => {
      const store = makeStore();
      store.dispatch(createReport({ type: 'general', title: 'P2', createdBy: 'E' }));
      const report = selectAllReports(store.getState())[0];
      report.sections.forEach((s) => {
        store.dispatch(markSectionComplete({ reportId: report.id, sectionId: s.id }));
      });
      expect(selectReportProgress(report.id)(store.getState())).toBe(100);
    });
  });
});
