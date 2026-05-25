# FieldReportX

**CSE35007 — Mobile Application Development**
Sachintha Nipun Muramudalige — 21922620

A cross-platform field reporting application built with Expo (React Native). Enables inspectors, assessors, and field workers to create, complete, and share structured inspection reports across multiple report types.

---

## Getting Started

```bash
npm install
cp .env   
npx expo start
```

### Production Build (APK)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # outputs an APK
eas build --platform android --profile production # Play Store AAB
```

### Run Tests

```bash
npm test              # run all Jest tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

---

## Firebase Test Lab

After building an APK with EAS Build:

1. Go to [Firebase Console](https://console.firebase.google.com) → Test Lab
2. Upload the APK from the EAS Build artefact
3. Run a **Robo test** (no code required) to automatically crawl all screens
4. Or run an **instrumented test** (Detox/Espresso) against the APK

---

## Application Architecture

```
App.js                    Bootstrap: Redux, Navigation, parallel startup init
src/
  config/
    env.js                Reads Firebase/AdMob credentials from Expo Constants
    __mocks__/env.js      Jest mock for env config
  services/
    firebaseConfig.js     Firebase app initialisation (lazy, no-op if unconfigured)
    firestoreService.js   Firestore CRUD + parallel batchSync via Promise.allSettled
    authService.js        Firebase Auth (anonymous + email/password)
    sqliteService.js      expo-sqlite local relational DB (offline-first)
    backgroundSyncTask.js expo-task-manager background sync every 15 min
    batteryService.js     expo-battery level, state, low-power mode
    sensorService.js      expo-sensors accelerometer + gyroscope
    locationService.js    expo-location GPS
    notificationService.js expo-notifications scheduled + immediate
    audioService.js       expo-av audio recording and playback
    pdfService.js         expo-print PDF generation with parallel data fetch
  store/
    index.js              Redux store + redux-persist to AsyncStorage
    slices/
      reportsSlice.js     Generic report state + Firestore/SQLite sync thunks
      rentalsSlice.js     Rental inspection state + Firestore/SQLite sync thunks
  screens/                11 screens (HomeScreen through ReportComparison)
  components/
    BatteryIndicator.js   Live battery % in header
    AdBanner.js           AdMob banner (test IDs in dev; real IDs via .env)
    LocationMap.js        react-native-maps GPS preview
  theme/
    tokens.js             Design tokens (colours, spacing, radius)
__tests__/                Jest unit tests
```

---

## Firebase Technologies Used

### 1. Cloud Firestore

**What it is:** A NoSQL cloud database that stores reports as JSON documents and syncs them in real time.

**Why selected:** Field reports need to be accessible across devices and shareable with supervisors or clients. Firestore's offline-first SDK caches data locally and syncs automatically when connectivity is restored — critical for field workers in areas with intermittent coverage. Its document/collection model maps directly onto the app's report structure (report → sections → checklist items).

**Where used:**
- `src/services/firestoreService.js` — `upsertReport`, `fetchAllReports`, `batchSyncReports` (parallel sync via `Promise.allSettled`)
- Redux thunks in `reportsSlice.js` and `rentalsSlice.js` — each sync dispatches a parallel write to both Firestore and SQLite

### 2. Firebase Authentication

**What it is:** A managed identity service supporting anonymous auth, email/password, Google Sign-In, and more.

**Why selected:** Reports must be attributed to a specific user so Firestore security rules can enforce read/write access per user. Anonymous authentication lets users start using the app immediately without a registration barrier, while still providing a stable `uid` for scoping their data in Firestore. Email/password registration is available for users who want a persistent account across reinstalls.

**Where used:**
- `src/services/authService.js` — `signInAnon`, `signInEmail`, `registerEmail`, `subscribeAuthState`
- `App.js` — signs the user in anonymously at startup (runs in parallel with SQLite init and AdMob init via `Promise.all`)

### 3. Firebase Test Lab

**What it is:** A cloud-based app testing infrastructure that runs your APK on real physical and virtual devices hosted by Google.

**Why selected:** Mobile apps have device-specific behaviours (sensor support, screen density, Android versions) that are impossible to replicate in a single emulator. Test Lab's Robo test automatically crawls every screen of the built APK, detecting crashes and UI errors without writing a single test script. This complements the Jest unit tests (which validate business logic) by validating the actual rendered app on real hardware from multiple manufacturers.

**How to use:**
1. Build APK: `eas build --platform android --profile preview`
2. Firebase Console → Test Lab → Run a test → Upload APK
3. Choose **Robo test** for automatic screen crawl
4. Or upload a Detox/Espresso test package for instrumented testing

---

## Device Capabilities

| Capability | Package | Where Used |
|---|---|---|
| Accelerometer + Gyroscope | `expo-sensors` | DrivingDetailScreen — live smoothness scoring |
| GPS / Location | `expo-location` | CreateRentalScreen — geotag + map preview |
| Camera + Photos | `expo-camera`, `expo-image-picker` | All detail screens — evidence photos |
| Audio recording | `expo-av` | GenericReportDetailScreen — voice notes |
| Notifications | `expo-notifications` | Scheduled report reminders + follow-ups |
| Battery | `expo-battery` | HomeScreen header — live battery % indicator |
| Maps | `react-native-maps` | CreateRentalScreen — GPS map preview |

---

## Data Storage Strategy

The app uses a **two-layer offline-first** approach:

| Layer | Technology | Purpose |
|---|---|---|
| Primary state | Redux + redux-persist + AsyncStorage | Instant UI reactivity, survives app restarts |
| Local relational DB | `expo-sqlite` (SQLite) | Queryable offline store, tracks unsynced records, background sync source |
| Cloud | Firebase Firestore | Multi-device sync, supervisor access, backup |

Data flow: Redux reducer → AsyncStorage (immediate) → SQLite upsert → Firestore sync (on demand or via background task).

---

## Parallel Programming

`Promise.all` and `Promise.allSettled` are used throughout to avoid sequential bottlenecks:

- **App startup** (`App.js`): SQLite init, Firebase auth, AdMob init, and background task registration all run concurrently.
- **Sync thunks** (`reportsSlice.js`, `rentalsSlice.js`): Each sync writes to Firestore and SQLite simultaneously via `Promise.all`.
- **Batch sync** (`firestoreService.js`): `batchSyncReports` uses `Promise.allSettled` to sync all pending records concurrently without one failure blocking others.
- **Background task** (`backgroundSyncTask.js`): Fetches unsynced records from both tables in parallel, then syncs both collections in parallel.
- **PDF generation** (`pdfService.js`): Fetches current GPS location and battery level in parallel while building the HTML content.

---

## Work Manager / Background Sync

`expo-task-manager` + `expo-background-fetch` register a background task (`FIELDREPORTX_BACKGROUND_SYNC`) that:

1. Runs every 15 minutes (minimum interval enforced by the OS)
2. Queries SQLite for all unsynced reports and rentals
3. Batch-syncs them to Firestore using parallel `Promise.allSettled`
4. Marks successfully synced records in SQLite

The task starts on device boot (`startOnBoot: true`) and continues when the app is terminated (`stopOnTerminate: false`).

---

## AdMob Integration

Banner ads are shown on the HomeScreen. In development and Expo Go, Google's official test banner ID is used automatically. In production, real IDs are loaded from environment variables.

AdMob requires a custom dev client or production build (EAS Build) — it cannot load in the standard Expo Go app. A placeholder UI is shown in Expo Go.

---

## Environment Variables — No Hard-coded Secrets

All credentials are loaded at build time via `app.config.js` → `process.env`, then accessed at runtime via `Constants.expoConfig.extra`. No API key or app ID appears in committed source files.

| File | Purpose |
|---|---|
| `.env` | Your real values — gitignored |
| `app.config.js` | Reads `process.env` at build time, writes to `extra` |
| `src/config/env.js` | Reads `Constants.expoConfig.extra` at runtime |

---

## Limitations and Future Improvements

### Current Limitations

1. **Anonymous auth is not persistent across reinstalls.** A new anonymous uid is created on fresh install, losing access to previously synced Firestore documents unless the user links an email account first.
2. **SQLite and Redux state can diverge** if the app is killed mid-write. A reconciliation step at startup would improve reliability.
3. **AdMob and react-native-maps require EAS Build.** These features show fallback UI in standard Expo Go, which slows the development feedback loop.
4. **Background sync frequency is OS-controlled.** iOS enforces a 15–30 minute minimum; Android varies by power mode. Real-time sync would require a Firebase push trigger or a foreground service.
5. **Photos are stored as local URIs** (`file://...`) and are not uploaded to Firebase Storage. PDFs shared to other devices will have missing images.

### Future Improvements

1. **Firebase Storage** for photo and audio file upload, so PDFs are fully self-contained when shared.
2. **Email/password login screen** with anonymous-to-email account linking so users retain data after registering.
3. **Firestore real-time listeners** (`onSnapshot`) for live collaboration — multiple inspectors editing the same report simultaneously.
4. **Detox end-to-end tests** integrated with Firebase Test Lab, run automatically on every EAS Build via GitHub Actions.
5. **FCM push notifications** to alert supervisors when a report is submitted for sign-off.
6. **Offline map tiles** (e.g., MapLibre) for GPS display in areas without internet connectivity.
7. **Server-side report templates** — fetch template definitions from Firestore so new report types can be added without releasing an app update.
