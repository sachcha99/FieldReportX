import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { CheckCircle, User, UserCheck, Clock } from 'lucide-react-native';
import { selectReportById, saveSignOff, markReportComplete as markGenericComplete } from '../store/slices/reportsSlice';
import { selectRentalReportById, markReportComplete as markRentalComplete } from '../store/slices/rentalsSlice';
import { lightColors, spacing, radius } from '../theme/tokens';

export default function SignOffScreen({ route, navigation }) {
  const { reportId, reportType } = route.params;
  const dispatch = useDispatch();

  const genericReport = useSelector(selectReportById(reportId));
  const rentalReport = useSelector(selectRentalReportById(reportId));
  const report = genericReport || rentalReport;

  const [userSig, setUserSig] = useState('');
  const [supervisorSig, setSupervisorSig] = useState('');

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const existingSignOff = report.signOff;
  const alreadySigned = existingSignOff?.approvedAt;

  const handleSignOff = () => {
    if (!userSig.trim()) {
      Alert.alert('Required', 'Please enter your name to sign off.');
      return;
    }
    if (genericReport) {
      dispatch(
        saveSignOff({
          reportId,
          userSignature: userSig.trim(),
          supervisorSignature: supervisorSig.trim() || null,
        })
      );
      dispatch(markGenericComplete({ reportId }));
    } else {
      dispatch(markRentalComplete({ reportId }));
    }
    Alert.alert(
      'Signed Off',
      `Report signed by: ${userSig.trim()}${supervisorSig.trim() ? `\nSupervisor: ${supervisorSig.trim()}` : ''}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Digital Sign-Off</Text>
        <Text style={styles.subheading}>Provide signatures to approve and finalise this report</Text>

        {/* Report Summary */}
        <View style={[styles.summaryBox, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.summaryTitle}>{report.title}</Text>
          <Text style={styles.summaryMeta}>
            {report.sections?.length || 0} sections •{' '}
            {report.sections?.filter((s) => s.complete).length || 0} completed
          </Text>
          {report.createdAt && (
            <View style={styles.summaryRow}>
              <Clock size={13} color={lightColors.textSecondary} strokeWidth={2} />
              <Text style={styles.summaryTime}>
                Created: {new Date(report.createdAt).toLocaleDateString('en-AU')}
              </Text>
            </View>
          )}
          {report.checksum && (
            <Text style={styles.checksum}>Checksum: {report.checksum}</Text>
          )}
        </View>

        {/* Existing sign-off display */}
        {alreadySigned && (
          <View style={[styles.signedBox, { backgroundColor: '#d1fae5' }]}>
            <CheckCircle size={18} color="#10b981" strokeWidth={2.5} />
            <View style={{ flex: 1 }}>
              <Text style={styles.signedLabel}>Report Already Signed Off</Text>
              <Text style={styles.signedDate}>
                {new Date(existingSignOff.approvedAt).toLocaleString('en-AU')}
              </Text>
              {existingSignOff.userSignature && (
                <Text style={styles.signedBy}>By: {existingSignOff.userSignature}</Text>
              )}
              {existingSignOff.supervisorSignature && (
                <Text style={styles.signedBy}>Supervisor: {existingSignOff.supervisorSignature}</Text>
              )}
            </View>
          </View>
        )}

        {/* User Signature */}
        <View style={styles.sigSection}>
          <View style={styles.sigHeader}>
            <User size={18} color={lightColors.primary} strokeWidth={2} />
            <Text style={styles.sigTitle}>Reporter / Inspector Signature</Text>
          </View>
          <Text style={styles.sigInstructions}>
            Type your full name as your digital signature
          </Text>
          <TextInput
            value={userSig}
            onChangeText={setUserSig}
            placeholder="Full name (required)"
            style={[styles.sigInput, { borderColor: lightColors.primary }]}
            placeholderTextColor={lightColors.textSecondary}
          />
        </View>

        {/* Supervisor Signature */}
        <View style={styles.sigSection}>
          <View style={styles.sigHeader}>
            <UserCheck size={18} color="#6366F1" strokeWidth={2} />
            <Text style={[styles.sigTitle, { color: '#6366F1' }]}>Supervisor Sign-Off (Optional)</Text>
          </View>
          <Text style={styles.sigInstructions}>
            Supervisor or authorising officer's full name
          </Text>
          <TextInput
            value={supervisorSig}
            onChangeText={setSupervisorSig}
            placeholder="Supervisor name (optional)"
            style={[styles.sigInput, { borderColor: '#6366F1' }]}
            placeholderTextColor={lightColors.textSecondary}
          />
        </View>

        {/* Approval info */}
        <View style={[styles.infoBox, { backgroundColor: '#fef3c7' }]}>
          <Text style={styles.infoText}>
            By signing off, you confirm that the information in this report is accurate and complete.
            The sign-off will be timestamped automatically.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.signButton, { backgroundColor: userSig.trim() ? '#10b981' : '#ccc' }]}
          onPress={handleSignOff}
          disabled={!userSig.trim()}
        >
          <CheckCircle size={20} color="#fff" strokeWidth={2.5} />
          <Text style={styles.signButtonText}>
            {alreadySigned ? 'Re-Sign Report' : 'Sign & Approve Report'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.xs },
  subheading: { fontSize: 13, color: lightColors.textSecondary, marginBottom: spacing.lg },

  summaryBox: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.xs },
  summaryMeta: { fontSize: 12, color: lightColors.textSecondary, marginBottom: spacing.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  summaryTime: { fontSize: 12, color: lightColors.textSecondary },
  checksum: { fontSize: 10, color: lightColors.textSecondary, marginTop: spacing.xs, fontFamily: 'monospace' },

  signedBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, alignItems: 'flex-start' },
  signedLabel: { fontSize: 13, fontWeight: '600', color: '#065f46' },
  signedDate: { fontSize: 12, color: '#065f46', marginTop: 2 },
  signedBy: { fontSize: 12, color: '#065f46', marginTop: 1 },

  sigSection: { marginBottom: spacing.lg },
  sigHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sigTitle: { fontSize: 15, fontWeight: '600', color: lightColors.textPrimary },
  sigInstructions: { fontSize: 12, color: lightColors.textSecondary, marginBottom: spacing.sm },
  sigInput: {
    borderWidth: 2, borderRadius: radius.md, padding: spacing.md,
    fontSize: 16, color: lightColors.textPrimary, minHeight: 52,
    backgroundColor: lightColors.surface, fontStyle: 'italic',
  },

  infoBox: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  infoText: { fontSize: 13, color: '#92400e', lineHeight: 18 },

  signButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md,
    minHeight: 52, marginBottom: spacing.md,
  },
  signButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelButton: { alignItems: 'center', paddingVertical: spacing.md },
  cancelButtonText: { color: lightColors.textSecondary, fontSize: 14 },
});
