import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Image, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, FileText, CheckCircle, Circle, X, Check, Mic, MicOff, Play, Scale } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  selectReportById, selectReportProgress,
  updateSectionNotes, toggleChecklistItem, markSectionComplete,
  addPhotoToSection, removePhotoFromSection, markReportComplete,
  addAudioNote, removeAudioNote, TYPE_META,
} from '../store/slices/reportsSlice';
import { startRecording, stopRecording, playAudio, isRecording } from '../services/audioService';
import { lightColors, spacing, radius } from '../theme/tokens';

const ACCENT = '#06B6D4';

export default function LegalDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const [activeSection, setActiveSection] = useState(0);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingLoading, setRecordingLoading] = useState(false);

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const section = report.sections[activeSection];
  const completedCount = report.sections.filter((s) => s.complete).length;

  const handleStartRecording = async () => {
    try {
      setRecordingLoading(true);
      await startRecording();
      setRecordingActive(true);
    } catch (err) {
      Alert.alert('Microphone Error', err.message);
    } finally {
      setRecordingLoading(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setRecordingLoading(true);
      const uri = await stopRecording();
      setRecordingActive(false);
      if (uri) {
        dispatch(addAudioNote({
          reportId,
          sectionId: section.id,
          audio: { uri, timestamp: new Date().toISOString(), durationEstimate: 'Recorded' },
        }));
        Alert.alert('Recording Saved', 'Audio note added to this section.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRecordingLoading(false);
    }
  };

  const handlePlayAudio = async (uri) => {
    try {
      await playAudio(uri);
    } catch (err) {
      Alert.alert('Playback Error', err.message);
    }
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled) {
      dispatch(addPhotoToSection({
        reportId, sectionId: section.id,
        photo: { uri: result.assets[0].uri, timestamp: new Date().toISOString(), type: 'photo' },
      }));
    }
  };

  const handlePickScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsMultipleSelection: false });
    if (!result.canceled) {
      dispatch(addPhotoToSection({
        reportId, sectionId: section.id,
        photo: { uri: result.assets[0].uri, timestamp: new Date().toISOString(), type: 'screenshot' },
      }));
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        dispatch(addPhotoToSection({
          reportId, sectionId: section.id,
          photo: { uri: asset.uri, timestamp: new Date().toISOString(), type: 'document', name: asset.name },
        }));
        Alert.alert('Document Attached', asset.name);
      }
    } catch {
      Alert.alert('Error', 'Could not attach document.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[styles.header, { backgroundColor: lightColors.surface }]}>
          <View style={styles.headerTop}>
            <Scale size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.typeText, { color: ACCENT }]}>Legal & Forensic Report</Text>
            <View style={[styles.statusBadge, { backgroundColor: ACCENT + '20' }]}>
              <Text style={[styles.statusText, { color: ACCENT }]}>{report.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.title}>{report.title}</Text>
          {report.metadata?.caseNumber && <Text style={styles.meta}>Case #: {report.metadata.caseNumber}</Text>}
          {report.metadata?.agencyName && <Text style={styles.meta}>Agency: {report.metadata.agencyName}</Text>}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{completedCount}/{report.sections.length} sections • {progress}%</Text>
        </View>

        {/* Chain of Custody info box */}
        <View style={[styles.custodyBox, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '30' }]}>
          <Text style={[styles.custodyTitle, { color: ACCENT }]}>Chain of Custody</Text>
          <View style={styles.custodyRow}>
            <Text style={styles.custodyLabel}>Report ID:</Text>
            <Text style={styles.custodyValue}>{report.id}</Text>
          </View>
          <View style={styles.custodyRow}>
            <Text style={styles.custodyLabel}>Checksum:</Text>
            <Text style={styles.custodyValue}>{report.checksum}</Text>
          </View>
          <View style={styles.custodyRow}>
            <Text style={styles.custodyLabel}>Created:</Text>
            <Text style={styles.custodyValue}>{new Date(report.createdAt).toLocaleString('en-AU')}</Text>
          </View>
          {report.gpsLocation && (
            <View style={styles.custodyRow}>
              <Text style={styles.custodyLabel}>GPS:</Text>
              <Text style={styles.custodyValue}>{report.gpsLocation.latitude.toFixed(4)}°, {report.gpsLocation.longitude.toFixed(4)}°</Text>
            </View>
          )}
        </View>

        {/* Audio Recording Panel */}
        <View style={[styles.audioPanel, { backgroundColor: '#fef3c7', borderColor: '#f59e0b40' }]}>
          <View style={styles.audioPanelHeader}>
            <Mic size={16} color="#92400e" strokeWidth={2} />
            <Text style={styles.audioPanelTitle}>Audio Evidence Recorder</Text>
          </View>
          <Text style={styles.audioPanelSub}>Record witness statements or observations for this section</Text>

          {section.audioNotes?.length > 0 && (
            <View style={styles.audioList}>
              {section.audioNotes.map((audio, idx) => (
                <View key={idx} style={styles.audioItem}>
                  <Mic size={14} color="#92400e" strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.audioItemLabel}>Audio Note {idx + 1}</Text>
                    <Text style={styles.audioItemTime}>{new Date(audio.timestamp).toLocaleTimeString('en-AU')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handlePlayAudio(audio.uri)} style={styles.playBtn}>
                    <Play size={14} color="#fff" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => dispatch(removeAudioNote({ reportId, sectionId: section.id, audioIndex: idx }))}
                    style={styles.removeAudioBtn}
                  >
                    <X size={13} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.audioButtons}>
            {recordingLoading ? (
              <ActivityIndicator color="#92400e" />
            ) : !recordingActive ? (
              <TouchableOpacity style={[styles.audioBtn, { backgroundColor: '#f59e0b' }]} onPress={handleStartRecording}>
                <Mic size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.audioBtnText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.audioBtn, { backgroundColor: '#ef4444' }]} onPress={handleStopRecording}>
                <MicOff size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.audioBtnText}>Stop & Save</Text>
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

          <Text style={styles.notesLabel}>Evidence Notes</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) => dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))}
            placeholder="Record observations, statements, evidence details..."
            style={styles.notesInput}
            placeholderTextColor={lightColors.textSecondary}
            multiline
          />

          <Text style={styles.notesLabel}>Evidence Attachments ({section.photos?.length || 0})</Text>
          {section.photos?.length > 0 && (
            <FlatList
              data={section.photos}
              horizontal
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.photoWrap}>
                  {item.type === 'document' ? (
                    <View style={[styles.docPlaceholder]}>
                      <FileText size={24} color={ACCENT} strokeWidth={2} />
                      <Text style={styles.docName} numberOfLines={2}>{item.name || 'Document'}</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: item.uri }} style={styles.photo} />
                  )}
                  {item.type && (
                    <View style={[styles.typeTag, { backgroundColor: item.type === 'screenshot' ? '#6366f1' : item.type === 'document' ? '#10b981' : ACCENT }]}>
                      <Text style={styles.typeTagText}>{item.type}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removePhoto} onPress={() => dispatch(removePhotoFromSection({ reportId, sectionId: section.id, photoIndex: index }))}>
                    <X size={13} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              )}
              style={{ marginBottom: spacing.sm }}
            />
          )}

          <View style={styles.attachButtons}>
            <TouchableOpacity style={[styles.attachBtn, { backgroundColor: ACCENT }]} onPress={handleAddPhoto}>
              <Camera size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.attachBtnText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#6366f1' }]} onPress={handlePickScreenshot}>
              <FileText size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.attachBtnText}>Screenshot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#10b981' }]} onPress={handlePickDocument}>
              <FileText size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.attachBtnText}>Document</Text>
            </TouchableOpacity>
          </View>

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
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => { dispatch(markReportComplete({ reportId })); Alert.alert('Done', 'Legal report marked complete!'); }}>
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

  custodyBox: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  custodyTitle: { fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  custodyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  custodyLabel: { fontSize: 11, fontWeight: '600', color: lightColors.textSecondary, width: 70 },
  custodyValue: { fontSize: 11, color: lightColors.textPrimary, flex: 1 },

  audioPanel: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  audioPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  audioPanelTitle: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  audioPanelSub: { fontSize: 12, color: '#92400e', marginBottom: spacing.sm },
  audioList: { marginBottom: spacing.sm },
  audioItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.xs },
  audioItemLabel: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary },
  audioItemTime: { fontSize: 11, color: lightColors.textSecondary },
  playBtn: { backgroundColor: '#10b981', borderRadius: 12, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  removeAudioBtn: { backgroundColor: lightColors.error, borderRadius: 12, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  audioButtons: { flexDirection: 'row' },
  audioBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md },
  audioBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

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
  docPlaceholder: { width: 110, height: 110, borderRadius: radius.md, backgroundColor: lightColors.background, borderWidth: 1, borderColor: lightColors.border, justifyContent: 'center', alignItems: 'center', padding: spacing.xs },
  docName: { fontSize: 10, color: lightColors.textSecondary, textAlign: 'center', marginTop: 4 },
  typeTag: { position: 'absolute', bottom: 0, left: 0, paddingHorizontal: 6, paddingVertical: 2, borderBottomLeftRadius: radius.md },
  typeTagText: { fontSize: 9, color: '#fff', fontWeight: '700', textTransform: 'uppercase' },
  removePhoto: { position: 'absolute', top: -8, right: -8, backgroundColor: lightColors.error, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },

  attachButtons: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm, borderRadius: radius.md },
  attachBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  completeBtnText: { color: '#fff', fontWeight: '600' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, justifyContent: 'center' },
  completedText: { color: '#10b981', fontWeight: '600', fontSize: 14 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
