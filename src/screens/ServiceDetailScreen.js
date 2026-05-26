import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Image, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, FileText, CheckCircle, Circle, X, Check, MapPin, Navigation, Gauge } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  selectReportById, selectReportProgress,
  updateSectionNotes, toggleChecklistItem, markSectionComplete,
  addPhotoToSection, removePhotoFromSection, markReportComplete,
  addGpsPoint, clearGpsRoute, TYPE_META,
} from '../store/slices/reportsSlice';
import { lightColors, spacing, radius } from '../theme/tokens';

const ACCENT = '#10B981';

export default function ServiceDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const [activeSection, setActiveSection] = useState(0);

  // GPS tracking state
  const [tracking, setTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const locationSub = useRef(null);
  const lastPosition = useRef(null);

  useEffect(() => {
    return () => {
      if (locationSub.current) locationSub.current.remove();
    };
  }, []);

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const section = report.sections[activeSection];
  const completedCount = report.sections.filter((s) => s.complete).length;
  const gpsRoute = report.gpsRoute || [];

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for GPS tracking.');
      return;
    }
    dispatch(clearGpsRoute(reportId));
    lastPosition.current = null;
    setTotalDistance(0);
    setTracking(true);

    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      (loc) => {
        const point = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed,
          timestamp: new Date().toISOString(),
        };
        dispatch(addGpsPoint({ reportId, point }));
        setCurrentSpeed(loc.coords.speed != null ? Math.max(0, loc.coords.speed * 3.6) : null);

        if (lastPosition.current) {
          const d = haversineDistance(lastPosition.current, point);
          setTotalDistance((prev) => prev + d);
        }
        lastPosition.current = point;
      }
    );
  };

  const stopTracking = () => {
    if (locationSub.current) {
      locationSub.current.remove();
      locationSub.current = null;
    }
    setTracking(false);
    const avgSpeed = gpsRoute.length > 0 && totalDistance > 0
      ? (totalDistance / (gpsRoute.length * 5 / 3600)).toFixed(1)
      : null;
    Alert.alert(
      'Tracking Stopped',
      `Points captured: ${gpsRoute.length}\nDistance: ${(totalDistance / 1000).toFixed(2)} km${avgSpeed ? `\nAvg speed: ${avgSpeed} km/h` : ''}`
    );
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      dispatch(addPhotoToSection({
        reportId, sectionId: section.id,
        photo: { uri: result.assets[0].uri, timestamp: new Date().toISOString() },
      }));
    }
  };

  // Haversine distance in metres
  function haversineDistance(a, b) {
    const R = 6371000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  const avgSpeed =
    gpsRoute.length > 1 && totalDistance > 0
      ? ((totalDistance / 1000) / (gpsRoute.length * 5 / 3600)).toFixed(1)
      : null;

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
        <View style={[styles.gpsPanel, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '40' }]}>
          <View style={styles.gpsPanelHeader}>
            <MapPin size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.gpsPanelTitle, { color: ACCENT }]}>GPS Route Tracker</Text>
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
              <Text style={styles.gpsStatValue}>
                {currentSpeed != null ? `${currentSpeed.toFixed(1)}` : '—'}
              </Text>
              <Text style={styles.gpsStatLabel}>km/h now</Text>
            </View>
            {avgSpeed && (
              <View style={styles.gpsStat}>
                <Text style={styles.gpsStatValue}>{avgSpeed}</Text>
                <Text style={styles.gpsStatLabel}>km/h avg</Text>
              </View>
            )}
          </View>

          {gpsRoute.length > 0 && (
            <View style={styles.routePreview}>
              <Text style={styles.routePreviewTitle}>Recent Points:</Text>
              {gpsRoute.slice(-3).map((pt, i) => (
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
                <Navigation size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.gpsBtnText}>Start GPS Tracking</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: '#ef4444' }]} onPress={stopTracking}>
                <MapPin size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.gpsBtnText}>Stop Tracking</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {report.sections.map((s, idx) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setActiveSection(idx)}
              style={[styles.tab, {
                backgroundColor: activeSection === idx ? ACCENT : lightColors.surface,
                borderColor: activeSection === idx ? ACCENT : lightColors.border,
              }]}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, { color: activeSection === idx ? '#fff' : lightColors.textPrimary }]}>
                  {s.name.split(' ')[0]}
                </Text>
                {s.complete && <Check size={13} color={activeSection === idx ? '#fff' : '#10b981'} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section card */}
        <View style={[styles.sectionCard, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.sectionTitle}>{section.name}</Text>

          {Object.entries(section.checklist || {}).map(([key, checked]) => (
            <TouchableOpacity
              key={key}
              onPress={() => dispatch(toggleChecklistItem({ reportId, sectionId: section.id, key }))}
              style={[styles.checkItem, { backgroundColor: checked ? '#d1fae5' : lightColors.background }]}
            >
              {checked ? <CheckCircle size={20} color="#10b981" strokeWidth={2.5} /> : <Circle size={20} color={lightColors.textSecondary} strokeWidth={2} />}
              <Text style={[styles.checkLabel, { color: checked ? '#065f46' : lightColors.textPrimary }]}>{key}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.notesLabel}>Delivery Notes</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) => dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))}
            placeholder="Notes for this stop or route segment..."
            style={styles.notesInput}
            placeholderTextColor={lightColors.textSecondary}
            multiline
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
                  <TouchableOpacity style={styles.removePhoto} onPress={() => dispatch(removePhotoFromSection({ reportId, sectionId: section.id, photoIndex: index }))}>
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

          {!section.complete && (
            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: ACCENT }]}
              onPress={() => dispatch(markSectionComplete({ reportId, sectionId: section.id }))}
            >
              <Check size={16} color="#fff" strokeWidth={3} />
              <Text style={styles.completeBtnText}>Mark Stop Complete</Text>
            </TouchableOpacity>
          )}
          {section.complete && (
            <View style={styles.completedBadge}>
              <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />
              <Text style={styles.completedText}>Stop Completed</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={() => navigation.navigate('GenericReportPdf', { reportId })}>
          <FileText size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>Generate PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6366F1' }]} onPress={() => navigation.navigate('SignOff', { reportId, reportType: 'generic' })}>
          <Check size={18} color="#fff" strokeWidth={2.5} />
          <Text style={styles.actionBtnText}>Digital Sign-Off</Text>
        </TouchableOpacity>

        {completedCount === report.sections.length && report.status !== 'completed' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => { dispatch(markReportComplete({ reportId })); Alert.alert('Done', 'Service delivery report marked complete!'); }}>
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

  gpsPanel: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  gpsPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  gpsPanelTitle: { fontSize: 14, fontWeight: '600' },
  gpsStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  gpsStat: { flex: 1, backgroundColor: lightColors.background, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  gpsStatValue: { fontSize: 18, fontWeight: '700', color: lightColors.textPrimary },
  gpsStatLabel: { fontSize: 10, color: lightColors.textSecondary, marginTop: 2 },
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
  sectionTitle: { fontSize: 17, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.md },
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
