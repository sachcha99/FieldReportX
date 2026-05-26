import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Image, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, FileText, CheckCircle, Circle, X, Check, Activity, Gauge, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  selectReportById, selectReportProgress, selectOverallScore,
  updateSectionNotes, toggleChecklistItem, markSectionComplete,
  addPhotoToSection, removePhotoFromSection, markReportComplete,
  setSectionScore, saveSensorData, TYPE_META,
} from '../store/slices/reportsSlice';
import { startAccelerometer, stopAccelerometer, computeSmoothnessScore, startGyroscope, stopGyroscope, computeAngleDelta } from '../services/sensorService';
import { lightColors, spacing, radius } from '../theme/tokens';

const ACCENT = '#8B5CF6';

export default function DrivingDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const overallScore = useSelector(selectOverallScore(reportId));
  const [activeSection, setActiveSection] = useState(0);

  // Sensor state
  const [recording, setRecording] = useState(false);
  const [currentAccel, setCurrentAccel] = useState({ x: 0, y: 0, z: 0 });
  const [currentGyro, setCurrentGyro] = useState({ x: 0, y: 0, z: 0 });
  const [capturedScore, setCapturedScore] = useState(null);
  const [capturedAngleDelta, setCapturedAngleDelta] = useState(null);
  const accelSamples = useRef([]);
  const gyroSamples = useRef([]);
  const sensorStartTime = useRef(null);

  useEffect(() => {
    return () => { stopAccelerometer(); stopGyroscope(); };
  }, []);

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const section = report.sections[activeSection];
  const completedCount = report.sections.filter((s) => s.complete).length;

  const handleStartSensor = () => {
    accelSamples.current = [];
    gyroSamples.current = [];
    sensorStartTime.current = Date.now();
    setRecording(true);
    startAccelerometer((data) => {
      accelSamples.current.push(data);
      setCurrentAccel(data);
    }, 100);
    startGyroscope((data) => {
      gyroSamples.current.push(data);
      setCurrentGyro(data);
    }, 100);
  };

  const handleStopSensor = () => {
    stopAccelerometer();
    stopGyroscope();
    setRecording(false);
    const score = computeSmoothnessScore(accelSamples.current);
    const angleDelta = computeAngleDelta(gyroSamples.current, 'z', 100);
    setCapturedScore(score);
    setCapturedAngleDelta(angleDelta);
    const duration = ((Date.now() - sensorStartTime.current) / 1000).toFixed(1);
    const avgMag = accelSamples.current.length > 0
      ? (accelSamples.current.reduce((sum, s) => sum + Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2), 0) / accelSamples.current.length).toFixed(2)
      : 0;
    const sensorData = {
      samples: accelSamples.current.length,
      durationSeconds: parseFloat(duration),
      averageMagnitude: parseFloat(avgMag),
      smoothnessScore: score,
      steeringAngleDeg: angleDelta,
      capturedAt: new Date().toISOString(),
    };
    dispatch(saveSensorData({ reportId, sensorData }));
    if (score !== null) {
      dispatch(setSectionScore({ reportId, sectionId: section.id, score }));
    }
    Alert.alert('Sensor Capture Done', `Smoothness score: ${score}/100\nSteering rotation: ${angleDelta}°\nDuration: ${duration}s\nSamples: ${accelSamples.current.length}`);
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      dispatch(addPhotoToSection({
        reportId,
        sectionId: section.id,
        photo: { uri: result.assets[0].uri, timestamp: new Date().toISOString() },
      }));
    }
  };

  const magnitude = Math.sqrt(currentAccel.x ** 2 + currentAccel.y ** 2 + currentAccel.z ** 2);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[styles.header, { backgroundColor: lightColors.surface }]}>
          <View style={styles.headerTop}>
            <Activity size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.typeText, { color: ACCENT }]}>Driving Test Report</Text>
            <View style={[styles.statusBadge, { backgroundColor: ACCENT + '20' }]}>
              <Text style={[styles.statusText, { color: ACCENT }]}>{report.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.meta}>Driver: {report.metadata?.driverName || report.createdBy}</Text>
          {report.metadata?.vehicleRego && (
            <Text style={styles.meta}>Vehicle: {report.metadata.vehicleRego}</Text>
          )}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{completedCount}/{report.sections.length} sections • {progress}%</Text>
            {overallScore !== null && (
              <View style={styles.scoreChip}>
                <Gauge size={12} color={ACCENT} strokeWidth={2.5} />
                <Text style={[styles.scoreText, { color: ACCENT }]}>{overallScore}/100</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sensor Panel */}
        <View style={[styles.sensorPanel, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '40' }]}>
          <View style={styles.sensorHeader}>
            <Activity size={18} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.sensorTitle, { color: ACCENT }]}>Accelerometer — Driving Smoothness</Text>
          </View>

          {recording && (
            <View style={styles.sensorReadings}>
              <View style={styles.readingRow}>
                <Text style={styles.axisLabel}>X</Text>
                <View style={[styles.axisBar, { width: `${Math.min(100, Math.abs(currentAccel.x) * 30)}%`, backgroundColor: '#ef4444' }]} />
                <Text style={styles.axisValue}>{currentAccel.x.toFixed(3)}</Text>
              </View>
              <View style={styles.readingRow}>
                <Text style={styles.axisLabel}>Y</Text>
                <View style={[styles.axisBar, { width: `${Math.min(100, Math.abs(currentAccel.y) * 30)}%`, backgroundColor: '#10b981' }]} />
                <Text style={styles.axisValue}>{currentAccel.y.toFixed(3)}</Text>
              </View>
              <View style={styles.readingRow}>
                <Text style={styles.axisLabel}>Z</Text>
                <View style={[styles.axisBar, { width: `${Math.min(100, Math.abs(currentAccel.z) * 30)}%`, backgroundColor: '#3b82f6' }]} />
                <Text style={styles.axisValue}>{currentAccel.z.toFixed(3)}</Text>
              </View>
              <Text style={styles.magnitudeText}>Magnitude: {magnitude.toFixed(3)} g  •  Samples: {accelSamples.current.length}</Text>

              {/* Gyroscope readings */}
              <View style={[styles.gyroRow]}>
                <Text style={styles.gyroLabel}>Gyro (rad/s)</Text>
                <Text style={styles.gyroValue}>X {currentGyro.x.toFixed(3)}</Text>
                <Text style={styles.gyroValue}>Y {currentGyro.y.toFixed(3)}</Text>
                <Text style={styles.gyroValue}>Z {currentGyro.z.toFixed(3)}</Text>
              </View>
            </View>
          )}

          {capturedScore !== null && !recording && (
            <View style={styles.scoreResult}>
              <Text style={styles.scoreResultLabel}>Last Smoothness Score:</Text>
              <Text style={[styles.scoreResultValue, { color: capturedScore >= 70 ? '#10b981' : capturedScore >= 40 ? '#f59e0b' : '#ef4444' }]}>
                {capturedScore}/100 {capturedScore >= 70 ? '— Excellent' : capturedScore >= 40 ? '— Acceptable' : '— Needs Improvement'}
              </Text>
              {capturedAngleDelta !== null && (
                <Text style={styles.scoreResultLabel}>Steering rotation: {capturedAngleDelta}°</Text>
              )}
            </View>
          )}

          <View style={styles.sensorButtons}>
            {!recording ? (
              <TouchableOpacity style={[styles.sensorBtn, { backgroundColor: ACCENT }]} onPress={handleStartSensor}>
                <Activity size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.sensorBtnText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.sensorBtn, { backgroundColor: '#ef4444' }]} onPress={handleStopSensor}>
                <View style={styles.stopIcon} />
                <Text style={styles.sensorBtnText}>Stop & Score</Text>
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

          {/* Score for this section */}
          <View style={styles.scoreSect}>
            <Text style={styles.notesLabel}>Section Score: {section.score !== null ? `${section.score}/100` : 'Not set'}</Text>
            <View style={styles.scoreRow}>
              {[0, 25, 50, 75, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.scoreBtn, { backgroundColor: section.score === val ? ACCENT : lightColors.background }]}
                  onPress={() => dispatch(setSectionScore({ reportId, sectionId: section.id, score: val }))}
                >
                  <Text style={[styles.scoreBtnText, { color: section.score === val ? '#fff' : lightColors.textPrimary }]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.notesLabel}>Assessor Notes</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) => dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))}
            placeholder="Observations and findings..."
            style={styles.notesInput}
            placeholderTextColor={lightColors.textSecondary}
            multiline
          />

          <Text style={styles.notesLabel}>Photos ({section.photos?.length || 0})</Text>
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
              <Text style={styles.completeBtnText}>Mark Section Complete</Text>
            </TouchableOpacity>
          )}
          {section.complete && (
            <View style={styles.completedBadge}>
              <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />
              <Text style={styles.completedText}>Section Complete</Text>
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
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => { dispatch(markReportComplete({ reportId })); Alert.alert('Done', 'Driving report marked complete!'); }}>
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
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: 11, color: lightColors.textSecondary },
  scoreChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  scoreText: { fontSize: 11, fontWeight: '700' },

  sensorPanel: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  sensorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sensorTitle: { fontSize: 14, fontWeight: '600' },
  sensorReadings: { marginBottom: spacing.sm },
  readingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  axisLabel: { width: 16, fontSize: 12, fontWeight: '700', color: lightColors.textPrimary },
  axisBar: { height: 8, borderRadius: 4, minWidth: 4 },
  axisValue: { fontSize: 11, color: lightColors.textSecondary, width: 60 },
  magnitudeText: { fontSize: 11, color: lightColors.textSecondary, marginTop: spacing.xs },
  gyroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: lightColors.border },
  gyroLabel: { fontSize: 10, fontWeight: '600', color: lightColors.textSecondary, flex: 1 },
  gyroValue: { fontSize: 11, color: lightColors.textPrimary, minWidth: 70 },
  scoreResult: { padding: spacing.sm, backgroundColor: lightColors.background, borderRadius: radius.sm, marginBottom: spacing.sm },
  scoreResultLabel: { fontSize: 12, color: lightColors.textSecondary },
  scoreResultValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  sensorButtons: { flexDirection: 'row', gap: spacing.sm },
  sensorBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md },
  sensorBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  stopIcon: { width: 12, height: 12, backgroundColor: '#fff', borderRadius: 2 },

  tabs: { marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, marginRight: spacing.sm, borderWidth: 1 },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tabText: { fontWeight: '600', fontSize: 12 },

  sectionCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.md },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, borderRadius: radius.sm, marginBottom: spacing.xs, minHeight: 44 },
  checkLabel: { flex: 1, fontSize: 14 },

  scoreSect: { marginTop: spacing.md },
  scoreRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  scoreBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: lightColors.border },
  scoreBtnText: { fontSize: 13, fontWeight: '600' },

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
