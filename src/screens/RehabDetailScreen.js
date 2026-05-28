import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Image, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Camera, FileText, CheckCircle, Circle, X, Check,
  Heart, Activity, Timer, GitCompare, Pen, BarChart2, Gauge,
} from 'lucide-react-native';
import { launchCamera, launchLibrary } from '../services/cameraService';
import PhotoAnnotationModal from '../components/PhotoAnnotationModal';
import SpeechToTextButton from '../components/SpeechToTextButton';
import {
  selectReportById, selectReportProgress, selectOverallScore,
  updateSectionNotes, toggleChecklistItem, markSectionComplete,
  addPhotoToSection, removePhotoFromSection, markReportComplete,
  savePhotoAnnotations, addMeasurementReading, setSectionScore, saveSensorData,
} from '../store/slices/reportsSlice';
import { startAccelerometer, stopAccelerometer, computeTiltAngles } from '../services/sensorService';
import { lightColors, spacing, radius } from '../theme/tokens';

const ACCENT = '#EC4899';
const JOINTS = ['Knee', 'Shoulder', 'Elbow', 'Hip', 'Wrist', 'Ankle'];

export default function RehabDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const overallScore = useSelector(selectOverallScore(reportId));
  const [activeSection, setActiveSection] = useState(0);
  const [annotatingPhoto, setAnnotatingPhoto] = useState(null);

  // Joint angle measurement
  const [selectedJoint, setSelectedJoint] = useState('Knee');
  const [measuringAngle, setMeasuringAngle] = useState(false);
  const [currentTilt, setCurrentTilt] = useState({ pitch: 0, roll: 0 });

  // Rep counter
  const [exerciseActive, setExerciseActive] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [repTimestamps, setRepTimestamps] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const exerciseStartTime = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      stopAccelerometer();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const section = report.sections[activeSection];
  const completedCount = report.sections.filter((s) => s.complete).length;
  const sectionMeasurements = (report.measurements || []).filter(
    (m) => m.sectionId === section.id && m.type === 'joint_angle'
  );

  // ─── Joint Angle Panel ───────────────────────────────────────────────────────

  const handleStartAngle = () => {
    setMeasuringAngle(true);
    startAccelerometer((data) => setCurrentTilt(computeTiltAngles(data)), 100);
  };

  const handleStopAngle = () => {
    stopAccelerometer();
    setMeasuringAngle(false);
  };

  const handleCaptureAngle = () => {
    dispatch(addMeasurementReading({
      reportId,
      reading: {
        sectionId: section.id,
        type: 'joint_angle',
        joint: selectedJoint,
        pitch: currentTilt.pitch,
        roll: currentTilt.roll,
        label: `${selectedJoint} angle`,
        timestamp: new Date().toISOString(),
      },
    }));
    Alert.alert(
      'Angle Captured',
      `${selectedJoint}: Pitch ${currentTilt.pitch}°  Roll ${currentTilt.roll}°`
    );
  };

  // ─── Rep Counter ─────────────────────────────────────────────────────────────

  const handleStartExercise = () => {
    exerciseStartTime.current = Date.now();
    setRepCount(0);
    setRepTimestamps([]);
    setElapsedSeconds(0);
    setExerciseActive(true);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - exerciseStartTime.current) / 1000));
    }, 1000);
  };

  const handleCountRep = () => {
    const now = Date.now();
    setRepTimestamps((prev) => [...prev, now]);
    setRepCount((prev) => prev + 1);
  };

  const handleFinishExercise = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const totalDuration = exerciseStartTime.current
      ? (Date.now() - exerciseStartTime.current) / 1000
      : 0;
    const intervals = repTimestamps.slice(1).map((t, i) => (t - repTimestamps[i]) / 1000);
    const avgInterval = intervals.length > 0
      ? (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1)
      : null;

    const sessionData = {
      type: 'rehab_session',
      sectionId: section.id,
      sectionName: section.name,
      totalReps: repCount,
      exerciseDurationSeconds: parseFloat(totalDuration.toFixed(1)),
      averageRepIntervalSeconds: avgInterval ? parseFloat(avgInterval) : null,
      repTimestamps,
      capturedAt: new Date().toISOString(),
    };
    dispatch(saveSensorData({ reportId, sensorData: sessionData }));
    setExerciseActive(false);

    Alert.alert(
      'Exercise Complete',
      `Reps: ${repCount}\nDuration: ${Math.floor(totalDuration / 60)}m ${Math.floor(totalDuration % 60)}s` +
      (avgInterval ? `\nAvg rep time: ${avgInterval}s` : '')
    );
  };

  const avgRepInterval = repTimestamps.length > 1
    ? ((repTimestamps[repTimestamps.length - 1] - repTimestamps[0]) / (repTimestamps.length - 1) / 1000).toFixed(1)
    : null;

  const lastRepInterval = repTimestamps.length > 1
    ? ((repTimestamps[repTimestamps.length - 1] - repTimestamps[repTimestamps.length - 2]) / 1000).toFixed(1)
    : null;

  // ─── Photos ──────────────────────────────────────────────────────────────────

  const handleAddPhoto = async () => {
    const asset = await launchCamera({ quality: 0.8 });
    if (asset) {
      dispatch(addPhotoToSection({
        reportId,
        sectionId: section.id,
        photo: {
          uri: asset.uri,
          timestamp: new Date().toISOString(),
          jointLabel: selectedJoint,
        },
      }));
    }
  };

  const handlePickPhoto = async () => {
    const asset = await launchLibrary({ quality: 0.8 });
    if (asset) {
      dispatch(addPhotoToSection({
        reportId,
        sectionId: section.id,
        photo: {
          uri: asset.uri,
          timestamp: new Date().toISOString(),
          jointLabel: selectedJoint,
          fromLibrary: true,
        },
      }));
    }
  };

  const formatTime = (secs) =>
    `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <PhotoAnnotationModal
        visible={annotatingPhoto !== null}
        photoUri={annotatingPhoto?.uri}
        onClose={() => setAnnotatingPhoto(null)}
        onSave={(annotations) => {
          if (annotatingPhoto !== null) {
            dispatch(savePhotoAnnotations({
              reportId,
              sectionId: section.id,
              photoIndex: annotatingPhoto.photoIndex,
              annotations,
            }));
          }
          setAnnotatingPhoto(null);
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[styles.header, { backgroundColor: lightColors.surface }]}>
          <View style={styles.headerTop}>
            <Heart size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.typeText, { color: ACCENT }]}>Patient Rehabilitation Report</Text>
            <View style={[styles.statusBadge, { backgroundColor: ACCENT + '20' }]}>
              <Text style={[styles.statusText, { color: ACCENT }]}>{report.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.meta}>Clinician: {report.createdBy}</Text>
          {report.metadata?.patientId && (
            <Text style={styles.meta}>Patient ID: {report.metadata.patientId}</Text>
          )}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: ACCENT }]} />
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

        {/* Joint Angle Panel */}
        <View style={[styles.panel, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '40' }]}>
          <View style={styles.panelHeader}>
            <Activity size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.panelTitle, { color: ACCENT }]}>Joint Angle Measurement</Text>
          </View>

          {/* Joint Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jointRow}>
            {JOINTS.map((joint) => (
              <TouchableOpacity
                key={joint}
                style={[styles.jointChip, {
                  backgroundColor: selectedJoint === joint ? ACCENT : lightColors.background,
                  borderColor: selectedJoint === joint ? ACCENT : lightColors.border,
                }]}
                onPress={() => setSelectedJoint(joint)}
              >
                <Text style={[styles.jointChipText, { color: selectedJoint === joint ? '#fff' : lightColors.textPrimary }]}>
                  {joint}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {measuringAngle && (
            <View style={styles.tiltDisplay}>
              <View style={styles.tiltStat}>
                <Text style={styles.tiltValue}>{currentTilt.pitch}°</Text>
                <Text style={styles.tiltLabel}>Flexion</Text>
              </View>
              <View style={styles.tiltStat}>
                <Text style={styles.tiltValue}>{currentTilt.roll}°</Text>
                <Text style={styles.tiltLabel}>Abduction</Text>
              </View>
              <View style={styles.tiltStat}>
                <Text style={styles.tiltValue}>
                  {Math.abs(currentTilt.pitch).toFixed(0)}°
                </Text>
                <Text style={styles.tiltLabel}>ROM</Text>
              </View>
            </View>
          )}

          {sectionMeasurements.length > 0 && (
            <View style={styles.measureList}>
              <Text style={styles.measureListTitle}>Session angles ({sectionMeasurements.length})</Text>
              {sectionMeasurements.slice(-5).map((m, i) => (
                <View key={m._id || i} style={styles.measureRow}>
                  <View style={[styles.jointDot, { backgroundColor: ACCENT }]} />
                  <Text style={styles.measureLabel}>{m.joint}</Text>
                  <Text style={styles.measureValue}>
                    {m.pitch}° / {m.roll}°
                  </Text>
                  <Text style={styles.measureTime}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.panelButtons}>
            {!measuringAngle ? (
              <TouchableOpacity
                style={[styles.panelBtn, { backgroundColor: ACCENT }]}
                onPress={handleStartAngle}
              >
                <Activity size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.panelBtnText}>Start Measurement</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.panelBtn, { backgroundColor: '#10b981', flex: 2 }]}
                  onPress={handleCaptureAngle}
                >
                  <Check size={14} color="#fff" strokeWidth={3} />
                  <Text style={styles.panelBtnText}>Capture {selectedJoint}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.panelBtn, { backgroundColor: '#ef4444' }]}
                  onPress={handleStopAngle}
                >
                  <X size={14} color="#fff" strokeWidth={3} />
                  <Text style={styles.panelBtnText}>Stop</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Rep Counter & Timing Panel */}
        <View style={[styles.panel, { backgroundColor: '#7c3aed10', borderColor: '#7c3aed40' }]}>
          <View style={styles.panelHeader}>
            <Timer size={16} color="#7c3aed" strokeWidth={2} />
            <Text style={[styles.panelTitle, { color: '#7c3aed' }]}>Repetition & Reflex Timing</Text>
          </View>

          {exerciseActive && (
            <View style={styles.repDisplay}>
              <View style={styles.repStat}>
                <Text style={[styles.repValue, { color: '#7c3aed' }]}>{repCount}</Text>
                <Text style={styles.repLabel}>Reps</Text>
              </View>
              <View style={styles.repStat}>
                <Text style={[styles.repValue, { color: '#7c3aed' }]}>{formatTime(elapsedSeconds)}</Text>
                <Text style={styles.repLabel}>Elapsed</Text>
              </View>
              {avgRepInterval && (
                <View style={styles.repStat}>
                  <Text style={[styles.repValue, { color: '#7c3aed' }]}>{avgRepInterval}s</Text>
                  <Text style={styles.repLabel}>Avg interval</Text>
                </View>
              )}
              {lastRepInterval && (
                <View style={styles.repStat}>
                  <Text style={[styles.repValue, { color: '#7c3aed' }]}>{lastRepInterval}s</Text>
                  <Text style={styles.repLabel}>Last rep</Text>
                </View>
              )}
            </View>
          )}

          {!exerciseActive && report.sensorData?.type === 'rehab_session' && (
            <View style={styles.sessionSummary}>
              <Text style={styles.sessionSummaryTitle}>Last session result</Text>
              <Text style={styles.sessionSummaryLine}>
                Reps: {report.sensorData.totalReps}  •  Duration: {report.sensorData.exerciseDurationSeconds}s
                {report.sensorData.averageRepIntervalSeconds
                  ? `  •  Avg interval: ${report.sensorData.averageRepIntervalSeconds}s`
                  : ''}
              </Text>
            </View>
          )}

          <View style={styles.panelButtons}>
            {!exerciseActive ? (
              <TouchableOpacity
                style={[styles.panelBtn, { backgroundColor: '#7c3aed' }]}
                onPress={handleStartExercise}
              >
                <Timer size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.panelBtnText}>Start Exercise</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.panelBtn, { backgroundColor: '#7c3aed', flex: 2 }]}
                  onPress={handleCountRep}
                >
                  <Check size={14} color="#fff" strokeWidth={3} />
                  <Text style={styles.panelBtnText}>Count Rep</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.panelBtn, { backgroundColor: '#ef4444' }]}
                  onPress={handleFinishExercise}
                >
                  <X size={14} color="#fff" strokeWidth={3} />
                  <Text style={styles.panelBtnText}>Finish</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Section Tabs */}
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

        {/* Section Card */}
        <View style={[styles.sectionCard, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.sectionTitle}>{section.name}</Text>

          {/* Checklist */}
          {Object.entries(section.checklist || {}).map(([key, checked]) => (
            <TouchableOpacity
              key={key}
              onPress={() => dispatch(toggleChecklistItem({ reportId, sectionId: section.id, key }))}
              style={[styles.checkItem, { backgroundColor: checked ? '#fce7f3' : lightColors.background }]}
            >
              {checked
                ? <CheckCircle size={20} color={ACCENT} strokeWidth={2.5} />
                : <Circle size={20} color={lightColors.textSecondary} strokeWidth={2} />}
              <Text style={[styles.checkLabel, { color: checked ? '#831843' : lightColors.textPrimary }]}>{key}</Text>
            </TouchableOpacity>
          ))}

          {/* Section Score */}
          <View style={styles.scoreSection}>
            <Text style={styles.notesLabel}>
              Section Score: {section.score !== null ? `${section.score}/100` : 'Not set'}
            </Text>
            <View style={styles.scoreRow}>
              {[0, 25, 50, 75, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.scoreBtn, { backgroundColor: section.score === val ? ACCENT : lightColors.background }]}
                  onPress={() => dispatch(setSectionScore({ reportId, sectionId: section.id, score: val }))}
                >
                  <Text style={[styles.scoreBtnText, { color: section.score === val ? '#fff' : lightColors.textPrimary }]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Photos */}
          <Text style={styles.notesLabel}>
            Movement Photos ({section.photos?.length || 0}){' '}
            <Text style={{ color: lightColors.textSecondary, fontWeight: '400' }}>
              — Joint: {selectedJoint}
            </Text>
          </Text>
          {(section.photos || []).length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
              {(section.photos || []).map((item, index) => (
                <View key={index} style={styles.photoWrap}>
                  <Image source={{ uri: item.uri }} style={styles.photo} />
                  {item.jointLabel && (
                    <View style={[styles.jointBadge, { backgroundColor: ACCENT }]}>
                      <Text style={styles.jointBadgeText}>{item.jointLabel}</Text>
                    </View>
                  )}
                  {item.annotations?.length > 0 && (
                    <View style={styles.annotationBadge}>
                      <Text style={styles.annotationBadgeText}>{item.annotations.length}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.annotateBtn}
                    onPress={() => setAnnotatingPhoto({ photoIndex: index, uri: item.uri })}
                  >
                    <Pen size={11} color="#fff" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() =>
                      dispatch(removePhotoFromSection({ reportId, sectionId: section.id, photoIndex: index }))
                    }
                  >
                    <X size={13} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: ACCENT }]}
              onPress={handleAddPhoto}
            >
              <Camera size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: '#6b7280' }]}
              onPress={handlePickPhoto}
            >
              <FileText size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.photoBtnText}>Library</Text>
            </TouchableOpacity>
          </View>

          {/* Clinician Notes */}
          <Text style={styles.notesLabel}>Clinician Notes</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) =>
              dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))
            }
            placeholder="Clinical observations, patient feedback, next session plan..."
            style={styles.notesInput}
            placeholderTextColor={lightColors.textSecondary}
            multiline
          />
          <SpeechToTextButton
            accentColor={ACCENT}
            style={{ marginTop: spacing.sm }}
            onTranscript={(text) => {
              const current = section.conditionNotes || '';
              dispatch(updateSectionNotes({
                reportId,
                sectionId: section.id,
                notes: current ? `${current}\n${text}` : text,
              }));
            }}
          />

          {/* Mark Complete */}
          {!section.complete ? (
            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: ACCENT }]}
              onPress={() => dispatch(markSectionComplete({ reportId, sectionId: section.id }))}
            >
              <Check size={16} color="#fff" strokeWidth={3} />
              <Text style={styles.completeBtnText}>Mark Section Complete</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}>
              <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />
              <Text style={styles.completedText}>Section Complete</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]}
          onPress={() => navigation.navigate('ReportComparison', { reportId, reportType: 'rehab' })}
        >
          <GitCompare size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>Compare Progress</Text>
        </TouchableOpacity>
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
            onPress={() => {
              dispatch(markReportComplete({ reportId }));
              Alert.alert('Done', 'Rehabilitation session report marked complete!');
            }}
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
  progressFill: { height: 6, borderRadius: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: 11, color: lightColors.textSecondary },
  scoreChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
    backgroundColor: '#fce7f3',
  },
  scoreText: { fontSize: 11, fontWeight: '700' },

  panel: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  panelTitle: { fontSize: 14, fontWeight: '600', flex: 1 },

  jointRow: { marginBottom: spacing.sm },
  jointChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 20,
    marginRight: spacing.xs, borderWidth: 1,
  },
  jointChipText: { fontSize: 13, fontWeight: '600' },

  tiltDisplay: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  tiltStat: {
    flex: 1, backgroundColor: lightColors.background,
    borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center',
  },
  tiltValue: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary },
  tiltLabel: { fontSize: 10, color: lightColors.textSecondary, marginTop: 2 },

  measureList: {
    backgroundColor: lightColors.background, borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  measureListTitle: { fontSize: 11, fontWeight: '600', color: lightColors.textSecondary, marginBottom: 4 },
  measureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 3 },
  jointDot: { width: 8, height: 8, borderRadius: 4 },
  measureLabel: { fontSize: 12, color: lightColors.textPrimary, flex: 1, fontWeight: '600' },
  measureValue: { fontSize: 12, color: lightColors.textPrimary },
  measureTime: { fontSize: 10, color: lightColors.textSecondary },

  panelButtons: { flexDirection: 'row', gap: spacing.sm },
  panelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  panelBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  repDisplay: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  repStat: {
    minWidth: 80, flex: 1, backgroundColor: lightColors.background,
    borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center',
  },
  repValue: { fontSize: 22, fontWeight: '700' },
  repLabel: { fontSize: 10, color: lightColors.textSecondary, marginTop: 2 },
  sessionSummary: {
    backgroundColor: lightColors.background, borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  sessionSummaryTitle: { fontSize: 11, fontWeight: '600', color: lightColors.textSecondary, marginBottom: 2 },
  sessionSummaryLine: { fontSize: 12, color: lightColors.textPrimary },

  tabs: { marginBottom: spacing.md },
  tab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, marginRight: spacing.sm, borderWidth: 1,
  },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tabText: { fontWeight: '600', fontSize: 12 },

  sectionCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.md },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 10,
    borderRadius: radius.sm, marginBottom: spacing.xs, minHeight: 44,
  },
  checkLabel: { flex: 1, fontSize: 14 },

  scoreSection: { marginTop: spacing.md, marginBottom: spacing.xs },
  scoreRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  scoreBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm,
    alignItems: 'center', borderWidth: 1, borderColor: lightColors.border,
  },
  scoreBtnText: { fontSize: 13, fontWeight: '600' },

  notesLabel: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  notesInput: {
    borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: 13, color: lightColors.textPrimary,
    minHeight: 80, textAlignVertical: 'top', backgroundColor: lightColors.background,
  },

  photoWrap: { position: 'relative', marginRight: spacing.md },
  photo: { width: 110, height: 110, borderRadius: radius.md },
  jointBadge: {
    position: 'absolute', bottom: 4, left: 4,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  jointBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  annotationBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  annotationBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  annotateBtn: {
    position: 'absolute', bottom: -8, left: -8,
    backgroundColor: '#2563eb', borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  removePhoto: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: lightColors.error, borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  photoButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.sm },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md,
  },
  completeBtnText: { color: '#fff', fontWeight: '600' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, justifyContent: 'center' },
  completedText: { color: '#10b981', fontWeight: '600', fontSize: 14 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
