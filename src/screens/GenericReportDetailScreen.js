import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Image, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, FileText, CheckCircle, Circle, X, Check, Star } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  selectReportById, selectReportProgress, selectOverallScore,
  updateSectionNotes, toggleChecklistItem, markSectionComplete,
  addPhotoToSection, removePhotoFromSection, markReportComplete,
  setReportPdfUri, setSectionScore, TYPE_META,
} from '../store/slices/reportsSlice';
import { lightColors, spacing, radius } from '../theme/tokens';

const STATUS_COLORS = {
  draft: '#6B7280',
  in_progress: '#F59E0B',
  completed: '#10B981',
  archived: '#8B5CF6',
  synced: '#3B82F6',
};

export default function GenericReportDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const overallScore = useSelector(selectOverallScore(reportId));
  const [activeSection, setActiveSection] = useState(0);

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Report not found.</Text>
      </SafeAreaView>
    );
  }

  const meta = TYPE_META[report.type] || {};
  const section = report.sections[activeSection];
  const completedCount = report.sections.filter((s) => s.complete).length;
  const allComplete = completedCount === report.sections.length;

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      dispatch(
        addPhotoToSection({
          reportId,
          sectionId: section.id,
          photo: { uri: result.assets[0].uri, timestamp: new Date().toISOString() },
        })
      );
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) {
      dispatch(
        addPhotoToSection({
          reportId,
          sectionId: section.id,
          photo: { uri: result.assets[0].uri, timestamp: new Date().toISOString(), fromLibrary: true },
        })
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[styles.header, { backgroundColor: lightColors.surface }]}>
          <View style={styles.headerTop}>
            <View style={[styles.typeDot, { backgroundColor: meta.color || lightColors.primary }]} />
            <Text style={[styles.typeText, { color: meta.color || lightColors.primary }]}>
              {meta.label || report.type}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] + '20' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[report.status] }]}>
                {report.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.meta}>By {report.createdBy}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: meta.color || lightColors.primary }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{completedCount}/{report.sections.length} sections • {progress}%</Text>
            {overallScore !== null && (
              <View style={styles.scoreChip}>
                <Star size={12} color="#F59E0B" strokeWidth={2.5} />
                <Text style={styles.scoreText}>{overallScore}/100</Text>
              </View>
            )}
          </View>
        </View>

        {/* Section tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {report.sections.map((s, idx) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setActiveSection(idx)}
              style={[
                styles.tab,
                {
                  backgroundColor: activeSection === idx ? (meta.color || lightColors.primary) : lightColors.surface,
                  borderColor: activeSection === idx ? (meta.color || lightColors.primary) : lightColors.border,
                },
              ]}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, { color: activeSection === idx ? '#fff' : lightColors.textPrimary }]}>
                  {s.name.split(' ')[0]}
                </Text>
                {s.complete && (
                  <Check size={13} color={activeSection === idx ? '#fff' : '#10b981'} strokeWidth={3} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section card */}
        <View style={[styles.sectionCard, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.sectionTitle}>{section.name}</Text>

          {/* Checklist */}
          {Object.entries(section.checklist || {}).map(([key, checked]) => (
            <TouchableOpacity
              key={key}
              onPress={() => dispatch(toggleChecklistItem({ reportId, sectionId: section.id, key }))}
              style={[styles.checkItem, { backgroundColor: checked ? '#d1fae5' : lightColors.background }]}
            >
              {checked ? (
                <CheckCircle size={20} color="#10b981" strokeWidth={2.5} />
              ) : (
                <Circle size={20} color={lightColors.textSecondary} strokeWidth={2} />
              )}
              <Text style={[styles.checkLabel, { color: checked ? '#065f46' : lightColors.textPrimary }]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Score slider for scoring report types */}
          {meta.supportsScore && (
            <View style={styles.scoreSection}>
              <Text style={styles.notesLabel}>
                Section Score: {section.score !== null ? `${section.score}/100` : 'Not set'}
              </Text>
              <View style={styles.scoreRow}>
                {[0, 25, 50, 75, 100].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.scoreBtn,
                      { backgroundColor: section.score === val ? (meta.color || lightColors.primary) : lightColors.background },
                    ]}
                    onPress={() => dispatch(setSectionScore({ reportId, sectionId: section.id, score: val }))}
                  >
                    <Text style={[styles.scoreBtnText, { color: section.score === val ? '#fff' : lightColors.textPrimary }]}>
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Notes */}
          <Text style={styles.notesLabel}>Notes / Observations</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) =>
              dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))
            }
            placeholder="Add observations, findings, or notes..."
            style={styles.notesInput}
            placeholderTextColor={lightColors.textSecondary}
            multiline
          />

          {/* Photos */}
          <Text style={styles.notesLabel}>Photos ({section.photos?.length || 0})</Text>
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
                    onPress={() =>
                      dispatch(removePhotoFromSection({ reportId, sectionId: section.id, photoIndex: index }))
                    }
                  >
                    <X size={13} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              )}
              style={{ marginBottom: spacing.sm }}
            />
          )}

          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: meta.color || lightColors.primary }]}
              onPress={handleAddPhoto}
            >
              <Camera size={16} color="#fff" strokeWidth={2} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: '#6B7280' }]}
              onPress={handlePickPhoto}
            >
              <FileText size={16} color="#fff" strokeWidth={2} />
              <Text style={styles.photoBtnText}>Library</Text>
            </TouchableOpacity>
          </View>

          {/* Mark section complete */}
          {!section.complete && (
            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: meta.color || lightColors.primary }]}
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

        {/* Action buttons */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: meta.color || lightColors.primary }]}
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

        {allComplete && report.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
            onPress={() => {
              dispatch(markReportComplete({ reportId }));
              Alert.alert('Complete', 'Report marked as completed!');
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
  notFound: { padding: spacing.md, color: lightColors.error },

  header: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  typeText: { fontSize: 12, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },

  title: { fontSize: 18, fontWeight: '700', color: lightColors.textPrimary, marginBottom: 2 },
  meta: { fontSize: 12, color: lightColors.textSecondary, marginBottom: spacing.sm },
  progressBar: { height: 6, backgroundColor: lightColors.border, borderRadius: 3, marginBottom: spacing.xs },
  progressFill: { height: 6, borderRadius: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: 11, color: lightColors.textSecondary },
  scoreChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  scoreText: { fontSize: 11, fontWeight: '700', color: '#92400e' },

  tabs: { marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, marginRight: spacing.sm, borderWidth: 1 },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tabText: { fontWeight: '600', fontSize: 12 },

  sectionCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.md },

  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, borderRadius: radius.sm, marginBottom: spacing.xs, minHeight: 44 },
  checkLabel: { flex: 1, fontSize: 14 },

  scoreSection: { marginTop: spacing.md, marginBottom: spacing.sm },
  scoreRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  scoreBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: lightColors.border },
  scoreBtnText: { fontSize: 13, fontWeight: '600' },

  notesLabel: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  notesInput: {
    borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: 13, color: lightColors.textPrimary, minHeight: 80,
    backgroundColor: lightColors.background, textAlignVertical: 'top',
  },

  photoWrap: { position: 'relative', marginRight: spacing.sm },
  photo: { width: 110, height: 110, borderRadius: radius.md },
  removePhoto: {
    position: 'absolute', top: -8, right: -8, backgroundColor: lightColors.error,
    borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  photoButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  completeBtnText: { color: '#fff', fontWeight: '600' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, justifyContent: 'center' },
  completedText: { color: '#10b981', fontWeight: '600', fontSize: 14 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
