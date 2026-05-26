import { createSlice, createAsyncThunk, nanoid } from '@reduxjs/toolkit';
import { upsertReport as upsertFirestore, batchSyncReports } from '../../services/firestoreService';
import { upsertReportLocal, markReportSynced } from '../../services/sqliteService';

// Template section definitions per report type
const SECTION_TEMPLATES = {
  trades: [
    {
      name: 'Job Details',
      checklist: {
        'Work order received': false,
        'Site assessment complete': false,
        'PPE equipment ready': false,
        'Tools and materials on-site': false,
      },
    },
    {
      name: 'Before Work Evidence',
      checklist: {
        'Before photos taken': false,
        'Existing damage documented': false,
        'Measurements recorded': false,
        'Client briefed on scope': false,
      },
    },
    {
      name: 'Work Performed',
      checklist: {
        'Work completed as specified': false,
        'Materials used documented': false,
        'Alignment/angles verified': false,
        'Connections tested': false,
      },
    },
    {
      name: 'Safety & Compliance',
      checklist: {
        'Safety procedures followed': false,
        'Area cleaned up': false,
        'Compliance standards met': false,
        'Hazards addressed': false,
      },
    },
    {
      name: 'After Work Verification',
      checklist: {
        'After photos taken': false,
        'Work tested and verified': false,
        'Client informed of completion': false,
        'Warranty information provided': false,
      },
    },
  ],
  legal: [
    {
      name: 'Incident Details',
      checklist: {
        'Incident date and time recorded': false,
        'Location documented': false,
        'Parties involved identified': false,
        'Incident type categorised': false,
      },
    },
    {
      name: 'Evidence Collection',
      checklist: {
        'Photos taken': false,
        'Screenshots uploaded': false,
        'Physical evidence documented': false,
        'GPS coordinates recorded': false,
      },
    },
    {
      name: 'Witness Statements',
      checklist: {
        'Witness 1 statement recorded': false,
        'Witness 2 statement recorded': false,
        'Statements verified': false,
        'Audio recordings saved': false,
      },
    },
    {
      name: 'Chain of Custody',
      checklist: {
        'Evidence tagged and labeled': false,
        'Custody log initiated': false,
        'Secure storage confirmed': false,
        'Transfer documented': false,
      },
    },
    {
      name: 'Documentation Review',
      checklist: {
        'All evidence logged': false,
        'Report integrity verified': false,
        'Authorised signature obtained': false,
        'Submission ready': false,
      },
    },
  ],
  driving: [
    {
      name: 'Driver & Vehicle Info',
      checklist: {
        'License verified': false,
        'Vehicle registration checked': false,
        'Route briefed': false,
        'Insurance confirmed': false,
      },
    },
    {
      name: 'Pre-Drive Inspection',
      checklist: {
        'Vehicle roadworthy': false,
        'Mirrors adjusted': false,
        'Seatbelt check done': false,
        'Fuel level adequate': false,
        'Brakes responsive': false,
      },
    },
    {
      name: 'Driving Performance',
      checklist: {
        'Speed control appropriate': false,
        'Smooth acceleration observed': false,
        'Smooth braking observed': false,
        'Cornering stable': false,
        'Road rules followed': false,
      },
    },
    {
      name: 'Sensor Data Capture',
      checklist: {
        'Vibration data recorded': false,
        'GPS route tracked': false,
        'Speed profile captured': false,
        'Stability score computed': false,
      },
    },
    {
      name: 'Post-Drive Assessment',
      checklist: {
        'Performance summary reviewed': false,
        'Feedback provided to driver': false,
        'Pass/Fail result recorded': false,
        'Report signed off': false,
      },
    },
  ],
  rehab: [
    {
      name: 'Patient Information',
      checklist: {
        'Patient ID verified': false,
        'Session number recorded': false,
        'Consent obtained': false,
        'Medical history reviewed': false,
      },
    },
    {
      name: 'Initial Assessment',
      checklist: {
        'Pain level recorded (0–10)': false,
        'Range of motion assessed': false,
        'Baseline measurements taken': false,
        'Previous session notes reviewed': false,
      },
    },
    {
      name: 'Exercise & Movement',
      checklist: {
        'Exercise plan followed': false,
        'Repetitions counted': false,
        'Movement angles measured': false,
        'Difficulty level noted': false,
      },
    },
    {
      name: 'Progress Tracking',
      checklist: {
        'Improvement from last session noted': false,
        'Session goals met': false,
        'Adverse reactions documented': false,
        'Comparison photos taken': false,
      },
    },
    {
      name: 'Clinician Notes',
      checklist: {
        'Clinical observations recorded': false,
        'Next session plan confirmed': false,
        'Patient feedback recorded': false,
        'Report complete': false,
      },
    },
  ],
  general: [
    {
      name: 'Overview',
      checklist: {
        'Subject identified': false,
        'Date and time noted': false,
        'Location recorded': false,
        'Purpose defined': false,
      },
    },
    {
      name: 'Observations',
      checklist: {
        'Key observations noted': false,
        'Context documented': false,
        'Relevant people recorded': false,
      },
    },
    {
      name: 'Evidence',
      checklist: {
        'Photos taken': false,
        'Audio notes recorded': false,
        'Supporting documents attached': false,
      },
    },
    {
      name: 'Summary & Actions',
      checklist: {
        'Findings summarised': false,
        'Actions required noted': false,
        'Follow-up scheduled': false,
        'Report reviewed': false,
      },
    },
  ],
  service: [
    {
      name: 'Route Planning',
      checklist: {
        'Route confirmed': false,
        'Stop times planned': false,
        'Vehicle prepped': false,
        'Client contact details verified': false,
      },
    },
    {
      name: 'Stop 1',
      checklist: {
        'Arrived on time': false,
        'Service delivered': false,
        'Client acknowledged': false,
        'Photo evidence taken': false,
      },
    },
    {
      name: 'Stop 2',
      checklist: {
        'Arrived on time': false,
        'Service delivered': false,
        'Client acknowledged': false,
        'Photo evidence taken': false,
      },
    },
    {
      name: 'Stop 3',
      checklist: {
        'Arrived on time': false,
        'Service delivered': false,
        'Client acknowledged': false,
        'Photo evidence taken': false,
      },
    },
    {
      name: 'Delivery Completion',
      checklist: {
        'All stops completed': false,
        'Total distance recorded': false,
        'Average speed logged': false,
        'Delivery report submitted': false,
      },
    },
  ],
};

const TYPE_META = {
  trades: { label: 'Trades Report', color: '#F59E0B', supportsScore: false },
  legal: { label: 'Legal & Forensic Report', color: '#06B6D4', supportsScore: false },
  driving: { label: 'Driving Test Report', color: '#8B5CF6', supportsScore: true },
  rehab: { label: 'Patient Rehabilitation Report', color: '#EC4899', supportsScore: true },
  general: { label: 'General Report', color: '#6366F1', supportsScore: false },
  service: { label: 'Service Delivery Report', color: '#10B981', supportsScore: false },
};

function buildSections(type) {
  return (SECTION_TEMPLATES[type] || []).map((tmpl) => ({
    id: nanoid(),
    name: tmpl.name,
    complete: false,
    conditionNotes: '',
    checklist: { ...tmpl.checklist },
    photos: [],
    audioNotes: [],
    score: null,
  }));
}

// Simple checksum using report data
function computeChecksum(report) {
  const str = JSON.stringify({
    id: report.id,
    type: report.type,
    title: report.title,
    createdAt: report.createdAt,
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

export const syncReport = createAsyncThunk(
  'reports/syncReport',
  async (reportId, { getState, rejectWithValue }) => {
    try {
      const report = getState().reports.byId[reportId];
      if (!report) throw new Error('Report not found');
      // Parallel: write to Firestore and SQLite simultaneously
      await Promise.all([
        upsertFirestore(report).catch(() => null), // non-fatal if Firebase unconfigured
        upsertReportLocal(report).catch(() => null),
      ]);
      await markReportSynced(reportId).catch(() => null);
      return { reportId, syncedAt: new Date().toISOString() };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const batchSyncAllReports = createAsyncThunk(
  'reports/batchSyncAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { byId, syncStatus } = getState().reports;
      const reports = Object.values(byId);
      // Use syncStatus (not status) so completed reports aren't re-synced endlessly
      const unsynced = reports.filter((r) => syncStatus[r.id] !== 'synced');
      const result = await batchSyncReports(unsynced);
      await Promise.allSettled(unsynced.map((r) => upsertReportLocal(r)));
      return { ...result, reportIds: unsynced.map((r) => r.id) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const initialState = {
  byId: {},
  allIds: [],
  syncStatus: {},
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    createReport: {
      reducer: (state, action) => {
        const report = action.payload;
        state.byId[report.id] = report;
        state.allIds.unshift(report.id);
        state.syncStatus[report.id] = 'draft';
      },
      prepare: ({ type, title, createdBy, userId, metadata, gpsLocation }) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const sections = buildSections(type);
        const base = {
          id,
          type,
          title,
          createdBy,
          userId: userId || null,
          metadata: metadata || {},
          gpsLocation: gpsLocation || null,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
          sections,
          sensorData: null,
          gpsRoute: [],
          signOff: { userSignature: null, supervisorSignature: null, approvedAt: null },
          pdfUri: null,
        };
        base.checksum = computeChecksum(base);
        return { payload: base };
      },
    },

    updateSectionNotes: (state, action) => {
      const { reportId, sectionId, notes } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section) {
        section.conditionNotes = notes;
        report.updatedAt = new Date().toISOString();
      }
    },

    toggleChecklistItem: (state, action) => {
      const { reportId, sectionId, key } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section?.checklist) {
        section.checklist[key] = !section.checklist[key];
        report.updatedAt = new Date().toISOString();
      }
    },

    addPhotoToSection: (state, action) => {
      const { reportId, sectionId, photo } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section) {
        section.photos.push(photo);
        report.updatedAt = new Date().toISOString();
      }
    },

    removePhotoFromSection: (state, action) => {
      const { reportId, sectionId, photoIndex } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section) {
        section.photos.splice(photoIndex, 1);
        report.updatedAt = new Date().toISOString();
      }
    },

    addAudioNote: (state, action) => {
      const { reportId, sectionId, audio } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section) {
        section.audioNotes.push(audio);
        report.updatedAt = new Date().toISOString();
      }
    },

    removeAudioNote: (state, action) => {
      const { reportId, sectionId, audioIndex } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section) {
        section.audioNotes.splice(audioIndex, 1);
        report.updatedAt = new Date().toISOString();
      }
    },

    setSectionScore: (state, action) => {
      const { reportId, sectionId, score } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section) {
        section.score = score;
        report.updatedAt = new Date().toISOString();
      }
    },

    markSectionComplete: (state, action) => {
      const { reportId, sectionId } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section) {
        section.complete = true;
        report.status = 'in_progress';
        report.updatedAt = new Date().toISOString();
      }
    },

    markReportComplete: (state, action) => {
      const { reportId } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      report.status = 'completed';
      report.updatedAt = new Date().toISOString();
      state.syncStatus[reportId] = 'pending';
    },

    setReportStatus: (state, action) => {
      const { reportId, status } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      report.status = status;
      report.updatedAt = new Date().toISOString();
    },

    saveSensorData: (state, action) => {
      const { reportId, sensorData } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      report.sensorData = sensorData;
      report.updatedAt = new Date().toISOString();
    },

    addGpsPoint: (state, action) => {
      const { reportId, point } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      report.gpsRoute.push(point);
      report.updatedAt = new Date().toISOString();
    },

    clearGpsRoute: (state, action) => {
      const report = state.byId[action.payload];
      if (!report) return;
      report.gpsRoute = [];
      report.updatedAt = new Date().toISOString();
    },

    saveSignOff: (state, action) => {
      const { reportId, userSignature, supervisorSignature } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      report.signOff = {
        userSignature,
        supervisorSignature,
        approvedAt: new Date().toISOString(),
      };
      report.updatedAt = new Date().toISOString();
    },

    setReportPdfUri: (state, action) => {
      const { reportId, pdfUri } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      report.pdfUri = pdfUri;
    },

    deleteReport: (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      delete state.syncStatus[id];
      state.allIds = state.allIds.filter((rid) => rid !== id);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(syncReport.pending, (state, action) => {
        state.syncStatus[action.meta.arg] = 'syncing';
      })
      .addCase(syncReport.fulfilled, (state, action) => {
        const { reportId } = action.payload;
        // Only update syncStatus — never overwrite workflow status (draft/in_progress/completed)
        state.syncStatus[reportId] = 'synced';
      })
      .addCase(syncReport.rejected, (state, action) => {
        state.syncStatus[action.meta.arg] = 'error';
      })
      .addCase(batchSyncAllReports.fulfilled, (state, action) => {
        const { reportIds } = action.payload;
        reportIds?.forEach((id) => {
          state.syncStatus[id] = 'synced';
        });
      });
  },
});

export const {
  createReport,
  updateSectionNotes,
  toggleChecklistItem,
  addPhotoToSection,
  removePhotoFromSection,
  addAudioNote,
  removeAudioNote,
  setSectionScore,
  markSectionComplete,
  markReportComplete,
  setReportStatus,
  saveSensorData,
  addGpsPoint,
  clearGpsRoute,
  saveSignOff,
  setReportPdfUri,
  deleteReport,
} = reportsSlice.actions;

// Selectors
export const selectAllReports = (state) =>
  state.reports.allIds.map((id) => state.reports.byId[id]);

export const selectReportById = (id) => (state) => state.reports.byId[id];

export const selectReportsByType = (type) => (state) =>
  state.reports.allIds
    .map((id) => state.reports.byId[id])
    .filter((r) => r.type === type);

export const selectReportSyncStatus = (id) => (state) => state.reports.syncStatus[id];

export const selectReportProgress = (id) => (state) => {
  const report = state.reports.byId[id];
  if (!report) return 0;
  const done = report.sections.filter((s) => s.complete).length;
  return Math.round((done / report.sections.length) * 100);
};

export const selectOverallScore = (id) => (state) => {
  const report = state.reports.byId[id];
  if (!report) return null;
  const scored = report.sections.filter((s) => s.score !== null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length);
};

export { TYPE_META };
export default reportsSlice.reducer;
