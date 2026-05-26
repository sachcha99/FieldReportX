import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { FileText, Share2, RefreshCw, CheckCircle, Star } from 'lucide-react-native';
import { selectReportById, selectOverallScore, setReportPdfUri, TYPE_META } from '../store/slices/reportsSlice';
import { generateGenericReportPdf, shareReportPdf } from '../services/pdfService';
import { lightColors, spacing, radius } from '../theme/tokens';

export default function GenericReportPdfScreen({ route }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const overallScore = useSelector(selectOverallScore(reportId));
  const [loading, setLoading] = useState(false);

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const meta = TYPE_META[report.type] || {};
  const completedSections = report.sections.filter((s) => s.complete).length;
  const totalPhotos = report.sections.reduce((sum, s) => sum + (s.photos?.length || 0), 0);
  const totalAudio = report.sections.reduce((sum, s) => sum + (s.audioNotes?.length || 0), 0);

  const handleGeneratePdf = async () => {
    setLoading(true);
    try {
      const uri = await generateGenericReportPdf(report);
      dispatch(setReportPdfUri({ reportId, pdfUri: uri }));
      Alert.alert('Success', 'PDF generated successfully');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!report.pdfUri) {
      Alert.alert('No PDF', 'Please generate PDF first');
      return;
    }
    try {
      await shareReportPdf(report.pdfUri);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Generate Report PDF</Text>

        {/* Report info */}
        <View style={[styles.infoBox, { backgroundColor: lightColors.surface }]}>
          <View style={[styles.typePill, { backgroundColor: (meta.color || lightColors.primary) + '20' }]}>
            <Text style={[styles.typeText, { color: meta.color || lightColors.primary }]}>
              {meta.label || report.type}
            </Text>
          </View>
          <Text style={styles.infoTitle}>{report.title}</Text>
          <Text style={styles.infoMeta}>By: {report.createdBy}</Text>
          <Text style={styles.infoMeta}>Created: {new Date(report.createdAt).toLocaleDateString('en-AU')}</Text>
          {report.metadata?.caseNumber && <Text style={styles.infoMeta}>Case #: {report.metadata.caseNumber}</Text>}
          {report.metadata?.driverName && <Text style={styles.infoMeta}>Driver: {report.metadata.driverName}</Text>}
          {report.metadata?.patientId && <Text style={styles.infoMeta}>Patient: {report.metadata.patientId}</Text>}
        </View>

        {/* Stats */}
        <View style={[styles.statsBox, { backgroundColor: '#d1fae5' }]}>
          <View style={styles.statsHeader}>
            <CheckCircle size={16} color="#065f46" strokeWidth={2.5} />
            <Text style={styles.statLabel}>Report Summary</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatItem label="Sections" value={`${completedSections}/${report.sections.length}`} />
            <StatItem label="Photos" value={String(totalPhotos)} />
            {totalAudio > 0 && <StatItem label="Audio Notes" value={String(totalAudio)} />}
            {overallScore !== null && (
              <View style={styles.statItem}>
                <Star size={14} color="#F59E0B" strokeWidth={2.5} />
                <Text style={styles.statValue}>{overallScore}/100</Text>
                <Text style={styles.statSubLabel}>Score</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sign-off status */}
        {report.signOff?.approvedAt && (
          <View style={[styles.signOffBox, { backgroundColor: '#dbeafe' }]}>
            <CheckCircle size={14} color="#2563eb" strokeWidth={2.5} />
            <View>
              <Text style={styles.signOffLabel}>Signed off by: {report.signOff.userSignature}</Text>
              {report.signOff.supervisorSignature && (
                <Text style={styles.signOffLabel}>Supervisor: {report.signOff.supervisorSignature}</Text>
              )}
              <Text style={styles.signOffDate}>{new Date(report.signOff.approvedAt).toLocaleString('en-AU')}</Text>
            </View>
          </View>
        )}

        <Text style={styles.description}>
          PDF will include all sections, checklists, notes, photo references
          {totalAudio > 0 ? ', audio evidence log' : ''}
          {report.sensorData ? ', sensor performance data' : ''}
          {report.gpsRoute?.length > 0 ? ', GPS route summary' : ''}
          {report.signOff?.approvedAt ? ', and digital sign-off' : ''}.
        </Text>

        {!report.pdfUri ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: meta.color || lightColors.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleGeneratePdf}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FileText size={18} color="#fff" strokeWidth={2} />
                <Text style={styles.buttonText}>Generate PDF</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.button, { backgroundColor: meta.color || lightColors.primary }]} onPress={handleShare}>
              <Share2 size={18} color="#fff" strokeWidth={2} />
              <Text style={styles.buttonText}>Share PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: lightColors.textSecondary }]} onPress={handleGeneratePdf} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <RefreshCw size={18} color="#fff" strokeWidth={2} />
                  <Text style={styles.buttonText}>Re-Generate PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.lg },
  infoBox: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 4, marginBottom: spacing.sm },
  typeText: { fontSize: 11, fontWeight: '700' },
  infoTitle: { fontSize: 16, fontWeight: '600', color: lightColors.textPrimary },
  infoMeta: { fontSize: 13, color: lightColors.textSecondary, marginTop: spacing.xs },
  statsBox: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  statLabel: { fontSize: 14, fontWeight: '600', color: '#065f46' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#065f46' },
  statSubLabel: { fontSize: 12, color: '#065f46' },
  signOffBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  signOffLabel: { fontSize: 13, fontWeight: '600', color: '#1e40af' },
  signOffDate: { fontSize: 11, color: '#3b82f6', marginTop: 2 },
  description: { fontSize: 13, color: lightColors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md,
    minHeight: 48, marginBottom: spacing.md,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
