import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Image, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Camera, FileText, CheckCircle, Circle, X, Check,
  MapPin, Navigation, Gauge, BarChart2, Bell, Clock,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { launchCamera } from '../services/cameraService';
import SpeechToTextButton from '../components/SpeechToTextButton';
import LocationMap from '../components/LocationMap';
import { sendImmediateNotification } from '../services/notificationService';
import {
  selectReportById, selectReportProgress,
  updateSectionNotes, toggleChecklistItem, markSectionComplete,
  addPhotoToSection, removePhotoFromSection, markReportComplete,
  addGpsPoint, clearGpsRoute, updateSectionMetadata,
} from '../store/slices/reportsSlice';
import { lightColors, spacing, radius } from '../theme/tokens';

const ACCENT = '#10B981';
const ARRIVAL_RADIUS_M = 150;

function haversineDistance(a, b) {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function isOverdue(scheduledTime) {
  if (!scheduledTime) return false;
  const [h, m] = scheduledTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(h, m, 0, 0);
  return now > scheduled;
}

export default function ServiceDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const [activeSection, setActiveSection] = useState(0);

  // GPS tracking state
  const [tracking, setTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(null);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const locationSub = useRef(null);
  const lastPosition = useRef(null);
  const speedReadings = useRef([]);

  // Notification deduplication: sets of section IDs already notified
  const arrivalNotifiedRef = useRef(new Set());
  const overdueNotifiedRef = useRef(new Set());

  // Scheduled time editor — local state (HH:MM per section)
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleInput, setScheduleInput] = useState('');

  useEffect(() => {
    return () => { if (locationSub.current) locationSub.current.remove(); };
  }, []);

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const section = report.sections[activeSection];
  const completedCount = report.sections.filter((s) => s.complete).length;
  const gpsRoute = report.gpsRoute || [];

  const avgSpeed =
    speedReadings.current.length > 0
      ? (speedReadings.current.reduce((a, b) => a + b, 0) / speedReadings.current.length).toFixed(1)
      : null;

  // ─── GPS proximity & schedule notification check ─────────────────────────────
  const checkNotifications = (point) => {
    report.sections.forEach((sec) => {
      const stopLoc = sec.metadata?.stopLocation;
      const scheduled = sec.metadata?.scheduledArrival;

      // Proximity arrival notification
      if (stopLoc && !sec.complete && !arrivalNotifiedRef.current.has(sec.id)) {
        const dist = haversineDistance(point, stopLoc);
        if (dist <= ARRIVAL_RADIUS_M) {
          arrivalNotifiedRef.current.add(sec.id);
          sendImmediateNotification(
            'Approaching Stop',
            `${sec.name} is ${Math.round(dist)} m away — get ready to deliver.`
          );
        }
      }

      // Behind-schedule notification (checked every GPS update)
      if (scheduled && !sec.complete && !overdueNotifiedRef.current.has(sec.id)) {
        if (isOverdue(scheduled)) {
          overdueNotifiedRef.current.add(sec.id);
          sendImmediateNotification(
            'Behind Schedule ⚠️',
            `${sec.name} was due at ${scheduled} and is not yet completed.`
          );
        }
      }
    });
  };

  // ─── GPS start/stop ───────────────────────────────────────────────────────────
  const startTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for GPS tracking.');
        return;
      }
      dispatch(clearGpsRoute(reportId));
      lastPosition.current = null;
      speedReadings.current = [];
      setTotalDistance(0);
      setMaxSpeed(0);
      setTracking(true);

      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          const speedMs = loc.coords.speed != null ? Math.max(0, loc.coords.speed) : null;
          const speedKmh = speedMs != null ? parseFloat((speedMs * 3.6).toFixed(1)) : null;

          const point = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: speedMs,
            timestamp: new Date().toISOString(),
          };
          dispatch(addGpsPoint({ reportId, point }));

          if (speedKmh !== null) {
            setCurrentSpeed(speedKmh);
            speedReadings.current.push(speedKmh);
            setMaxSpeed((prev) => Math.max(prev, speedKmh));
          }

          if (lastPosition.current) {
            setTotalDistance((prev) => prev + haversineDistance(lastPosition.current, point));
          }
          lastPosition.current = point;

          // Check proximity & schedule notifications
          checkNotifications(point);
        }
      );
    } catch (err) {
      setTracking(false);
      Alert.alert('GPS Error', err.message || 'Failed to start location tracking.');
    }
  };

  const stopTracking = () => {
    if (locationSub.current) { locationSub.current.remove(); locationSub.current = null; }
    setTracking(false);
    Alert.alert(
      'Tracking Stopped',
      `Points: ${gpsRoute.length}\nDistance: ${(totalDistance / 1000).toFixed(2)} km` +
      (avgSpeed ? `\nAvg speed: ${avgSpeed} km/h` : '') +
      `\nMax speed: ${maxSpeed.toFixed(1)} km/h`
    );
  };

  // ─── Stop location pin ────────────────────────────────────────────────────────
  const handleSetStopLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access needed to pin this stop.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const stopLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      dispatch(updateSectionMetadata({ reportId, sectionId: section.id, metadata: { stopLocation } }));
      Alert.alert('Stop Pinned', `${section.name} location saved.\n${stopLocation.latitude.toFixed(5)}°, ${stopLocation.longitude.toFixed(5)}°`);
    } catch (err) {
      Alert.alert('GPS Error', err.message || 'Could not get current location.');
    }
  };

  // ─── Scheduled arrival ────────────────────────────────────────────────────────
  const handleSaveSchedule = () => {
    const trimmed = scheduleInput.trim();
    if (trimmed && !/^\d{2}:\d{2}$/.test(trimmed)) {
      Alert.alert('Invalid Format', 'Enter time as HH:MM (e.g. 14:30)');
      return;
    }
    dispatch(updateSectionMetadata({
      reportId,
      sectionId: section.id,
      metadata: { scheduledArrival: trimmed || null },
    }));
    setEditingSchedule(false);
    setScheduleInput('');
  };

  const handleAddPhoto = async () => {
    const asset = await launchCamera({ quality: 0.7 });
    if (asset) {
      dispatch(addPhotoToSection({
        reportId, sectionId: section.id,
        photo: { uri: asset.uri, timestamp: new Date().toISOString() },
      }));
    }
  };

  // Stop markers for map: any section with a saved stopLocation
  const stopMarkers = report.sections
    .filter((s) => s.metadata?.stopLocation)
    .map((s) => ({
      latitude: s.metadata.stopLocation.latitude,
      longitude: s.metadata.stopLocation.longitude,
      title: s.name,
      description: s.metadata?.scheduledArrival ? `Due: ${s.metadata.scheduledArrival}` : undefined,
      pinColor: s.complete ? '#10b981' : '#f59e0b',
    }));

  const stopLocation = section.metadata?.stopLocation;
  const scheduledArrival = section.metadata?.scheduledArrival;
  const overdue = scheduledArrival && isOverdue(scheduledArrival) && !section.complete;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[styles.header, { backgroundColor: lightColors.surface }]}>
          <View style={styles.headerTop}>
            <Navigation size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.typeText, { color: ACCENT }]}>Service Delivery Report</Text>
            <View style={[styles.statusBadge, { backgroundColor: ACCENT + '20' }]}>
              <Text style={[styles.statusText, { color: ACCENT }]}>{report.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.title}>{report.title}</Text>
          {report.metadata?.driverName && <Text style={styles.meta}>Driver: {report.metadata.driverName}</Text>}
          {report.metadata?.vehicleId && <Text style={styles.meta}>Vehicle: {report.metadata.vehicleId}</Text>}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{completedCount}/{report.sections.length} sections • {progress}%</Text>
        </View>

        {/* GPS Tracking Panel */}
        <View style={[styles.panel, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '40' }]}>
          <View style={styles.panelHeader}>
            <Navigation size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.panelTitle, { color: ACCENT }]}>GPS Route & Speed Tracker</Text>
            {tracking && (
              <View style={[styles.liveBadge, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            )}
          </View>

          <View style={styles.gpsStats}>
            <View style={styles.gpsStat}>
              <Text style={styles.gpsStatValue}>{gpsRoute.length}</Text>
              <Text style={styles.gpsStatLabel}>Points</Text>
            </View>
            <View style={styles.gpsStat}>
              <Text style={styles.gpsStatValue}>{(totalDistance / 1000).toFixed(2)}</Text>
              <Text style={styles.gpsStatLabel}>km</Text>
            </View>
            <View style={styles.gpsStat}>
              <Text style={styles.gpsStatValue}>{currentSpeed != null ? currentSpeed.toFixed(1) : '—'}</Text>
              <Text style={styles.gpsStatLabel}>km/h now</Text>
            </View>
            <View style={styles.gpsStat}>
              <Text style={styles.gpsStatValue}>{avgSpeed ?? '—'}</Text>
              <Text style={styles.gpsStatLabel}>km/h avg</Text>
            </View>
            <View style={styles.gpsStat}>
              <Text style={styles.gpsStatValue}>{maxSpeed.toFixed(1)}</Text>
              <Text style={styles.gpsStatLabel}>km/h max</Text>
            </View>
          </View>

          {gpsRoute.length > 0 && (
            <View style={styles.routePreview}>
              <Text style={styles.routePreviewTitle}>Recent GPS Points</Text>
              {gpsRoute.slice(-2).map((pt, i) => (
                <Text key={i} style={styles.routePoint}>
                  {pt.latitude.toFixed(4)}°, {pt.longitude.toFixed(4)}°
                  {pt.speed != null ? ` • ${(pt.speed * 3.6).toFixed(1)} km/h` : ''}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.gpsButtons}>
            {!tracking ? (
              <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: ACCENT }]} onPress={startTracking}>
                <Navigation size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.gpsBtnText}>Start Tracking</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: '#ef4444' }]} onPress={stopTracking}>
                <MapPin size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.gpsBtnText}>Stop Tracking</Text>
              </TouchableOpacity>
            )}
          </View>

          {(gpsRoute.length > 1 || stopMarkers.length > 0) && (
            <LocationMap
              location={report.gpsLocation}
              routePoints={gpsRoute.length > 1 ? gpsRoute : undefined}
              markers={stopMarkers.length > 0 ? stopMarkers : undefined}
              height={240}
              style={{ marginTop: spacing.sm, borderRadius: 8 }}
            />
          )}
        </View>

        {/* Section tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {report.sections.map((s, idx) => {
            const late = s.metadata?.scheduledArrival && isOverdue(s.metadata.scheduledArrival) && !s.complete;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setActiveSection(idx)}
                style={[styles.tab, {
                  backgroundColor: activeSection === idx ? ACCENT : lightColors.surface,
                  borderColor: late ? '#ef4444' : activeSection === idx ? ACCENT : lightColors.border,
                  borderWidth: late ? 2 : 1,
                }]}
              >
                <View style={styles.tabContent}>
                  <Text style={[styles.tabText, { color: activeSection === idx ? '#fff' : lightColors.textPrimary }]}>
                    {s.name.split(' ')[0]}
                  </Text>
                  {s.complete && <Check size={13} color={activeSection === idx ? '#fff' : '#10b981'} strokeWidth={3} />}
                  {late && !s.complete && <Bell size={11} color={activeSection === idx ? '#fff' : '#ef4444'} strokeWidth={2.5} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section card */}
        <View style={[styles.sectionCard, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.sectionTitle}>{section.name}</Text>

          {/* Schedule & Stop Location Row */}
          <View style={[styles.stopMeta, { borderColor: overdue ? '#ef4444' : lightColors.border }]}>
            {/* Scheduled arrival */}
            <View style={styles.stopMetaItem}>
              <Clock size={14} color={overdue ? '#ef4444' : lightColors.textSecondary} strokeWidth={2} />
              {editingSchedule ? (
                <View style={styles.scheduleEdit}>
                  <TextInput
                    value={scheduleInput}
                    onChangeText={setScheduleInput}
                    placeholder="HH:MM"
                    style={styles.scheduleInput}
                    placeholderTextColor={lightColors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <TouchableOpacity onPress={handleSaveSchedule} style={styles.scheduleConfirm}>
                    <Check size={14} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingSchedule(false)} style={styles.scheduleCancel}>
                    <X size={14} color={lightColors.textSecondary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setScheduleInput(scheduledArrival || ''); setEditingSchedule(true); }}>
                  <Text style={[styles.scheduleText, { color: overdue ? '#ef4444' : lightColors.textPrimary }]}>
                    {scheduledArrival ? `Due: ${scheduledArrival}${overdue ? ' ⚠ Overdue' : ''}` : 'Set arrival time'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Stop location pin */}
            <View style={styles.stopMetaItem}>
              <MapPin size={14} color={stopLocation ? ACCENT : lightColors.textSecondary} strokeWidth={2} />
              <TouchableOpacity onPress={handleSetStopLocation}>
                <Text style={[styles.scheduleText, { color: stopLocation ? ACCENT : lightColors.textSecondary }]}>
                  {stopLocation
                    ? `${stopLocation.latitude.toFixed(4)}°, ${stopLocation.longitude.toFixed(4)}°`
                    : 'Pin stop location'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Checklist */}
          {Object.entries(section.checklist || {}).map(([key, checked]) => (
            <TouchableOpacity
              key={key}
              onPress={() => dispatch(toggleChecklistItem({ reportId, sectionId: section.id, key }))}
              style={[styles.checkItem, { backgroundColor: checked ? '#d1fae5' : lightColors.background }]}
            >
              {checked
                ? <CheckCircle size={20} color="#10b981" strokeWidth={2.5} />
                : <Circle size={20} color={lightColors.textSecondary} strokeWidth={2} />}
              <Text style={[styles.checkLabel, { color: checked ? '#065f46' : lightColors.textPrimary }]}>{key}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.notesLabel}>Delivery Notes</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) =>
              dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))
            }
            placeholder="Notes for this stop or route segment..."
            style={styles.notesInput}
            placeholderTextColor={lightColors.textSecondary}
            multiline
          />
          <SpeechToTextButton
            accentColor={ACCENT}
            style={{ marginTop: spacing.sm }}
            onTranscript={(text) => {
              const current = section.conditionNotes || '';
              dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: current ? `${current}\n${text}` : text }));
            }}
          />

          <Text style={styles.notesLabel}>Evidence Photos ({section.photos?.length || 0})</Text>
          {section.photos?.length > 0 && (
            <FlatList
              data={section.photos}
              horizontal
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.photoWrap}>
                  <Image source={{ uri: item.uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => dispatch(removePhotoFromSection({ reportId, sectionId: section.id, photoIndex: index }))}
                  >
                    <X size={13} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              )}
              style={{ marginBottom: spacing.sm }}
            />
          )}

          <TouchableOpacity style={[styles.photoBtn, { backgroundColor: ACCENT }]} onPress={handleAddPhoto}>
            <Camera size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.photoBtnText}>Capture Photo</Text>
          </TouchableOpacity>

          {!section.complete ? (
            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: ACCENT }]}
              onPress={() => dispatch(markSectionComplete({ reportId, sectionId: section.id }))}
            >
              <Check size={16} color="#fff" strokeWidth={3} />
              <Text style={styles.completeBtnText}>Mark Stop Complete</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}>
              <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />
              <Text style={styles.completedText}>Stop Completed</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#374151' }]}
          onPress={() => navigation.navigate('ReportCharts', { reportId, reportType: 'generic' })}
        >
          <BarChart2 size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>View Charts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: ACCENT }]}
          onPress={() => navigation.navigate('GenericReportPdf', { reportId })}
        >
          <FileText size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>Generate PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
          onPress={() => navigation.navigate('SignOff', { reportId, reportType: 'generic' })}
        >
          <Check size={18} color="#fff" strokeWidth={2.5} />
          <Text style={styles.actionBtnText}>Digital Sign-Off</Text>
        </TouchableOpacity>

        {completedCount === report.sections.length && report.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
            onPress={() => { dispatch(markReportComplete({ reportId })); Alert.alert('Done', 'Service delivery report marked complete!'); }}
          >
            <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
            <Text style={styles.actionBtnText}>Mark Report Complete</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  header: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  typeText: { fontSize: 12, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', color: lightColors.textPrimary, marginBottom: 2 },
  meta: { fontSize: 12, color: lightColors.textSecondary },
  progressBar: { height: 6, backgroundColor: lightColors.border, borderRadius: 3, marginTop: spacing.sm, marginBottom: spacing.xs },
  progressFill: { height: 6, backgroundColor: ACCENT, borderRadius: 3 },
  progressText: { fontSize: 11, color: lightColors.textSecondary },

  panel: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  panelTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  liveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  gpsStats: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' },
  gpsStat: { flex: 1, minWidth: 56, backgroundColor: lightColors.background, borderRadius: radius.sm, padding: spacing.xs, alignItems: 'center' },
  gpsStatValue: { fontSize: 16, fontWeight: '700', color: lightColors.textPrimary },
  gpsStatLabel: { fontSize: 9, color: lightColors.textSecondary, marginTop: 2 },

  routePreview: { backgroundColor: lightColors.background, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  routePreviewTitle: { fontSize: 11, fontWeight: '600', color: lightColors.textSecondary, marginBottom: 4 },
  routePoint: { fontSize: 11, color: lightColors.textPrimary, marginBottom: 2 },

  gpsButtons: { flexDirection: 'row' },
  gpsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md },
  gpsBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  tabs: { marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, marginRight: spacing.sm, borderWidth: 1 },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tabText: { fontWeight: '600', fontSize: 12 },

  sectionCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.sm },

  stopMeta: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, gap: spacing.sm },
  stopMetaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scheduleEdit: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  scheduleInput: {
    borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    fontSize: 13, color: lightColors.textPrimary, width: 70,
  },
  scheduleConfirm: { backgroundColor: ACCENT, borderRadius: 6, padding: 5 },
  scheduleCancel: { padding: 5 },
  scheduleText: { fontSize: 13, fontWeight: '500' },

  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, borderRadius: radius.sm, marginBottom: spacing.xs, minHeight: 44 },
  checkLabel: { flex: 1, fontSize: 14 },

  notesLabel: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  notesInput: { borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 13, color: lightColors.textPrimary, minHeight: 80, textAlignVertical: 'top' },

  photoWrap: { position: 'relative', marginRight: spacing.sm },
  photo: { width: 110, height: 110, borderRadius: radius.md },
  removePhoto: { position: 'absolute', top: -8, right: -8, backgroundColor: lightColors.error, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, marginTop: spacing.sm },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  completeBtnText: { color: '#fff', fontWeight: '600' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, justifyContent: 'center' },
  completedText: { color: '#10b981', fontWeight: '600', fontSize: 14 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
