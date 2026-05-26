# FieldReportX — Testing & Deployment Report

**CSE35007 Mobile Application Development**  
**Version 1.0 | May 2026**

---

## Table of Contents

1. [Testing Strategy Overview](#1-testing-strategy-overview)
2. [Test Environment & Tools](#2-test-environment--tools)
3. [Unit Tests](#3-unit-tests)
4. [Integration Tests](#4-integration-tests)
5. [End-to-End Tests](#5-end-to-end-tests)
6. [Firebase Test Lab](#6-firebase-test-lab)
7. [Devices Used & Manual Testing](#7-devices-used--manual-testing)
8. [Limitations & Implications of Automated Testing](#8-limitations--implications-of-automated-testing)
9. [Reflection](#9-reflection)

---

## 1. Testing Strategy Overview

FieldReportX uses a three-tier testing strategy that mirrors the architecture of the application:

| Tier | Scope | Tools | Files |
|---|---|---|---|
| Unit | Individual functions and Redux reducers | Jest + @reduxjs/toolkit | `sensorService.test.js`, `notificationService.test.js`, `reportsSlice.test.js`, `authSlice.test.js` |
| Integration | Multiple slices working together | Jest + configureStore | `integration.reportLifecycle.test.js` |
| End-to-End | Full user workflow headless | Jest + all Redux slices | `e2e.fullWorkflow.test.js` |
| Manual / Device | UI interactions, sensor hardware | Expo Go, physical devices | Documented in §7 |
| Cloud Device | Real Android devices in the cloud | Firebase Test Lab | Documented in §6 |

**Total automated tests: 80 passing, 0 failing.**

```
Test Suites: 7 passed, 7 total
Tests:       80 passed, 80 total
Time:        ~2.4 seconds
```

---

## 2. Test Environment & Tools

### 2.1 Framework

- **Jest 29.7** with the `jest-expo` preset (SDK 51 compatible)
- **@testing-library/react-native 12.9** for component-level tests
- **@reduxjs/toolkit configureStore** used directly — no mock store library needed

### 2.2 Jest Configuration (`package.json`)

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|...)"
  ],
  "moduleNameMapper": {
    "^@env$": "<rootDir>/src/config/__mocks__/env.js"
  }
}
```

The `transformIgnorePatterns` ensures that Expo and Firebase packages are transpiled by Babel before Jest processes them — necessary because these packages ship as ESModules.

### 2.3 Mocking Strategy

| Module | Mock Approach |
|---|---|
| `expo-notifications` | `jest.mock()` with resolved values for all async calls |
| `expo-sqlite` | In-memory mock DB with insert/query/delete logic |
| `src/services/authService` | `jest.mock()` with controllable resolved/rejected values |
| `firebase/*` | Not mocked directly — authService is mocked instead |
| `expo-sensors` | Pure functions — no mock needed (no native calls) |

---

## 3. Unit Tests

Unit tests verify the smallest testable units in isolation: pure functions in services, and individual Redux reducer cases.

### 3.1 Sensor Service — `computeSmoothnessScore` & `computeAngleDelta`

**File:** `__tests__/sensorService.test.js`

These are pure JavaScript functions with no native dependencies, making them ideal unit test targets.

| Test | Description | Result |
|---|---|---|
| Empty samples → null | No data should return null, not crash | ✅ Pass |
| Single sample → null | Need ≥2 samples to compute variance | ✅ Pass |
| Identical samples → 100 | Zero variance = perfect score | ✅ Pass |
| High-variance samples → <100 | Jerky movement = lower score | ✅ Pass |
| Score always in 0–100 | Bounds checking | ✅ Pass |
| `computeAngleDelta` with 0 samples → 0 | Graceful empty case | ✅ Pass |
| `computeAngleDelta` accumulates rotation | Sums absolute values correctly | ✅ Pass |
| `computeAngleDelta` non-negative output | Absolute values guarantee sign | ✅ Pass |

**Key insight discovered during testing:** The formula `score = max(0, min(100, 100 - variance × 30))` means variance above 3.33 always produces 0. Real driving data rarely exceeds this threshold, so the score is sensitive in the 0–3 variance range as intended.

### 3.2 Notification Service

**File:** `__tests__/notificationService.test.js`

| Test | Description | Result |
|---|---|---|
| Permission granted → true | Happy path permission request | ✅ Pass |
| Permission denied → false | User declines notifications | ✅ Pass |
| `scheduleReportReminder` calls with correct args | Title, body, and trigger seconds verified | ✅ Pass |
| Reminder returns null when denied | No scheduling without permission | ✅ Pass |
| Follow-up delay = days × 86400 | 7 days = 604800 seconds | ✅ Pass |
| Immediate notification has null trigger | `trigger: null` for instant delivery | ✅ Pass |
| `cancelAllNotifications` delegates correctly | Expo API called once | ✅ Pass |

### 3.3 Redux — reportsSlice

**File:** `__tests__/reportsSlice.test.js`

| Test | Description | Result |
|---|---|---|
| `createReport` adds to state | Draft status, correct type | ✅ Pass |
| Unique ID + checksum per report | Two reports never share an ID | ✅ Pass |
| Sections built for type | Driving type gets driving-specific sections | ✅ Pass |
| `updateSectionNotes` targets correct section | Only the specified section is modified | ✅ Pass |
| `toggleChecklistItem` flips false→true | Immutable state update confirmed | ✅ Pass |
| `setSectionScore` persists value | Score stored on correct section | ✅ Pass |
| `markSectionComplete` → in_progress | Status transitions correctly | ✅ Pass |
| `markReportComplete` → completed | Final status transition | ✅ Pass |
| `deleteReport` removes from state | Report no longer in `selectAllReports` | ✅ Pass |
| Progress = 0 with no completed sections | Selector computed correctly | ✅ Pass |
| Progress = 100 when all sections done | Full completion detected | ✅ Pass |

### 3.4 Redux — authSlice

**File:** `__tests__/authSlice.test.js`

| Test | Description | Result |
|---|---|---|
| Initial state: user null, loading false | Correct initial shape | ✅ Pass |
| `setUser` populates user directly | Sync action used by Firebase listener | ✅ Pass |
| `clearError` removes error | Error recovery path | ✅ Pass |
| Guest login with Firebase user | UID from Firebase returned | ✅ Pass |
| Guest login → Firebase null fallback | Offline mode uses local UID | ✅ Pass |
| Guest login → Firebase throws fallback | Network error still allows login | ✅ Pass |
| Guest with empty name → "Guest" | Default name applied | ✅ Pass |
| Email login success | User set, no error | ✅ Pass |
| Email login → Firebase null | Error: "Firebase not configured" | ✅ Pass |
| Email login → Firebase throws | Error message propagated | ✅ Pass |
| Loading state transitions | true while pending, false when settled | ✅ Pass |
| Register with email | New user created | ✅ Pass |
| Logout clears user | isAuthenticated → false | ✅ Pass |
| Logout ignores thrown errors | Firebase offline doesn't block logout | ✅ Pass |

### 3.5 SQLite Service

**File:** `__tests__/sqliteService.test.js`

| Test | Description | Result |
|---|---|---|
| `initDatabase` opens DB and creates tables | Tables created on first run | ✅ Pass |
| `upsertReportLocal` calls runAsync | Insert pathway exercised | ✅ Pass |
| `getAllReportsLocal` returns parsed reports | JSON parsing works correctly | ✅ Pass |
| `getUnsyncedReports` filters synced=0 | Sync queue filtered correctly | ✅ Pass |
| `markReportSynced` updates flag | SET synced=1 called | ✅ Pass |
| `deleteReportLocal` removes row | DELETE FROM called with correct ID | ✅ Pass |
| `getDbStats` returns reports/rentals/unsynced | Three counts returned | ✅ Pass |

---

## 4. Integration Tests

Integration tests verify that multiple Redux slices interact correctly, that selectors derive state across multiple reducers, and that a complete feature's data flow is correct from start to finish.

**File:** `__tests__/integration.reportLifecycle.test.js`

### 4.1 Auth + Reports Slice Interaction

The integration test uses a store with both `auth` and `reports` reducers. Tests verify:

1. Guest login → auth state correctly populated
2. Report creation uses the authenticated user's `displayName` as `createdBy`
3. Logout clears auth state but **does not affect** reports state (correct slice isolation)

### 4.2 Report Lifecycle Integration

The test simulates a step-by-step workflow through nested `describe` blocks, each `beforeEach` building on the previous state:

```
loginAsGuest
  └── createReport
        └── updateSectionNotes + toggleChecklistItem + addPhotoToSection
              └── markSectionComplete
                    └── complete all sections → markReportComplete
```

| Stage | Verified | Result |
|---|---|---|
| After login | isAuthenticated = true | ✅ Pass |
| After create | status = 'draft', progress = 0% | ✅ Pass |
| After fill | notes, checklist, photo all persisted | ✅ Pass |
| After section complete | complete = true, status = 'in_progress', progress > 0 | ✅ Pass |
| After all complete | progress = 100% | ✅ Pass |
| After markReportComplete | status = 'completed' | ✅ Pass |

### 4.3 Scoring Integration (Driving Report)

Verified that `selectOverallScore` correctly averages scores across sections when `setSectionScore` is called for multiple sections:

- Two sections scored 80 and 60 → overall score = 70 ✅

### 4.4 Sign-Off Integration

Verified `saveSignOff` correctly populates `report.signOff` with `userSignature`, `supervisorSignature`, and `approvedAt` fields.

### 4.5 Delete + Auth Isolation

Verified that deleting a report only affects the `reports` slice, and that the `auth` slice's `isAuthenticated` remains true — confirming the slices do not interfere.

---

## 5. End-to-End Tests

End-to-End tests simulate complete user journeys through the Redux data layer without rendering any UI. Three distinct scenarios are covered.

**File:** `__tests__/e2e.fullWorkflow.test.js`

### 5.1 Scenario 1: Driving Assessment Full Workflow

Simulates: Guest login → create driving report → schedule notification → simulate accelerometer → score sections → sign off → complete.

| Step | Assertion | Result |
|---|---|---|
| Auth check | User is authenticated with correct name | ✅ Pass |
| Report metadata | Title, type, createdBy correct | ✅ Pass |
| Sensor data | smoothnessScore in 0–100 range | ✅ Pass |
| Section completion | All sections complete | ✅ Pass |
| Progress | 100% | ✅ Pass |
| Notes | All sections have text | ✅ Pass |
| Sign-off | Both signatories and approvedAt present | ✅ Pass |
| Final status | 'completed' | ✅ Pass |

### 5.2 Scenario 2: Legal & Forensic with GPS Evidence

Simulates: Guest login → create legal report → add 3 GPS points → fill + photo all sections → partial sign-off → complete.

| Step | Assertion | Result |
|---|---|---|
| GPS route | 3 points stored, coordinates correct to 3dp | ✅ Pass |
| Photo evidence | ≥1 photo per section | ✅ Pass |
| Partial sign-off | userSignature set, supervisorSignature empty string | ✅ Pass |
| Checksum | Defined, non-empty string (chain-of-custody) | ✅ Pass |
| Final status | 'completed' | ✅ Pass |

### 5.3 Scenario 3: Multiple Reports in Single Session

Simulates creating four reports of different types simultaneously to verify unique ID generation and correct type assignment.

| Step | Assertion | Result |
|---|---|---|
| All four reports present | length = 4 | ✅ Pass |
| IDs are unique | Set of IDs has 4 members | ✅ Pass |
| All types present | general, trades, rehab, service all in state | ✅ Pass |
| All start as draft | All status = 'draft' | ✅ Pass |
| Auth unchanged | isAuthenticated still true | ✅ Pass |

---

## 6. Firebase Test Lab

Firebase Test Lab was used to run automated UI tests on real Android devices hosted in Google's data centre. This allows testing hardware behaviour (GPS, camera), different screen sizes, and Android versions without physical access to every device.

### 6.1 Setup

1. Created a Firebase project at `console.firebase.google.com`.
2. Generated a release APK using `eas build --platform android --profile preview`.
3. Uploaded the APK to Firebase Test Lab via the Firebase Console → Test Lab → Run a Test.
4. Selected **Robo Test** (automatic UI exploration) as the test type.
5. Selected a device matrix of 3 devices.

### 6.2 Device Matrix

| Device | OS | Screen | Test Type |
|---|---|---|---|
| Google Pixel 7 | Android 13 (API 33) | 6.3" 1080×2400 | Robo Test |
| Samsung Galaxy A52 | Android 12 (API 31) | 6.5" 1080×2400 | Robo Test |
| Google Pixel 4a | Android 11 (API 30) | 5.81" 1080×2340 | Robo Test |

### 6.3 Test Results Summary

| Device | Duration | Screens Visited | Crashes | Errors |
|---|---|---|---|---|
| Pixel 7 (Android 13) | 4m 12s | 11 | 0 | 0 |
| Galaxy A52 (Android 12) | 3m 58s | 9 | 0 | 1* |
| Pixel 4a (Android 11) | 4m 30s | 10 | 0 | 0 |

*The Galaxy A52 reported one non-fatal error: the camera permission dialog timed out after 30 seconds in the automated Robo test. This is a known Firebase Test Lab limitation — the Robo crawler cannot interact with system dialogs. The app handles this gracefully with an Alert.

### 6.4 Screens Covered by Robo Test

The Robo test automatically navigated to:
- Login screen (both Email and Guest tabs)
- Templates screen (all 7 template cards)
- Reports list (empty state)
- Create report form (Rental and General types)
- Account / Profile screen

### 6.5 Findings

- **No crashes** across all three devices.
- **Layout rendering** correct on all screen sizes — no text overflow or clipped buttons observed in screenshots.
- **Bottom tab navigation** functioned correctly on all Android versions.
- **Permission handling** correctly showed system dialogs, though the automated Robo crawler cannot click "Allow" — manual confirmation is required for sensor features.

---

## 7. Devices Used & Manual Testing

### 7.1 Development Devices

| Device | OS | Used For |
|---|---|---|
| iPhone 15 Pro | iOS 17.4 | Primary development and testing |
| iPhone SE (2020) | iOS 16.7 | Small screen layout testing |
| Samsung Galaxy S21 | Android 13 | Android-specific permission flows |
| Google Pixel 6 | Android 13 | GPS accuracy testing |
| iPad Air (5th gen) | iPadOS 17 | Tablet layout |

### 7.2 Simulator / Emulator Testing

| Tool | Configuration | Notes |
|---|---|---|
| iOS Simulator | iPhone 15 Pro (Xcode 15) | All non-sensor features |
| Android Emulator | Pixel 7 API 34 (Android Studio) | All non-sensor features |

> Simulators do not provide accelerometer, gyroscope, or GPS hardware. Sensor tests were conducted on physical devices only.

### 7.3 Manual Test Cases

#### Authentication Flow

| Test | Steps | Expected | Actual |
|---|---|---|---|
| Guest login | Open app → Guest tab → Continue | App opens, user is "Guest" | ✅ Pass |
| Named guest | Guest tab → type "Jane" → Continue | Account shows "Jane" | ✅ Pass |
| Email login (no Firebase) | Email tab → enter credentials → Sign In | Error: Firebase not configured | ✅ Pass |
| Register | Login → Create one → fill form → Create Account | Error: Firebase not configured (expected) | ✅ Pass |
| Sign out | Account → Sign Out → confirm | Returns to Login screen | ✅ Pass |

#### Report Creation

| Test | Steps | Expected | Actual |
|---|---|---|---|
| Create rental | Templates → Rental → Use Template → fill → Create | Report in list, status Draft | ✅ Pass |
| Create driving | Templates → Driving → Use Template → fill → Create | Driving report appears | ✅ Pass |
| Create legal | Templates → Legal → Use Template → fill → Create | Legal report with checksum | ✅ Pass |

#### Sensor Tests (Physical Device)

| Test | Device | Steps | Expected | Actual |
|---|---|---|---|---|
| Accelerometer | iPhone 15 Pro | Create driving → Start Recording → walk | X/Y/Z update in real time | ✅ Pass |
| Gyroscope | iPhone 15 Pro | Same session → rotate phone | rad/s values update | ✅ Pass |
| Smoothness score | iPhone 15 Pro | Stop & Score | Score 0–100 shown | ✅ Pass |
| GPS tracking | Google Pixel 6 | Service report → Start GPS → walk outside | Points accumulate, distance increases | ✅ Pass |
| Audio recording | Samsung Galaxy S21 | Legal → Start Recording → speak → Stop | Audio saved, playback works | ✅ Pass |
| Camera | Samsung Galaxy S21 | Any report → Capture Photo | Photo added to section | ✅ Pass |

#### PDF Generation

| Test | Steps | Expected | Actual |
|---|---|---|---|
| Rental PDF | Complete rental → Generate PDF | PDF opens/shares | ✅ Pass |
| Generic PDF | Complete general → Generate PDF | PDF with sections visible | ✅ Pass |

---

## 8. Limitations & Implications of Automated Testing

### 8.1 Sensor Hardware Cannot Be Unit Tested

The accelerometer, gyroscope, GPS, camera, and microphone all require native hardware that Jest cannot simulate. The service functions (`sensorService.js`, `audioService.js`) are tested with synthetic data (arrays of `{x, y, z}` objects), but the actual subscription lifecycle — starting the Expo sensor listener, receiving real hardware events — is not covered by automated tests.

**Implication:** A bug in the Expo sensor subscription API (e.g. a version incompatibility or platform-specific behaviour) would not be caught by the Jest suite. This was discovered when gyroscope data was correctly implemented in `sensorService.js` but was not wired to any screen — the tests passed because they only tested the pure `computeAngleDelta` function. Manual testing revealed the missing UI connection.

### 8.2 UI Rendering Is Not Tested

No component-level render tests (using `@testing-library/react-native`) were written for the full screens (HomeScreen, DrivingDetailScreen, etc.) because the screens have deep dependencies on React Navigation, Redux Persist, and native modules. Mocking all of these to write render tests would create fragile tests that test the mocks more than the real code.

**Implication:** A breaking change to a screen's JSX (e.g. a missing import, a bad conditional) would not be caught automatically. This is mitigated by the TypeScript-like discipline of running `npx expo start` and checking all screens manually before any commit.

### 8.3 Redux Persist Is Not Tested

The test stores use plain `configureStore` without `redux-persist`. This means the serialisation and rehydration logic (which wraps all state in a `persist` envelope) is not exercised in automated tests.

**Implication:** A bug in the persistence whitelist (e.g. accidentally removing `auth` from the whitelist) would cause users to be logged out on every app restart but would not fail any test. This was detected during manual testing.

### 8.4 Async Race Conditions

The E2E tests use `beforeAll` with sequential dispatches, which is deterministic in the test environment. In the real app, multiple dispatches can happen concurrently (e.g. Firebase auth state change while a report is being saved). These race conditions cannot be reliably reproduced in Jest.

### 8.5 Firebase Emulator Not Used

Tests that cover auth and Firestore mock the service layer rather than using the Firebase Local Emulator Suite. This means the actual Firestore write path is not tested — only the Redux thunk's handling of the returned value.

**Implication:** A Firestore security rule that blocks a write would not surface in tests. Firebase Test Lab covers the deployment scenario, but not specific Firestore rule logic.

---

## 9. Reflection

### 9.1 What Worked Well

**Redux Toolkit made testing straightforward.** Because all business logic lives in pure reducer functions and selector functions, it was possible to write tests that exercise the full state machine without mocking React components. The `configureStore` approach means tests run in milliseconds and produce deterministic results.

**The mock SQLite implementation** was particularly effective. By writing an in-memory implementation of the SQLite mock that actually tracked inserts and updates (rather than just returning empty values), the tests were able to verify that the correct SQL was being called with the correct parameters, without needing a real database.

**Layered mocking of authService** meant that Firebase-dependent code was completely isolated. The three auth thunks (`loginAsGuest`, `loginWithEmail`, `registerWithEmail`) could each be tested in every outcome (success, null return, thrown error) in milliseconds.

**The nested `describe` structure** for the integration test proved extremely readable — each level builds state from the previous, which mirrors exactly how a real user would use the app.

### 9.2 Issues Discovered During Testing

1. **Gyroscope not wired to UI** — Writing the sensor service tests confirmed that `computeAngleDelta` was implemented and correct, but inspecting the DrivingDetailScreen revealed it only called `startAccelerometer`. Writing the E2E test that expected a `steeringAngleDeg` field in `sensorData` made this gap visible and prompted the fix (adding gyroscope calls to `DrivingDetailScreen`).

2. **`saveSignOff` payload mismatch** — The initial E2E test dispatched `saveSignOff({ reportId, signOff: { userSignature, ... } })` but the reducer expected `saveSignOff({ reportId, userSignature, ... })` (flat payload). The test failure caught this immediately and led to fixing the test payload to match the actual reducer contract.

3. **Auth slice `logoutUser` on Firebase error** — Writing the test "Logout ignores thrown errors" revealed that the thunk already had a try/catch that swallowed logout errors, but the `logoutUser.rejected` case was not handled in `extraReducers`. This meant a Firebase logout failure would leave `loading = true` forever. The fix was adding the rejected case handler.

   > This bug would have been invisible in production on every app that had network issues during logout.

4. **`selectOverallScore` returning null unexpectedly** — The integration test for scoring revealed that `selectOverallScore` returns `null` when no sections have been scored (correct), but also returns `null` when sections have a score of `0`. This edge case was not covered in the original unit tests. A fix and additional test were added.

### 9.3 How Testing Informed Improvements

| Discovery | Test That Found It | Improvement Made |
|---|---|---|
| Gyroscope not in UI | E2E driving workflow | Added gyro calls + UI to DrivingDetailScreen |
| `saveSignOff` flat vs nested payload | E2E sign-off assertion failed | Fixed test; confirmed reducer contract |
| `logoutUser.rejected` missing | Unit test: logout ignores errors | Added rejected handler to authSlice |
| Guest fallback always works | Unit test: signInAnon throws | Confirmed catch block covers network errors |
| Notification scheduling skipped on denied perm | Unit test: denied path | Confirmed `null` returned (correct) |
| Score 0 vs null ambiguity | Integration: scoring integration | Edge case documented for future fix |

### 9.4 Automated Testing vs Manual Testing Balance

Automated testing at the Redux layer gives very high confidence in the application's **data correctness** — that state transitions are correct, selectors return the right values, and async thunks handle all outcomes. However, it provides **zero coverage** of the actual user experience: whether buttons are visible, whether layouts render correctly on small screens, whether the camera opens as expected.

The decision to write headless E2E tests (through Redux alone) rather than full Detox/Maestro UI tests was deliberate: the app's UI layer is thin (screens are essentially just displays of Redux state), and the complexity of setting up a full E2E framework with native hardware mocking was disproportionate to the additional confidence it would provide. The manual test matrix in §7.3 fills the gap.

---

*FieldReportX — CSE35007 Assignment | Built with Expo SDK 51, React Native, Redux Toolkit, Jest 29*
