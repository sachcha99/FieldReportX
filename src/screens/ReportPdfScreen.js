import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { FileText, Share2, RefreshCw, CheckCircle } from 'lucide-react-native';
import { selectRentalReportById, setReportPdfUri } from '../store/slices/rentalsSlice';
import { generateReportPdf, shareReportPdf } from '../services/pdfService';
import { lightColors, spacing, radius } from '../theme/tokens';

export default function ReportPdfScreen({ route }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectRentalReportById(reportId));
  const [loading, setLoading] = useState(false);

  if (!report) return <SafeAreaView style={styles.container}><Text>Report not found</Text></SafeAreaView>;

  const handleGeneratePdf = async () => {
    setLoading(true);
    try {
      const uri = await generateReportPdf(report);
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

  const completedSections = report.sections.filter(s => s.complete).length;
  const totalPhotos = report.sections.reduce((sum, s) => sum + (s.photos?.length || 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Generate Report PDF</Text>

        <View style={[styles.infoBox, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.infoTitle}>{report.title}</Text>
          <Text style={styles.infoMeta}>{report.propertyAddress}</Text>
          <Text style={styles.infoMeta}>Inspector: {report.inspectorName}</Text>
        </View>

        <View style={[styles.statsBox, { backgroundColor: '#d1fae5' }]}>
          <View style={styles.statsHeader}>
            <CheckCircle size={18} color="#065f46" strokeWidth={2.5} />
            <Text style={styles.statLabel}>Report Ready</Text>
          </View>
          <Text style={styles.statValue}>{completedSections}/{report.sections.length} sections • {totalPhotos} photos</Text>
        </View>

        <Text style={styles.description}>
          The PDF will include all sections, checklists, condition notes, and section metadata. Perfect for sharing with property managers or archiving.
        </Text>

        {!report.pdfUri ? (
          <TouchableOpacity
            style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
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
            <TouchableOpacity style={styles.button} onPress={handleShare}>
              <Share2 size={18} color="#fff" strokeWidth={2} />
              <Text style={styles.buttonText}>Share PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: lightColors.textSecondary }]} onPress={handleGeneratePdf}>
              <RefreshCw size={18} color="#fff" strokeWidth={2} />
              <Text style={styles.buttonText}>Generate New PDF</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.lg },
  infoBox: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  infoTitle: { fontSize: 16, fontWeight: '600', color: lightColors.textPrimary },
  infoMeta: { fontSize: 13, color: lightColors.textSecondary, marginTop: spacing.xs },
  statsBox: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  statLabel: { fontSize: 13, fontWeight: '600', color: '#065f46' },
  statValue: { fontSize: 14, color: '#065f46', marginTop: spacing.xs },
  description: { fontSize: 14, color: lightColors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  button: { backgroundColor: lightColors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 48, marginBottom: spacing.md, flexDirection: 'row', gap: spacing.sm },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
