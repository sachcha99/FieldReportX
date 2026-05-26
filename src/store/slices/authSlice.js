import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  signInEmail, registerEmail, signInAnon, logout,
} from '../../services/authService';

function friendlyAuthError(msg = '') {
  if (msg.includes('configuration-not-found')) {
    return 'Email/Password sign-in is not enabled in the Firebase Console. Go to Authentication → Sign-in method and enable it.';
  }
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('email-already-in-use')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('weak-password')) {
    return 'Password is too weak. Use at least 6 characters.';
  }
  if (msg.includes('network-request-failed')) {
    return 'Network error. Check your internet connection and try again.';
  }
  return msg;
}

export const loginWithEmail = createAsyncThunk(
  'auth/loginWithEmail',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const user = await signInEmail(email, password);
      if (!user) throw new Error('Firebase not configured — use Guest login.');
      return { uid: user.uid, email: user.email, displayName: user.displayName, isAnonymous: false };
    } catch (err) {
      return rejectWithValue(friendlyAuthError(err.message));
    }
  }
);

export const registerWithEmail = createAsyncThunk(
  'auth/registerWithEmail',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const user = await registerEmail(email, password);
      if (!user) throw new Error('Firebase not configured — use Guest login.');
      return { uid: user.uid, email: user.email, displayName: null, isAnonymous: false };
    } catch (err) {
      return rejectWithValue(friendlyAuthError(err.message));
    }
  }
);

export const loginAsGuest = createAsyncThunk(
  'auth/loginAsGuest',
  async (displayName, { rejectWithValue }) => {
    try {
      const user = await signInAnon();
      if (user) {
        return { uid: user.uid, email: null, displayName: displayName || 'Guest', isAnonymous: true };
      }
      // Firebase not configured — local guest fallback
      return { uid: `guest_${Date.now()}`, email: null, displayName: displayName || 'Guest', isAnonymous: true };
    } catch (err) {
      // Always allow guest login even without Firebase
      return { uid: `guest_${Date.now()}`, email: null, displayName: displayName || 'Guest', isAnonymous: true };
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await logout();
    } catch {
      // Ignore logout errors
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(loginWithEmail.pending, pending)
      .addCase(loginWithEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginWithEmail.rejected, rejected)

      .addCase(registerWithEmail.pending, pending)
      .addCase(registerWithEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(registerWithEmail.rejected, rejected)

      .addCase(loginAsGuest.pending, pending)
      .addCase(loginAsGuest.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginAsGuest.rejected, rejected)

      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { setUser, clearError } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsAuthenticated = (state) => state.auth.user !== null;

export default authSlice.reducer;
