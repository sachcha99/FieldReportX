import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { BarChart2, TrendingUp, PieChart } from 'lucide-react-native';
import { selectReportById, TYPE_META } from '../store/slices/reportsSlice';
import { selectRentalReportById } from '../store/slices/rentalsSlice';
import { BarChart, LineChart, DonutChart } from '../components/ReportChart';
import { lightColors, spacing, radius } from '../theme/tokens';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - spacing.md * 4;

const SECTION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function ReportChartsScreen({ route }) {
  const { reportId, reportType } = route.params;

  const genericReport = useSelector(selectReportById(reportId));
  const rentalReport = useSelector(selectRentalReportById(reportId));
  const report = reportType === 'rental' ? rentalReport : genericReport;

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: spacing.md, color: lightColors.error }}>Report not found.</Text>
      </SafeAreaView>
    );
  }

  const meta = TYPE_META[report.type] || { color: lightColors.primary, label: report.type };
  const accentColor = meta.color || lightColors.primary;

  const sections = report.sections || [];

  // ── Bar chart: section completion ──────────────────────────────────
  const completionData = sections.map((s, i) => ({
    label: s.name.split(' ')[0],
    value: s.complete ? 100 : Math.round(
      (Object.values(s.checklist || {}).filter(Boolean).length / Math.max(Object.keys(s.checklist || {}).length, 1)) * 100
    ),
    color: s.complete ? '#10b981' : SECTION_COLORS[i % SECTION_COLORS.length],
  }));

  // ── Bar chart: photos per section ──────────────────────────────────
  const photoData = sections.map((s, i) => ({
    label: s.name.split(' ')[0],
    value: s.photos?.length || 0,
    color: SECTION_COLORS[i % SECTION_COLORS.length],
  }));

  // ── Donut: checklist status ─────────────────────────────────────────
  let totalChecked = 0, totalUnchecked = 0;
  sections.forEach((s) => {
    const items = Object.values(s.checklist || {});
    totalChecked += items.filter(Boolean).length;
    totalUnchecked += items.filter((v) => !v).length;
  });
  const checklistDonut = [
    { label: 'Done', value: totalChecked, color: '#10b981' },
    { label: 'Pending', value: totalUnchecked, color: '#f3f4f6' },
  ];

  // ── Donut: section status ──────────────────────────────────────────
  const doneCount = sections.filter((s) => s.complete).length;
  const pendingCount = sections.length - doneCount;
  const sectionDonut = [
    { label: 'Complete', value: doneCount, color: accentColor },
    { label: 'Pending', value: pendingCount, color: '#e5e7eb' },
  ];

  // ── Line chart: scores per section (if scoring enabled) ────────────
  const scoredSections = sections.filter((s) => s.score !== null);
  const scoreData = scoredSections.map((s, i) => ({
    label: s.name.split(' ')[0],
    value: s.score ?? 0,
  }));

  // ── Sensor line chart: accelerometer magnitude over time ─────────
  const accelSamples = report.sensorData?.samples;
  const accelData = accelSamples && accelSamples.length > 1
    ? accelSamples
        .filter((_, i) => i % Math.ceil(accelSamples.length / 20) === 0)
        .map((s, i) => ({
          label: `${i + 1}`,
          value: parseFloat((Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2)).toFixed(2)),
        }))
    : null;

  // ── GPS speed line chart ───────────────────────────────────────────
  const gpsRoute = report.gpsRoute || [];
  const speedData = gpsRoute.length > 1
    ? gpsRoute
        .filter((p) => p.speed != null)
        .filter((_, i) => i % Math.ceil(gpsRoute.length / 20) === 0)
        .map((p, i) => ({
          label: `${i + 1}`,
          value: parseFloat((p.speed * 3.6).toFixed(1)),
        }))
    : null;

  // ── Audio notes total ──────────────────────────────────────────────
  const audioData = sections
    .filter((s) => s.audioNotes?.length > 0)
    .map((s, i) => ({
      label: s.name.split(' ')[0],
      value: s.audioNotes.length,
      color: SECTION_COLORS[i % SECTION_COLORS.length],
    }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: accentColor }]}>
          <BarChart2 size={20} color="#fff" strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{report.title}</Text>
            <Text style={styles.headerSub}>{meta.label || 'Report'} — Analytics</Text>
          </View>
        </View>

        {/* Summary stats */}
        <View style={[styles.statsRow, { backgroundColor: lightColors.surface }]}>
          {[
            { label: 'Sections', value: sections.length },
            { label: 'Complete', value: doneCount },
            { label: 'Photos', value: sections.reduce((s, r) => s + (r.photos?.length || 0), 0) },
            { label: 'Checklist %', value: totalChecked + totalUnchecked > 0 ? `${Math.round((totalChecked / (totalChecked + totalUnchecked)) * 100)}%` : '—' },
          ].map((s, i) => (
            <View key={i} style={styles.statCell}>
              <Text style={[styles.statValue, { color: accentColor }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Section completion bar chart */}
        <View style={[styles.card, { backgroundColor: lightColors.surface }]}>
          <View style={styles.cardHeader}>
            <BarChart2 size={16} color={accentColor} strokeWidth={2} />
            <Text style={styles.cardTitle}>Section Completion (%)</Text>
          </View>
          <BarChart data={completionData} width={CHART_W} height={180} color={accentColor} />
        </View>

        {/* Donut charts */}
        <View style={styles.donutRow}>
          <View style={[styles.donutCard, { backgroundColor: lightColors.surface }]}>
            <View style={styles.cardHeader}>
              <PieChart size={14} color={accentColor} strokeWidth={2} />
              <Text style={styles.cardTitle}>Sections</Text>
            </View>
            <DonutChart data={sectionDonut} size={120} />
          </View>
          <View style={[styles.donutCard, { backgroundColor: lightColors.surface }]}>
            <View style={styles.cardHeader}>
              <PieChart size={14} color="#10b981" strokeWidth={2} />
              <Text style={styles.cardTitle}>Checklist</Text>
            </View>
            <DonutChart data={checklistDonut} size={120} />
          </View>
        </View>

        {/* Photos per section */}
        {photoData.some((d) => d.value > 0) && (
          <View style={[styles.card, { backgroundColor: lightColors.surface }]}>
            <View style={styles.cardHeader}>
              <BarChart2 size={16} color="#6366f1" strokeWidth={2} />
              <Text style={styles.cardTitle}>Photos per Section</Text>
            </View>
            <BarChart data={photoData} width={CHART_W} height={160} color="#6366f1" />
          </View>
        )}

        {/* Score line chart */}
        {scoreData.length >= 2 && (
          <View style={[styles.card, { backgroundColor: lightColors.surface }]}>
            <View style={styles.cardHeader}>
              <TrendingUp size={16} color="#f59e0b" strokeWidth={2} />
              <Text style={styles.cardTitle}>Section Scores</Text>
            </View>
            <LineChart data={scoreData} width={CHART_W} height={160} color="#f59e0b" />
          </View>
        )}

        {/* Accelerometer data */}
        {accelData && (
          <View style={[styles.card, { backgroundColor: lightColors.surface }]}>
            <View style={styles.cardHeader}>
              <TrendingUp size={16} color="#8b5cf6" strokeWidth={2} />
              <Text style={styles.cardTitle}>Accelerometer Magnitude (m/s²)</Text>
            </View>
            <LineChart data={accelData} width={CHART_W} height={160} color="#8b5cf6" />
          </View>
        )}

        {/* GPS speed */}
        {speedData && speedData.length >= 2 && (
          <View style={[styles.card, { backgroundColor: lightColors.surface }]}>
            <View style={styles.cardHeader}>
              <TrendingUp size={16} color="#10b981" strokeWidth={2} />
              <Text style={styles.cardTitle}>GPS Speed (km/h)</Text>
            </View>
            <LineChart data={speedData} width={CHART_W} height={160} color="#10b981" />
          </View>
        )}

        {/* Audio notes */}
        {audioData.length > 0 && (
          <View style={[styles.card, { backgroundColor: lightColors.surface }]}>
            <View style={styles.cardHeader}>
              <BarChart2 size={16} color="#f59e0b" strokeWidth={2} />
              <Text style={styles.cardTitle}>Audio Notes per Section</Text>
            </View>
            <BarChart data={audioData} width={CHART_W} height={140} color="#f59e0b" />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  statsRow: {
    flexDirection: 'row', borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.md,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, color: lightColors.textSecondary, marginTop: 2 },

  card: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  cardTitle: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary },

  donutRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  donutCard: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
});
