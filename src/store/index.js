import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rentalsReducer from './slices/rentalsSlice';
import reportsReducer from './slices/reportsSlice';
import authReducer from './slices/authSlice';

const rootReducer = combineReducers({
  rentals: rentalsReducer,
  reports: reportsReducer,
  auth: authReducer,
});

const persistConfig = {
  key: 'fieldreportx-root',
  storage: AsyncStorage,
  whitelist: ['rentals', 'reports', 'auth'],
  version: 1,
  throttle: 500,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
