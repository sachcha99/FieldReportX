import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, Image, SafeAreaView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, FileText, CheckCircle, Circle, X, Check } from 'lucide-react-native';
import { selectRentalReportById, selectReportProgress, updateSectionNotes, toggleChecklistItem, markSectionComplete, addPhotoToSection, removePhotoFromSection, markReportComplete } from '../store/slices/rentalsSlice';
import { lightColors, spacing, radius } from '../theme/tokens';
import { launchCamera } from '../services/cameraService';
import SpeechToTextButton from '../components/SpeechToTextButton';

export default function RentalDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectRentalReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const [activeSection, setActiveSection] = useState(0);

  if (!report) return <SafeAreaView style={styles.container}><Text>Report not found</Text></SafeAreaView>;

  const handleAddPhoto = async () => {
    const asset = await launchCamera({ quality: 0.7 });
    if (asset) {
      dispatch(addPhotoToSection({
        reportId,
        sectionId: report.sections[activeSection].id,
        photo: { uri: asset.uri, timestamp: new Date().toISOString() },
      }));
    }
  };

  const handleGeneratePdf = () => {
    navigation.navigate('ReportPdf', { reportId });
  };

  const section = report.sections[activeSection];
  const completedCount = report.sections.filter(s => s.complete).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.address}>{report.propertyAddress}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{completedCount}/{report.sections.length} sections • {progress}%</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {report.sections.map((s, idx) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setActiveSection(idx)}
              style={[
                styles.tab,
                {
                  backgroundColor: activeSection === idx ? lightColors.primary : lightColors.surface,
                  borderColor: activeSection === idx ? lightColors.primary : lightColors.border,
                },
              ]}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, { color: activeSection === idx ? '#fff' : lightColors.textPrimary }]}>
                  {s.name.split(' ')[0]}
                </Text>
                {s.complete && <Check size={14} color={activeSection === idx ? '#fff' : '#10b981'} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.sectionCard, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.sectionTitle}>{section.name}</Text>

          {Object.entries(section.checklist || {}).map(([key, checked]) => (
            <TouchableOpacity
              key={key}
              onPress={() => dispatch(toggleChecklistItem({ reportId, sectionId: section.id, key }))}
              style={[styles.checklistItem, { backgroundColor: checked ? '#d1fae5' : lightColors.background }]}
            >
              {checked ? (
                <CheckCircle size={20} color="#10b981" strokeWidth={2.5} />
              ) : (
                <Circle size={20} color={lightColors.textSecondary} strokeWidth={2} />
              )}
              <Text style={styles.checklistLabel}>{key}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.notesLabel}>Condition Notes</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) => dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))}
            placeholder="Add observations..."
            style={styles.notesInput}
            placeholderTextColor={lightColors.textSecondary}
            multiline
          />
          <SpeechToTextButton
            accentColor={lightColors.primary}
            style={{ marginTop: spacing.sm }}
            onTranscript={(text) => {
              const current = section.conditionNotes || '';
              dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: current ? `${current}\n${text}` : text }));
            }}
          />

          <Text style={styles.photosLabel}>Photos ({section.photos?.length || 0})</Text>
          {section.photos && section.photos.length > 0 && (
            <FlatList
              data={section.photos}
              horizontal
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: item.uri }} style={styles.photo} />
                  <TouchableOpacity
                    onPress={() => dispatch(removePhotoFromSection({ reportId, sectionId: section.id, photoIndex: index }))}
                    style={styles.removePhotoBtn}
                  >
                    <X size={14} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
            <Camera size={18} color="#fff" strokeWidth={2} />
            <Text style={styles.addPhotoBtnText}>Capture Photo</Text>
          </TouchableOpacity>

          {!section.complete && (
            <TouchableOpacity
              style={[styles.button, { marginTop: spacing.md }]}
              onPress={() => dispatch(markSectionComplete({ reportId, sectionId: section.id }))}
            >
              <Text style={styles.buttonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleGeneratePdf}>
          <FileText size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.actionButtonText}>Generate PDF</Text>
        </TouchableOpacity>

        {completedCount === report.sections.length && report.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={() => {
              dispatch(markReportComplete({ reportId }));
              Alert.alert('Done!', 'Report marked as complete.');
            }}
          >
            <Check size={18} color="#fff" strokeWidth={2.5} />
            <Text style={styles.actionButtonText}>Mark Report Complete</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.lg, backgroundColor: lightColors.surface, padding: spacing.md, borderRadius: radius.md },
  title: { fontSize: 20, fontWeight: '700', color: lightColors.textPrimary },
  address: { fontSize: 13, color: lightColors.textSecondary, marginTop: spacing.xs },
  progressBar: { height: 6, backgroundColor: lightColors.border, borderRadius: 3, marginTop: spacing.md, marginBottom: spacing.sm },
  progressFill: { height: 6, backgroundColor: lightColors.primary, borderRadius: 3 },
  progressText: { fontSize: 12, color: lightColors.textSecondary },
  tabs: { marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, marginRight: spacing.sm, borderWidth: 1 },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tabText: { fontWeight: '600', fontSize: 12 },
  sectionCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.md, color: lightColors.textPrimary },
  checklistItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.sm },
  checklistLabel: { flex: 1, color: lightColors.textPrimary },
  notesLabel: { fontSize: 13, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.xs, color: lightColors.textPrimary },
  notesInput: { borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 13, color: lightColors.textPrimary, minHeight: 80 },
  photosLabel: { fontSize: 13, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm, color: lightColors.textPrimary },
  photoContainer: { position: 'relative', marginRight: spacing.md },
  photo: { width: 120, height: 120, borderRadius: radius.md },
  removePhotoBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: lightColors.error, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  addPhotoBtn: { backgroundColor: lightColors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  addPhotoBtnText: { color: '#fff', fontWeight: '600' },
  button: { backgroundColor: lightColors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  actionButton: { backgroundColor: lightColors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  actionButtonText: { color: '#fff', fontWeight: '600' },
});
