// Mock authService so tests run without Firebase
jest.mock('../src/services/authService', () => ({
  signInAnon: jest.fn(),
  signInEmail: jest.fn(),
  registerEmail: jest.fn(),
  logout: jest.fn(),
}));

import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  loginAsGuest,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  clearError,
  setUser,
  selectCurrentUser,
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
} from '../src/store/slices/authSlice';
import * as authService from '../src/services/authService';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe('authSlice — unit tests', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Initial state ────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('starts with user null, loading false, error null', () => {
      const store = makeStore();
      expect(selectCurrentUser(store.getState())).toBeNull();
      expect(selectAuthLoading(store.getState())).toBe(false);
      expect(selectAuthError(store.getState())).toBeNull();
      expect(selectIsAuthenticated(store.getState())).toBe(false);
    });
  });

  // ── setUser reducer ──────────────────────────────────────────────────────
  describe('setUser', () => {
    it('sets user directly in state', () => {
      const store = makeStore();
      const payload = { uid: 'u1', email: 'a@b.com', displayName: 'Alice', isAnonymous: false };
      store.dispatch(setUser(payload));
      expect(selectCurrentUser(store.getState())).toEqual(payload);
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });
  });

  // ── clearError reducer ───────────────────────────────────────────────────
  describe('clearError', () => {
    it('clears an existing error', () => {
      // Inject an error by triggering a rejected thunk
      const store = makeStore();
      authService.signInEmail.mockResolvedValueOnce(null); // returns null → error path
      return store.dispatch(loginWithEmail({ email: 'x@x.com', password: 'pass' })).then(() => {
        expect(selectAuthError(store.getState())).not.toBeNull();
        store.dispatch(clearError());
        expect(selectAuthError(store.getState())).toBeNull();
      });
    });
  });

  // ── loginAsGuest ─────────────────────────────────────────────────────────
  describe('loginAsGuest', () => {
    it('sets an anonymous user when Firebase returns a user', async () => {
      authService.signInAnon.mockResolvedValueOnce({ uid: 'anon-123' });
      const store = makeStore();
      await store.dispatch(loginAsGuest('Jane'));
      const user = selectCurrentUser(store.getState());
      expect(user.uid).toBe('anon-123');
      expect(user.isAnonymous).toBe(true);
      expect(user.displayName).toBe('Jane');
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });

    it('falls back to local guest uid when Firebase is not configured (signInAnon returns null)', async () => {
      authService.signInAnon.mockResolvedValueOnce(null);
      const store = makeStore();
      await store.dispatch(loginAsGuest('Offline User'));
      const user = selectCurrentUser(store.getState());
      expect(user.uid).toMatch(/^guest_/);
      expect(user.isAnonymous).toBe(true);
      expect(user.displayName).toBe('Offline User');
    });

    it('falls back to local guest uid when signInAnon throws', async () => {
      authService.signInAnon.mockRejectedValueOnce(new Error('Network error'));
      const store = makeStore();
      await store.dispatch(loginAsGuest('Guest'));
      const user = selectCurrentUser(store.getState());
      expect(user.uid).toMatch(/^guest_/);
      expect(user.isAnonymous).toBe(true);
    });

    it('defaults display name to "Guest" when not provided', async () => {
      authService.signInAnon.mockResolvedValueOnce(null);
      const store = makeStore();
      await store.dispatch(loginAsGuest(''));
      const user = selectCurrentUser(store.getState());
      expect(user.displayName).toBe('Guest');
    });
  });

  // ── loginWithEmail ────────────────────────────────────────────────────────
  describe('loginWithEmail', () => {
    it('sets user on successful login', async () => {
      authService.signInEmail.mockResolvedValueOnce({
        uid: 'uid-99', email: 'user@test.com', displayName: 'Test User',
      });
      const store = makeStore();
      await store.dispatch(loginWithEmail({ email: 'user@test.com', password: 'secret' }));
      const user = selectCurrentUser(store.getState());
      expect(user.uid).toBe('uid-99');
      expect(user.email).toBe('user@test.com');
      expect(user.isAnonymous).toBe(false);
    });

    it('sets error when Firebase returns null (not configured)', async () => {
      authService.signInEmail.mockResolvedValueOnce(null);
      const store = makeStore();
      await store.dispatch(loginWithEmail({ email: 'x@x.com', password: 'p' }));
      expect(selectCurrentUser(store.getState())).toBeNull();
      expect(selectAuthError(store.getState())).toContain('Firebase not configured');
    });

    it('sets error on thrown exception', async () => {
      authService.signInEmail.mockRejectedValueOnce(new Error('Wrong password'));
      const store = makeStore();
      await store.dispatch(loginWithEmail({ email: 'x@x.com', password: 'bad' }));
      expect(selectAuthError(store.getState())).toBe('Wrong password');
    });

    it('sets loading true while pending, false when done', async () => {
      let resolveAuth;
      authService.signInEmail.mockReturnValueOnce(
        new Promise((res) => { resolveAuth = res; })
      );
      const store = makeStore();
      const thunkPromise = store.dispatch(loginWithEmail({ email: 'a@b.com', password: 'p' }));
      expect(selectAuthLoading(store.getState())).toBe(true);
      resolveAuth({ uid: 'u', email: 'a@b.com', displayName: null });
      await thunkPromise;
      expect(selectAuthLoading(store.getState())).toBe(false);
    });
  });

  // ── registerWithEmail ─────────────────────────────────────────────────────
  describe('registerWithEmail', () => {
    it('creates and sets a new user', async () => {
      authService.registerEmail.mockResolvedValueOnce({
        uid: 'new-uid', email: 'new@test.com',
      });
      const store = makeStore();
      await store.dispatch(registerWithEmail({ email: 'new@test.com', password: 'pass123' }));
      const user = selectCurrentUser(store.getState());
      expect(user.uid).toBe('new-uid');
      expect(user.email).toBe('new@test.com');
      expect(user.isAnonymous).toBe(false);
    });
  });

  // ── logoutUser ────────────────────────────────────────────────────────────
  describe('logoutUser', () => {
    it('clears user from state', async () => {
      authService.signInAnon.mockResolvedValueOnce({ uid: 'u1' });
      authService.logout.mockResolvedValueOnce(undefined);
      const store = makeStore();
      await store.dispatch(loginAsGuest('Jane'));
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      await store.dispatch(logoutUser());
      expect(selectCurrentUser(store.getState())).toBeNull();
      expect(selectIsAuthenticated(store.getState())).toBe(false);
    });

    it('still clears state even if logout throws', async () => {
      authService.signInAnon.mockResolvedValueOnce({ uid: 'u2' });
      authService.logout.mockRejectedValueOnce(new Error('Network'));
      const store = makeStore();
      await store.dispatch(loginAsGuest('Bob'));
      await store.dispatch(logoutUser());
      expect(selectCurrentUser(store.getState())).toBeNull();
    });
  });
});
