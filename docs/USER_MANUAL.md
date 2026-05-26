# FieldReportX — User Manual

**CSE35007 Mobile Application Development**  
**Version 1.0 | May 2026**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [How to Use the Application](#3-how-to-use-the-application)
4. [Report Types Reference](#4-report-types-reference)
5. [Device Sensors & Features](#5-device-sensors--features)
6. [Common Issues & Troubleshooting](#6-common-issues--troubleshooting)

---

## 1. Introduction

FieldReportX is a professional field reporting application designed for inspectors, investigators, and field workers. It supports seven distinct report types with evidence capture, GPS tracking, sensor-based scoring, digital sign-off, and optional cloud synchronisation via Firebase. The app works fully offline and syncs when a connection is available.

**Key capabilities:**
- 7 report templates (Rental Inspection, Trades, Legal/Forensic, Driving, Rehabilitation, General, Service Delivery)
- Photo, audio, and document evidence capture
- Live GPS route tracking with distance and speed
- Accelerometer + gyroscope-based driving smoothness scoring
- Digital sign-off with user and supervisor signatures
- PDF report generation and sharing
- Local-first with cloud backup (Firebase optional)

---

## 2. Getting Started

### 2.1 System Requirements

| Platform | Minimum |
|---|---|
| iOS | 16.0 or later |
| Android | API 26 (Android 8.0) or later |
| Expo Go | SDK 51 |

### 2.2 Installation

**Option A — Expo Go (Development)**

1. Install Expo Go from the App Store (iOS) or Google Play (Android).
2. Open a terminal and navigate to the project folder.
3. Run `npm install` to install dependencies.
4. Run `npx expo start` to start the development server.
5. Scan the QR code shown in the terminal with your phone camera (iOS) or the Expo Go app (Android).

**Option B — Development Build**

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Build for your platform: `eas build --platform ios` or `eas build --platform android`
4. Download and install the generated build file.

### 2.3 First Launch

When FieldReportX opens for the first time:

1. You will see the **Login screen** with two tabs: **Email Login** and **Guest / Local**.
2. **Guest / Local mode** is recommended for first-time users and works entirely offline:
   - Tap the "Guest / Local" tab.
   - Optionally enter your name.
   - Tap **Continue as Guest**.
3. **Email Login** requires a Firebase-configured deployment and a registered account:
   - Enter your email and password.
   - Tap **Sign In**.
   - If you don't have an account, tap **"Don't have an account? Create one"** to register.

> **Note:** Guest accounts store all data locally on the device. Your reports are preserved across app restarts but do not sync to the cloud.

### 2.4 Permission Requests

On first use, the app will request several permissions. Grant all of them for full functionality:

| Permission | Used For |
|---|---|
| Camera | Capturing inspection and evidence photos |
| Photo Library | Attaching screenshots and saved images |
| Microphone | Recording audio witness statements |
| Location | GPS route tracking and photo geotagging |
| Motion & Fitness (iOS) | Accelerometer/gyroscope driving assessment |
| Notifications | Report reminders and follow-up alerts |

---

## 3. How to Use the Application

### 3.1 Navigation Overview

The app has three main tabs at the bottom:

| Tab | Icon | Purpose |
|---|---|---|
| **Reports** | List icon | View, search, and manage all reports |
| **Templates** | Grid icon | Browse and create new reports from templates |
| **Account** | User icon | Profile, stats, settings, and sign out |

### 3.2 Creating a New Report

1. Tap the **Templates** tab.
2. Browse the seven available report templates. Each card shows supported features (GPS, audio, sensors, scoring).
3. Tap **Use Template** on the desired report type.
4. Fill in the required fields:
   - **Title** — a descriptive name for the report.
   - **Type-specific fields** — for example, a Driving report asks for Driver Name and Vehicle Registration; a Legal report asks for Case Number and Agency Name.
5. Tap **Create Report**. The report is saved immediately and a reminder notification is scheduled.

### 3.3 Filling a Report

After creating a report, you are taken to its detail screen. All reports share a common structure:

**Section tabs** — swipe horizontally to switch between sections (e.g. "Living Areas", "Kitchen", "Evidence Scene").

**Within each section you can:**
- ☑ Tick **checklist items** (tap to toggle green/unchecked).
- ✏️ Write **notes** in the free-text field.
- 📷 Add **photos** using the Camera button (takes a new photo) or Library button (picks from gallery).
- ✅ Tap **Mark Section Complete** when all items for that section are done.

**Progress bar** — displayed in the header, shows overall completion percentage.

### 3.4 Generating a PDF

1. Open any completed or in-progress report.
2. Tap **Generate PDF**.
3. The app creates a formatted PDF with all sections, notes, photos summary, and metadata.
4. A share sheet appears — you can save to Files, email it, or share via any app.

### 3.5 Digital Sign-Off

1. Open a report and tap **Digital Sign-Off**.
2. Enter your **signature** (your name typed in the field).
3. Optionally enter a **supervisor signature**.
4. Tap **Sign & Approve Report**.
5. The sign-off is saved with a timestamp. Once signed, the report is locked.

### 3.6 Comparing Reports

1. From the Reports tab, tap the **⇄ Compare** button in the header.
2. Select the **first report** from the list.
3. Select the **second report** to compare against.
4. A side-by-side comparison shows: sections, checklist progress, photo counts, notes differences, and overall status.

### 3.7 Account Screen

The **Account** tab shows:
- Your profile (name, email, account type).
- Report statistics (total, completed, in progress).
- System info (cloud sync status, storage type, auth mode).
- **Test Notification** — sends a test notification in 5 seconds.
- **Clear All Notifications** — cancels all pending reminders.
- **Sign Out** — logs you out (your local reports are preserved).

---

## 4. Report Types Reference

### 4.1 Rental Inspection
Used by property managers to document the condition of a rental property at entry or exit.

**Sections:** Living Areas, Kitchen, Bathrooms, Bedrooms, Outdoor & Garage  
**Features:** Photo evidence per section, condition notes, damage assessment, digital sign-off, PDF export  
**How to use:** Work through each room systematically. Photograph any damage. Mark each room complete before generating the final PDF.

### 4.2 Trades & Maintenance
For tradespeople to document jobs, materials, and client sign-off.

**Sections:** Pre-Work Assessment, Work Performed, Materials Used, Safety Compliance, Final Inspection  
**Features:** Job number, client name, trade type fields; photo evidence; scoring; PDF export  
**How to use:** Fill in job details on creation. Document pre-work conditions with photos, record materials used, and complete the safety compliance section before requesting client sign-off.

### 4.3 Legal & Forensic
For investigators to maintain chain-of-custody evidence records.

**Sections:** Scene Overview, Physical Evidence, Witness Statements, Digital Evidence, Documentation  
**Features:** Chain-of-custody box (report ID + checksum), audio recording for witness statements, photo + screenshot + document attachment, GPS location tagging  
**How to use:** Begin recording immediately on scene. Use the **Audio Evidence Recorder** panel to capture witness statements. Attach physical evidence photos and supporting documents. The checksum field provides tamper-evidence for legal proceedings.

### 4.4 Driving Assessment
For driving instructors or fleet managers to assess driver performance.

**Sections:** Pre-Drive Check, Urban Driving, Highway Driving, Parking & Manoeuvring, Post-Drive Review  
**Features:** Live accelerometer + gyroscope readings, smoothness score (0–100), section-level scoring, photo evidence  
**How to use:** Start a driving session and tap **Start Recording** to begin capturing accelerometer data. The X/Y/Z bars update in real time. Tap **Stop & Score** to receive a smoothness score. A score ≥70 is Excellent, 40–69 Acceptable, <40 Needs Improvement. Repeat for each section of the route.

### 4.5 Rehabilitation Assessment
For allied health professionals tracking patient progress over multiple sessions.

**Sections:** Initial Assessment, Mobility Evaluation, Strength Testing, Pain Assessment, Progress Notes  
**Features:** Section scoring (0–100), condition notes, progress tracking, PDF export  
**How to use:** Create a new report for each assessment session. Score each domain and add detailed clinical notes. Generate a PDF to include in patient records.

### 4.6 General Inspection
A flexible template for any site or facility inspection.

**Sections:** Site Overview, Safety Hazards, Equipment Check, Environmental Conditions, Recommendations  
**Features:** Checklist, notes, photos, scoring, sign-off, PDF  
**How to use:** Adapt to any inspection context. Add photos of hazards or equipment. Score each section and include recommendations in the notes.

### 4.7 Service Delivery
For field service workers to track route, delivery stops, and service completion.

**Sections:** Route Planning, Stop 1–3 (configurable), Completion Summary  
**Features:** Live GPS route tracking (distance in km, current and average speed), photo evidence per stop, delivery notes  
**How to use:** Tap **Start GPS Tracking** at the beginning of your route. The app records your position every 5 seconds. At each stop, complete the checklist and add a photo. Tap **Stop Tracking** when the route ends — a summary shows total distance and average speed.

---

## 5. Device Sensors & Features

### 5.1 Camera & Photo Library
Available on all report types. Tap **Capture Photo** to use the camera directly, or **From Library** to select an existing image. Photos are stored locally and included in PDF exports.

### 5.2 GPS Tracking (Service Delivery)
Requires Location permission. Tap **Start GPS Tracking** to begin. The app records coordinates, speed, and timestamps every 5–10 seconds. The route preview shows your last three coordinates. Total distance is calculated using the Haversine formula.

### 5.3 Accelerometer (Driving Assessment)
No permission required. Tap **Start Recording** in the sensor panel. X, Y, Z values update 10 times per second. The smoothness score is computed from the variance of the movement magnitude — lower variance = higher score.

### 5.4 Gyroscope (Driving Assessment)
Captured alongside the accelerometer. Shows real-time rotation rates (rad/s) and computes total steering angle delta (degrees) after stopping.

### 5.5 Microphone (Legal & Forensic)
Requires Microphone permission. Tap **Start Recording** in the Audio Evidence Recorder panel. Audio is saved in HIGH_QUALITY format. Tap the **Play** button next to any saved note to replay it.

### 5.6 Notifications
The app schedules a reminder notification when a new report is created (default: 1 hour later). You can test this from the Account screen. All notifications can be cleared at any time.

---

## 6. Common Issues & Troubleshooting

### 6.1 "Permission Denied" for Camera/Location/Microphone

**Cause:** The system permission was denied on first request, or was revoked in Settings.

**Fix:**
- iOS: Settings → Privacy & Security → select the permission (Camera, Location, Microphone) → find FieldReportX → allow.
- Android: Settings → Apps → FieldReportX → Permissions → enable the required permission.

### 6.2 "Firebase not configured — use Guest login"

**Cause:** The Firebase credentials in `app.json` (`extra` section) are empty or missing.

**Fix:** This is expected in the development build without a Firebase project. Use **Guest / Local** mode. To enable Firebase: add your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) and populate `app.json` extra fields with your project credentials.

### 6.3 GPS Not Updating / Tracking Stops

**Cause:** Location permission is "While Using" rather than "Always", or the device entered low-power mode.

**Fix:** Ensure the app is in the foreground during GPS tracking. Keep the screen active. On iOS, check Location permission is set to "While Using the App". On Android, disable battery optimisation for the app.

### 6.4 Reports Not Showing in the List

**Cause:** Redux state may not have been persisted if the app was force-quit during a write.

**Fix:** Pull down to refresh the list. If the report still doesn't appear, check the filter chips at the top — make sure **All** is selected. The report may be filtered by type.

### 6.5 PDF Generation Takes a Long Time

**Cause:** Reports with many high-resolution photos take longer to process.

**Fix:** Reduce photo quality in the image picker options (the app uses 0.7–0.85 quality by default). For very large reports, generate the PDF on Wi-Fi to avoid timeouts if sharing to cloud.

### 6.6 Notifications Not Appearing

**Cause:** Notification permission was not granted, or the device is in Do Not Disturb mode.

**Fix:** Go to Account → Test Notification to verify permissions. If no notification appears after 5 seconds, go to device Settings → Notifications → FieldReportX and enable Allow Notifications.

### 6.7 Audio Playback Error

**Cause:** The audio file URI was stored but the file was deleted (e.g. after an app reinstall or cache clear).

**Fix:** Re-record the audio note. Audio is stored in the app's cache directory — do not clear app cache if you have unsaved audio notes.

### 6.8 Sign-In Failed

**Cause:** Incorrect email/password, or Firebase is not configured.

**Fix:** Double-check your credentials. If you've forgotten your password, reset it via Firebase Console. If Firebase is not set up in this build, use Guest mode.

### 6.9 App Crashes on Launch

**Cause:** Corrupted AsyncStorage persist data.

**Fix:** Clear the app's storage in device Settings → Apps → FieldReportX → Storage → Clear Data. **Warning:** this will delete all locally stored reports. Ensure important reports are exported as PDFs before clearing.

### 6.10 Accelerometer Shows All Zeros

**Cause:** The simulator/emulator does not have accelerometer hardware.

**Fix:** Test sensor features on a physical device. Expo Go on a real iPhone or Android phone will provide live sensor data.

---

*FieldReportX — CSE35007 Assignment | Built with Expo SDK 51, React Native, Redux Toolkit*
