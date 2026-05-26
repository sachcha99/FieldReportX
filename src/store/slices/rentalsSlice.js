// store/slices/rentalsSlice.js
// Full Rental Inspection Report state matching Assignment 1 ERD and wireframes.
// 5 sections: Property Info, Living Room, Kitchen, Bedrooms, Exterior

import { createSlice, createAsyncThunk, nanoid } from '@reduxjs/toolkit';
import { upsertRental as upsertFirestore, batchSyncRentals } from '../../services/firestoreService';
import { upsertRentalLocal, markRentalSynced } from '../../services/sqliteService';

// Default sections for Rental Inspection
const buildDefaultSections = () => [
  {
    id: nanoid(),
    name: 'Property Information',
    complete: false,
    conditionNotes: '',
    checklist: {
      'Property type identified': false,
      'Rental agreement reviewed': false,
      'Meter readings recorded': false,
    },
    photos: [],
  },
  {
    id: nanoid(),
    name: 'Living Room & Common Areas',
    complete: false,
    conditionNotes: '',
    checklist: {
      'Walls & ceiling clean': false,
      'Flooring undamaged': false,
      'Windows functioning': false,
      'Light fittings work': false,
      'Power outlets functional': false,
    },
    photos: [],
  },
  {
    id: nanoid(),
    name: 'Kitchen',
    complete: false,
    conditionNotes: '',
    checklist: {
      'Appliances functional': false,
      'Bench tops undamaged': false,
      'Cupboards undamaged': false,
      'Sink drains properly': false,
      'Rangehood operational': false,
    },
    photos: [],
  },
  {
    id: nanoid(),
    name: 'Bedrooms & Bathrooms',
    complete: false,
    conditionNotes: '',
    checklist: {
      'Carpets clean': false,
      'Wardrobes undamaged': false,
      'Toilet & cistern working': false,
      'Shower/bath functional': false,
      'Exhaust fans operational': false,
      'Tiles undamaged': false,
    },
    photos: [],
  },
  {
    id: nanoid(),
    name: 'Exterior & Final Notes',
    complete: false,
    conditionNotes: '',
    checklist: {
      'Front door secure': false,
      'Locks functional': false,
      'Garden/yard tidy': false,
      'Letterbox intact': false,
      'Garage/shed secure': false,
    },
    photos: [],
  },
];

export const batchSyncAllRentals = createAsyncThunk(
  'rentals/batchSyncAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { byId, syncStatus } = getState().rentals;
      const rentals = Object.values(byId);
      const unsynced = rentals.filter((r) => syncStatus[r.id] !== 'synced');
      const result = await batchSyncRentals(unsynced);
      await Promise.allSettled(unsynced.map((r) => upsertRentalLocal(r)));
      return { ...result, rentalIds: unsynced.map((r) => r.id) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk for cloud sync — parallel write to Firestore and SQLite
export const syncRentalReport = createAsyncThunk(
  'rentals/syncReport',
  async (reportId, { getState, rejectWithValue }) => {
    try {
      const rental = getState().rentals.byId[reportId];
      if (!rental) throw new Error('Rental report not found');
      await Promise.all([
        upsertFirestore(rental).catch(() => null),
        upsertRentalLocal(rental).catch(() => null),
      ]);
      await markRentalSynced(reportId).catch(() => null);
      return { reportId, syncedAt: new Date().toISOString() };
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

const rentalsSlice = createSlice({
  name: 'rentals',
  initialState,
  reducers: {
    createRentalReport: {
      reducer: (state, action) => {
        const { id, title, propertyAddress, inspectorName, userId, gpsLocation, createdAt } = action.payload;
        state.byId[id] = {
          id,
          title,
          propertyAddress,
          inspectorName,
          userId: userId || null,
          createdBy: userId || null,
          templateName: 'Rental Inspection',
          status: 'draft',
          createdAt,
          updatedAt: createdAt,
          gpsLocation,
          sections: buildDefaultSections(),
          pdfUri: null,
          totalPhotos: 0,
        };
        state.allIds.unshift(id);
        state.syncStatus[id] = 'draft';
      },
      prepare: ({ title, propertyAddress, inspectorName, userId, gpsLocation }) => ({
        payload: {
          id: nanoid(),
          title,
          propertyAddress,
          inspectorName,
          userId: userId || null,
          gpsLocation,
          createdAt: new Date().toISOString(),
        },
      }),
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
      if (section && section.checklist) {
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
        report.totalPhotos += 1;
        report.updatedAt = new Date().toISOString();
      }
    },

    removePhotoFromSection: (state, action) => {
      const { reportId, sectionId, photoIndex } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      const section = report.sections.find((s) => s.id === sectionId);
      if (section && section.photos[photoIndex]) {
        section.photos.splice(photoIndex, 1);
        report.totalPhotos -= 1;
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

    setReportPdfUri: (state, action) => {
      const { reportId, pdfUri } = action.payload;
      const report = state.byId[reportId];
      if (!report) return;
      report.pdfUri = pdfUri;
    },

    deleteRentalReport: (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      delete state.syncStatus[id];
      state.allIds = state.allIds.filter((rid) => rid !== id);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(syncRentalReport.pending, (state, action) => {
        state.syncStatus[action.meta.arg] = 'syncing';
      })
      .addCase(syncRentalReport.fulfilled, (state, action) => {
        const { reportId } = action.payload;
        state.syncStatus[reportId] = 'synced';
      })
      .addCase(syncRentalReport.rejected, (state, action) => {
        state.syncStatus[action.meta.arg] = 'error';
      })
      .addCase(batchSyncAllRentals.fulfilled, (state, action) => {
        const { rentalIds } = action.payload;
        rentalIds?.forEach((id) => {
          state.syncStatus[id] = 'synced';
        });
      });
  },
});

export const {
  createRentalReport,
  updateSectionNotes,
  toggleChecklistItem,
  addPhotoToSection,
  removePhotoFromSection,
  markSectionComplete,
  markReportComplete,
  setReportPdfUri,
  deleteRentalReport,
} = rentalsSlice.actions;

// Selectors
export const selectAllRentalReports = (state) =>
  state.rentals.allIds.map((id) => state.rentals.byId[id]);

export const selectRentalReportById = (id) => (state) => state.rentals.byId[id];

export const selectSyncStatus = (id) => (state) => state.rentals.syncStatus[id];

export const selectReportProgress = (id) => (state) => {
  const report = state.rentals.byId[id];
  if (!report) return 0;
  const done = report.sections.filter((s) => s.complete).length;
  return Math.round((done / report.sections.length) * 100);
};

export default rentalsSlice.reducer;
