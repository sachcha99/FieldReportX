import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectAllReports } from '../store/slices/reportsSlice';
import { selectAllRentalReports } from '../store/slices/rentalsSlice';
import { GitCompare, CheckCircle, Circle, ArrowRight } from 'lucide-react-native';
import { lightColors, spacing, radius } from '../theme/tokens';

const TYPE_LABELS = {
  rental: 'Rental Inspection',
  trades: 'Trades Report',
  legal: 'Legal & Forensic',
  driving: 'Driving Assessment',
  rehab: 'Patient Rehabilitation',
  general: 'General Report',
  service: 'Service Delivery',
};

export default function ReportComparisonScreen({ navigation }) {
  const genericReports = useSelector(selectAllReports);
  const rentalReports = useSelector(selectAllRentalReports);

  // Tag each report with its kind so we can filter by same type
  const allReports = [
    ...rentalReports.map((r) => ({ ...r, _kind: 'rental' })),
    ...genericReports.map((r) => ({ ...r, _kind: r.type || 'general' })),
  ];

  const [leftId, setLeftId] = useState(null);
  const [rightId, setRightId] = useState(null);
  const [step, setStep] = useState('pickLeft'); // 'pickLeft' | 'pickRight' | 'compare'

  const leftReport = allReports.find((r) => r.id === leftId);
  const rightReport = allReports.find((r) => r.id === rightId);

  const handlePickLeft = (id) => {
    setLeftId(id);
    setRightId(null);
    setStep('pickRight');
  };

  const handlePickRight = (id) => {
    setRightId(id);
    setStep('compare');
  };

  const reset = () => {
    setLeftId(null);
    setRightId(null);
    setStep('pickLeft');
  };

  if (step === 'pickLeft' || step === 'pickRight') {
    // On pickRight, only show reports of the same type as the first pick
    const candidates = step === 'pickLeft'
      ? allReports
      : allReports.filter((r) => r.id !== leftId && r._kind === leftReport?._kind);

    const kindLabel = leftReport ? (TYPE_LABELS[leftReport._kind] || leftReport._kind) : '';

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <GitCompare size={22} color={lightColors.primary} strokeWidth={2} />
            <Text style={styles.heading}>Compare Reports</Text>
          </View>
          <Text style={styles.subheading}>
            {step === 'pickLeft'
              ? 'Select the first report to compare'
              : `Select a second ${kindLabel} report to compare with "${leftReport?.title}"`}
          </Text>

          {step === 'pickRight' && candidates.length === 0 ? (
            <View style={styles.empty}>
              <GitCompare size={48} color={lightColors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No other reports of this type</Text>
              <Text style={styles.emptyText}>
                You need at least 2 {kindLabel} reports to compare. Create another one first.
              </Text>
              <TouchableOpacity style={[styles.resetBtn, { backgroundColor: lightColors.primary, marginTop: spacing.lg }]} onPress={reset}>
                <Text style={styles.resetBtnText}>Start Over</Text>
              </TouchableOpacity>
            </View>
          ) : allReports.length < 2 ? (
            <View style={styles.empty}>
              <GitCompare size={48} color={lightColors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Not enough reports</Text>
              <Text style={styles.emptyText}>You need at least 2 reports to compare. Create more reports first.</Text>
            </View>
          ) : (
            candidates.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={[styles.reportCard, { backgroundColor: lightColors.surface }]}
                onPress={() => step === 'pickLeft' ? handlePickLeft(report.id) : handlePickRight(report.id)}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.kindBadge}>
                    <Text style={styles.kindBadgeText}>{TYPE_LABELS[report._kind] || report._kind}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{report.title}</Text>
                  <Text style={styles.cardMeta}>
                    {new Date(report.createdAt).toLocaleDateString('en-AU')} • {report.status || 'draft'}
                  </Text>
                </View>
                <ArrowRight size={20} color={lightColors.primary} strokeWidth={2} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Comparison view ──────────────────────────────────────────────────────────
  const isRental = leftReport?._kind === 'rental';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <GitCompare size={22} color={lightColors.primary} strokeWidth={2} />
          <Text style={styles.heading}>Report Comparison</Text>
        </View>

        {/* Type badge */}
        <View style={styles.typeBadgeRow}>
          <Text style={styles.typeBadgeText}>{TYPE_LABELS[leftReport?._kind] || leftReport?._kind}</Text>
        </View>

        {/* Titles row */}
        <View style={styles.compareHeader}>
          <View style={[styles.compareTitle, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.compareTitleText} numberOfLines={2}>{leftReport?.title}</Text>
            <Text style={styles.compareDateText}>{new Date(leftReport?.createdAt).toLocaleDateString('en-AU')}</Text>
          </View>
          <View style={styles.vsBox}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={[styles.compareTitle, { backgroundColor: '#fce7f3' }]}>
            <Text style={styles.compareTitleText} numberOfLines={2}>{rightReport?.title}</Text>
            <Text style={styles.compareDateText}>{new Date(rightReport?.createdAt).toLocaleDateString('en-AU')}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: lightColors.surface }]}>
          <CompareStatCell
            label="Status"
            left={leftReport?.status || '—'}
            right={rightReport?.status || '—'}
          />
          {isRental && (
            <CompareStatCell
              label="Sections"
              left={`${leftReport?.sections?.filter((s) => s.complete).length ?? 0}/${leftReport?.sections?.length ?? 0}`}
              right={`${rightReport?.sections?.filter((s) => s.complete).length ?? 0}/${rightReport?.sections?.length ?? 0}`}
            />
          )}
          <CompareStatCell
            label="Created by"
            left={leftReport?.createdBy || '—'}
            right={rightReport?.createdBy || '—'}
          />
        </View>

        {isRental ? (
          // ── Rental: section-by-section checklist comparison ──────────────────
          <>
            <Text style={styles.sectionCompareTitle}>Section Comparison</Text>
            {(leftReport?.sections || []).map((leftSec, idx) => {
              const rightSec = rightReport?.sections?.[idx];
              const leftChecked = Object.values(leftSec.checklist || {}).filter(Boolean).length;
              const leftTotal = Object.keys(leftSec.checklist || {}).length;
              const rightChecked = rightSec ? Object.values(rightSec.checklist || {}).filter(Boolean).length : 0;
              const rightTotal = rightSec ? Object.keys(rightSec.checklist || {}).length : 0;

              return (
                <View key={leftSec.id} style={[styles.sectionCompareCard, { backgroundColor: lightColors.surface }]}>
                  <Text style={styles.sectionCompareLabel}>{leftSec.name}</Text>
                  <View style={styles.sectionCompareRow}>
                    <View style={[styles.sectionCompareHalf, { backgroundColor: leftSec.complete ? '#d1fae5' : '#fee2e2' }]}>
                      {leftSec.complete
                        ? <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />
                        : <Circle size={16} color="#ef4444" strokeWidth={2} />}
                      <Text style={styles.sectionCompareValue}>{leftChecked}/{leftTotal}</Text>
                      <Text style={styles.sectionCompareStatus}>{leftSec.complete ? 'Done' : 'Pending'}</Text>
                    </View>
                    <View style={[styles.sectionCompareHalf, { backgroundColor: rightSec?.complete ? '#d1fae5' : rightSec ? '#fee2e2' : '#f3f4f6' }]}>
                      {rightSec
                        ? rightSec.complete
                          ? <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />
                          : <Circle size={16} color="#ef4444" strokeWidth={2} />
                        : <Circle size={16} color="#ccc" strokeWidth={2} />}
                      <Text style={styles.sectionCompareValue}>{rightSec ? `${rightChecked}/${rightTotal}` : '—'}</Text>
                      <Text style={styles.sectionCompareStatus}>{rightSec?.complete ? 'Done' : rightSec ? 'Pending' : 'N/A'}</Text>
                    </View>
                  </View>

                  {(leftSec.conditionNotes || rightSec?.conditionNotes) && (
                    <View style={styles.notesDiff}>
                      <View style={styles.notesDiffHalf}>
                        <Text style={styles.notesDiffLabel}>Notes:</Text>
                        <Text style={styles.notesDiffText} numberOfLines={3}>{leftSec.conditionNotes || 'No notes'}</Text>
                      </View>
                      <View style={styles.notesDiffHalf}>
                        <Text style={styles.notesDiffLabel}>Notes:</Text>
                        <Text style={styles.notesDiffText} numberOfLines={3}>{rightSec?.conditionNotes || 'No notes'}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.photoCounts}>
                    <Text style={styles.photoCountText}>{leftSec.photos?.length || 0} photo{(leftSec.photos?.length || 0) !== 1 ? 's' : ''}</Text>
                    <Text style={styles.photoCountSep}>|</Text>
                    <Text style={styles.photoCountText}>{rightSec?.photos?.length || 0} photo{(rightSec?.photos?.length || 0) !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          // ── Generic: metadata field comparison ───────────────────────────────
          <>
            <Text style={styles.sectionCompareTitle}>Field Comparison</Text>
            {(() => {
              const leftMeta = leftReport?.metadata || {};
              const rightMeta = rightReport?.metadata || {};
              const keys = Array.from(new Set([...Object.keys(leftMeta), ...Object.keys(rightMeta)])).filter(
                (k) => k !== 'recurring'
              );

              if (keys.length === 0) {
                return (
                  <View style={[styles.sectionCompareCard, { backgroundColor: lightColors.surface }]}>
                    <Text style={styles.noFieldsText}>No additional fields to compare.</Text>
                  </View>
                );
              }

              return keys.map((key) => {
                const leftVal = String(leftMeta[key] ?? '—');
                const rightVal = String(rightMeta[key] ?? '—');
                const differs = leftVal !== rightVal;
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                return (
                  <View key={key} style={[styles.fieldCompareCard, { backgroundColor: lightColors.surface }, differs && styles.fieldCompareDiffers]}>
                    <Text style={styles.fieldCompareKey}>{label}</Text>
                    <View style={styles.sectionCompareRow}>
                      <View style={[styles.fieldCompareHalf, { backgroundColor: '#dbeafe' }]}>
                        <Text style={styles.fieldCompareVal}>{leftVal}</Text>
                      </View>
                      <View style={[styles.fieldCompareHalf, { backgroundColor: '#fce7f3' }]}>
                        <Text style={styles.fieldCompareVal}>{rightVal}</Text>
                      </View>
                    </View>
                    {differs && <Text style={styles.differsBadge}>Different</Text>}
                  </View>
                );
              });
            })()}
          </>
        )}

        <TouchableOpacity style={[styles.resetBtn, { backgroundColor: lightColors.primary }]} onPress={reset}>
          <GitCompare size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.resetBtnText}>Compare Different Reports</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function CompareStatCell({ label, left, right }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statCellLabel}>{label}</Text>
      <View style={styles.statCellValues}>
        <Text style={styles.statCellLeft} numberOfLines={1}>{left}</Text>
        <Text style={styles.statCellSep}>|</Text>
        <Text style={styles.statCellRight} numberOfLines={1}>{right}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  heading: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary },
  subheading: { fontSize: 13, color: lightColors.textSecondary, marginBottom: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: lightColors.textPrimary, marginTop: spacing.md },
  emptyText: { fontSize: 13, color: lightColors.textSecondary, textAlign: 'center', marginTop: spacing.sm },

  reportCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: lightColors.textPrimary, marginTop: 4 },
  cardMeta: { fontSize: 12, color: lightColors.textSecondary, marginTop: 2 },
  kindBadge: { alignSelf: 'flex-start', backgroundColor: lightColors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  kindBadgeText: { fontSize: 11, fontWeight: '600', color: lightColors.primary },

  typeBadgeRow: { alignSelf: 'flex-start', backgroundColor: lightColors.primary + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: spacing.md },
  typeBadgeText: { fontSize: 12, fontWeight: '600', color: lightColors.primary },

  compareHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  compareTitle: { flex: 1, padding: spacing.sm, borderRadius: radius.md },
  compareTitleText: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary },
  compareDateText: { fontSize: 11, color: lightColors.textSecondary, marginTop: 2 },
  vsBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: lightColors.primary, justifyContent: 'center', alignItems: 'center' },
  vsText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  statsRow: { flexDirection: 'row', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  statCell: { flex: 1, alignItems: 'center' },
  statCellLabel: { fontSize: 11, color: lightColors.textSecondary, marginBottom: 4 },
  statCellValues: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statCellLeft: { fontSize: 12, fontWeight: '600', color: '#2563eb', maxWidth: 60 },
  statCellSep: { fontSize: 13, color: lightColors.textSecondary },
  statCellRight: { fontSize: 12, fontWeight: '600', color: '#db2777', maxWidth: 60 },

  sectionCompareTitle: { fontSize: 16, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.sm },
  sectionCompareCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  sectionCompareLabel: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.sm },
  sectionCompareRow: { flexDirection: 'row', gap: spacing.xs },
  sectionCompareHalf: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', gap: 4 },
  sectionCompareValue: { fontSize: 14, fontWeight: '700', color: lightColors.textPrimary },
  sectionCompareStatus: { fontSize: 11, color: lightColors.textSecondary },
  notesDiff: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  notesDiffHalf: { flex: 1 },
  notesDiffLabel: { fontSize: 10, fontWeight: '600', color: lightColors.textSecondary },
  notesDiffText: { fontSize: 12, color: lightColors.textPrimary, marginTop: 2 },
  photoCounts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  photoCountText: { fontSize: 11, color: lightColors.textSecondary },
  photoCountSep: { color: lightColors.border },

  fieldCompareCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  fieldCompareDiffers: { borderWidth: 1, borderColor: '#f59e0b' },
  fieldCompareKey: { fontSize: 12, fontWeight: '600', color: lightColors.textSecondary, marginBottom: spacing.xs },
  fieldCompareHalf: { flex: 1, padding: spacing.sm, borderRadius: radius.sm },
  fieldCompareVal: { fontSize: 13, color: lightColors.textPrimary, fontWeight: '500' },
  differsBadge: { fontSize: 10, fontWeight: '700', color: '#f59e0b', marginTop: spacing.xs, textTransform: 'uppercase' },
  noFieldsText: { fontSize: 13, color: lightColors.textSecondary, textAlign: 'center', paddingVertical: spacing.md },

  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  resetBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
