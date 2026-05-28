import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Image, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Camera, FileText, CheckCircle, Circle, X, Check,
  Wrench, Crosshair, MapPin, Pen, BarChart2,
} from 'lucide-react-native';
import { launchCamera, launchLibrary } from '../services/cameraService';
import PhotoAnnotationModal from '../components/PhotoAnnotationModal';
import SpeechToTextButton from '../components/SpeechToTextButton';
import {
  selectReportById, selectReportProgress,
  updateSectionNotes, toggleChecklistItem, markSectionComplete,
  addPhotoToSection, removePhotoFromSection, markReportComplete,
  savePhotoAnnotations, addMeasurementReading,
} from '../store/slices/reportsSlice';
import { startAccelerometer, stopAccelerometer, computeTiltAngles } from '../services/sensorService';
import { lightColors, spacing, radius } from '../theme/tokens';

const ACCENT = '#F59E0B';

export default function TradesDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const [activeSection, setActiveSection] = useState(0);
  const [annotatingPhoto, setAnnotatingPhoto] = useState(null);

  const [measuring, setMeasuring] = useState(false);
  const [currentTilt, setCurrentTilt] = useState({ pitch: 0, roll: 0 });
  const [currentAccel, setCurrentAccel] = useState({ x: 0, y: 0, z: 1 });

  useEffect(() => {
    return () => stopAccelerometer();
  }, []);

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const section = report.sections[activeSection];
  const completedCount = report.sections.filter((s) => s.complete).length;
  const sectionMeasurements = (report.measurements || []).filter((m) => m.sectionId === section.id);

  const handleStartMeasuring = () => {
    setMeasuring(true);
    startAccelerometer((data) => {
      setCurrentAccel(data);
      setCurrentTilt(computeTiltAngles(data));
    }, 100);
  };

  const handleStopMeasuring = () => {
    stopAccelerometer();
    setMeasuring(false);
  };

  const handleCaptureMeasurement = () => {
    dispatch(addMeasurementReading({
      reportId,
      reading: {
        sectionId: section.id,
        type: 'alignment',
        label: section.name,
        pitch: currentTilt.pitch,
        roll: currentTilt.roll,
        magnitude: parseFloat(
          Math.sqrt(currentAccel.x ** 2 + currentAccel.y ** 2 + currentAccel.z ** 2).toFixed(3)
        ),
        timestamp: new Date().toISOString(),
        gpsTag: report.gpsLocation || null,
      },
    }));
    Alert.alert('Angle Captured', `Pitch: ${currentTilt.pitch}°   Roll: ${currentTilt.roll}°`);
  };

  const handleAddPhoto = async (phase) => {
    const asset = await launchCamera({ quality: 0.8 });
    if (asset) {
      dispatch(addPhotoToSection({
        reportId,
        sectionId: section.id,
        photo: {
          uri: asset.uri,
          timestamp: new Date().toISOString(),
          phase,
          gpsTag: report.gpsLocation || null,
        },
      }));
    }
  };

  const handlePickPhoto = async (phase) => {
    const asset = await launchLibrary({ quality: 0.8 });
    if (asset) {
      dispatch(addPhotoToSection({
        reportId,
        sectionId: section.id,
        photo: {
          uri: asset.uri,
          timestamp: new Date().toISOString(),
          phase,
          gpsTag: report.gpsLocation || null,
          fromLibrary: true,
        },
      }));
    }
  };

  const photos = section.photos || [];

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
            <Wrench size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.typeText, { color: ACCENT }]}>Trades Report</Text>
            <View style={[styles.statusBadge, { backgroundColor: ACCENT + '20' }]}>
              <Text style={[styles.statusText, { color: ACCENT }]}>{report.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.meta}>By {report.createdBy}</Text>
          {report.gpsLocation && (
            <View style={styles.gpsRow}>
              <MapPin size={12} color={ACCENT} strokeWidth={2} />
              <Text style={styles.gpsText}>
                {report.gpsLocation.latitude?.toFixed(5)}°, {report.gpsLocation.longitude?.toFixed(5)}°
              </Text>
            </View>
          )}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: ACCENT }]} />
          </View>
          <Text style={styles.progressText}>{completedCount}/{report.sections.length} sections • {progress}%</Text>
        </View>

        {/* Alignment & Angle Measurement Panel */}
        <View style={[styles.panel, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '40' }]}>
          <View style={styles.panelHeader}>
            <Crosshair size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.panelTitle, { color: ACCENT }]}>Alignment & Angle Measurement</Text>
          </View>

          {measuring && (
            <View style={styles.tiltDisplay}>
              <View style={styles.tiltStat}>
                <Text style={styles.tiltValue}>{currentTilt.pitch}°</Text>
                <Text style={styles.tiltLabel}>Pitch</Text>
              </View>
              <View style={styles.tiltStat}>
                <Text style={styles.tiltValue}>{currentTilt.roll}°</Text>
                <Text style={styles.tiltLabel}>Roll</Text>
              </View>
              <View style={styles.tiltStat}>
                <Text style={styles.tiltValue}>
                  {Math.sqrt(currentAccel.x ** 2 + currentAccel.y ** 2 + currentAccel.z ** 2).toFixed(2)}
                </Text>
                <Text style={styles.tiltLabel}>g</Text>
              </View>
            </View>
          )}

          {sectionMeasurements.length > 0 && (
            <View style={styles.measureList}>
              <Text style={styles.measureListTitle}>
                Captured for this section ({sectionMeasurements.length})
              </Text>
              {sectionMeasurements.slice(-4).map((m, i) => (
                <View key={m._id || i} style={styles.measureRow}>
                  <Text style={styles.measureLabel} numberOfLines={1}>{m.label}</Text>
                  <Text style={styles.measureValue}>P {m.pitch}°  R {m.roll}°</Text>
                  <Text style={styles.measureTime}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {m.gpsTag ? ' 📍' : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.panelButtons}>
            {!measuring ? (
              <TouchableOpacity
                style={[styles.panelBtn, { backgroundColor: ACCENT }]}
                onPress={handleStartMeasuring}
              >
                <Crosshair size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.panelBtnText}>Start Sensor</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.panelBtn, { backgroundColor: '#10b981', flex: 2 }]}
                  onPress={handleCaptureMeasurement}
                >
                  <Check size={14} color="#fff" strokeWidth={3} />
                  <Text style={styles.panelBtnText}>Capture Angle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.panelBtn, { backgroundColor: '#ef4444' }]}
                  onPress={handleStopMeasuring}
                >
                  <X size={14} color="#fff" strokeWidth={3} />
                  <Text style={styles.panelBtnText}>Stop</Text>
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
              style={[styles.checkItem, { backgroundColor: checked ? '#d1fae5' : lightColors.background }]}
            >
              {checked
                ? <CheckCircle size={20} color="#10b981" strokeWidth={2.5} />
                : <Circle size={20} color={lightColors.textSecondary} strokeWidth={2} />}
              <Text style={[styles.checkLabel, { color: checked ? '#065f46' : lightColors.textPrimary }]}>{key}</Text>
            </TouchableOpacity>
          ))}

          {/* Evidence Photos — Before & After */}
          <Text style={styles.notesLabel}>
            Evidence Photos ({photos.length})
            {photos.filter((p) => p.phase === 'before').length > 0 &&
              ` • ${photos.filter((p) => p.phase === 'before').length} before`}
            {photos.filter((p) => p.phase === 'after').length > 0 &&
              ` • ${photos.filter((p) => p.phase === 'after').length} after`}
          </Text>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
              {photos.map((item, index) => (
                <View key={index} style={styles.photoWrap}>
                  <Image source={{ uri: item.uri }} style={styles.photo} />
                  {item.phase && (
                    <View style={[
                      styles.phaseBadge,
                      { backgroundColor: item.phase === 'before' ? '#3b82f6' : '#10b981' },
                    ]}>
                      <Text style={styles.phaseBadgeText}>{item.phase.toUpperCase()}</Text>
                    </View>
                  )}
                  {item.annotations?.length > 0 && (
                    <View style={styles.annotationBadge}>
                      <Text style={styles.annotationBadgeText}>{item.annotations.length}</Text>
                    </View>
                  )}
                  {item.gpsTag && (
                    <View style={styles.gpsBadge}>
                      <MapPin size={9} color="#fff" strokeWidth={2.5} />
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
                    onPress={() => dispatch(removePhotoFromSection({ reportId, sectionId: section.id, photoIndex: index }))}
                  >
                    <X size={13} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                  <Text style={styles.photoTimestamp} numberOfLines={1}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Before Photo Buttons */}
          <Text style={styles.photoGroupLabel}>Before Photos</Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: '#3b82f6' }]}
              onPress={() => handleAddPhoto('before')}
            >
              <Camera size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: '#6b7280' }]}
              onPress={() => handlePickPhoto('before')}
            >
              <FileText size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.photoBtnText}>Library</Text>
            </TouchableOpacity>
          </View>

          {/* After Photo Buttons */}
          <Text style={styles.photoGroupLabel}>After Photos</Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: '#10b981' }]}
              onPress={() => handleAddPhoto('after')}
            >
              <Camera size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: '#6b7280' }]}
              onPress={() => handlePickPhoto('after')}
            >
              <FileText size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.photoBtnText}>Library</Text>
            </TouchableOpacity>
          </View>

          {/* Work Notes */}
          <Text style={styles.notesLabel}>Work Notes</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) =>
              dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))
            }
            placeholder="Materials used, measurements, compliance observations..."
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
              Alert.alert('Done', 'Trades report marked complete!');
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
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  gpsText: { fontSize: 11, color: lightColors.textSecondary },
  progressBar: { height: 6, backgroundColor: lightColors.border, borderRadius: 3, marginTop: spacing.sm, marginBottom: spacing.xs },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 11, color: lightColors.textSecondary },

  panel: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  panelTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
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
  measureLabel: { fontSize: 11, color: lightColors.textPrimary, flex: 1 },
  measureValue: { fontSize: 11, fontWeight: '600', color: lightColors.textPrimary },
  measureTime: { fontSize: 10, color: lightColors.textSecondary },
  panelButtons: { flexDirection: 'row', gap: spacing.sm },
  panelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  panelBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

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

  notesLabel: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  notesInput: {
    borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: 13, color: lightColors.textPrimary,
    minHeight: 80, textAlignVertical: 'top', backgroundColor: lightColors.background,
  },

  photoWrap: { position: 'relative', marginRight: spacing.md, paddingBottom: 16 },
  photo: { width: 110, height: 110, borderRadius: radius.md },
  phaseBadge: {
    position: 'absolute', top: 4, left: 4,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  phaseBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  annotationBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  annotationBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  gpsBadge: {
    position: 'absolute', bottom: 20, right: 4,
    backgroundColor: '#10b981', borderRadius: 8, padding: 3,
  },
  annotateBtn: {
    position: 'absolute', bottom: 12, left: -8,
    backgroundColor: '#2563eb', borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  removePhoto: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: lightColors.error, borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  photoTimestamp: { fontSize: 9, color: lightColors.textSecondary, marginTop: 3, width: 110 },
  photoGroupLabel: {
    fontSize: 12, fontWeight: '600', color: lightColors.textSecondary,
    marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  photoButtons: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
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
