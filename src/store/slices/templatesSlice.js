import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = {
  customTemplates: [],
};

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    saveCustomTemplate: {
      reducer: (state, action) => {
        const existing = state.customTemplates.findIndex((t) => t.id === action.payload.id);
        if (existing >= 0) {
          state.customTemplates[existing] = action.payload;
        } else {
          state.customTemplates.push(action.payload);
        }
      },
      prepare: ({ name, category, color, sections, id }) => ({
        payload: {
          id: id || nanoid(),
          name,
          category: category || 'Custom',
          color: color || '#6366F1',
          sections,
          createdAt: new Date().toISOString(),
          version: 1,
        },
      }),
    },

    deleteCustomTemplate: (state, action) => {
      state.customTemplates = state.customTemplates.filter((t) => t.id !== action.payload);
    },

    importTemplate: (state, action) => {
      const tmpl = action.payload;
      if (!tmpl?.id || !tmpl?.name || !tmpl?.sections) return;
      const existing = state.customTemplates.findIndex((t) => t.id === tmpl.id);
      if (existing >= 0) {
        state.customTemplates[existing] = { ...tmpl, version: (tmpl.version || 1) + 1 };
      } else {
        state.customTemplates.push(tmpl);
      }
    },
  },
});

export const { saveCustomTemplate, deleteCustomTemplate, importTemplate } = templatesSlice.actions;

export const selectCustomTemplates = (state) => state.templates?.customTemplates ?? [];
export const selectCustomTemplateById = (id) => (state) =>
  state.templates?.customTemplates.find((t) => t.id === id);

export default templatesSlice.reducer;
