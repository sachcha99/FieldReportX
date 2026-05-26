import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MapPin, FileText, User, Tag } from 'lucide-react-native';
import { createReport, syncReport } from '../store/slices/reportsSlice';
import { selectCurrentUser } from '../store/slices/authSlice';
import { getCurrentLocation } from '../services/locationService';
import { scheduleReportReminder } from '../services/notificationService';
import { lightColors, spacing, radius } from '../theme/tokens';

const TYPE_CONFIG = {
  trades: {
    label: 'Trades Report',
    color: '#F59E0B',
    placeholder: 'e.g. Electrical Fault – 45 Oak St',
    fields: [
      { key: 'tradeType', label: 'Trade Type', placeholder: 'e.g. Electrician, Plumber, Fitter' },
      { key: 'clientName', label: 'Client Name', placeholder: 'Client or company name' },
      { key: 'jobNumber', label: 'Job / Work Order #', placeholder: 'Work order reference' },
    ],
  },
  legal: {
    label: 'Legal & Forensic Report',
    color: '#06B6D4',
    placeholder: 'e.g. Incident at 12 Pine Ave',
    fields: [
      { key: 'incidentType', label: 'Incident Type', placeholder: 'e.g. Forensic, Police, Civil' },
      { key: 'caseNumber', label: 'Case / Reference #', placeholder: 'Case reference number' },
      { key: 'agencyName', label: 'Agency / Organisation', placeholder: 'Reporting organisation' },
    ],
  },
  driving: {
    label: 'Driving Test Report',
    color: '#8B5CF6',
    placeholder: 'e.g. Ambulance Driver Assessment – John Smith',
    fields: [
      { key: 'driverName', label: 'Driver Name', placeholder: 'Driver full name' },
      { key: 'licenseNumber', label: 'License Number', placeholder: 'Driver license number' },
      { key: 'vehicleRego', label: 'Vehicle Registration', placeholder: 'e.g. ABC123' },
    ],
  },
  rehab: {
    label: 'Patient Rehabilitation Report',
    color: '#EC4899',
    placeholder: 'e.g. Knee Rehab – Session 3 – Patient A',
    fields: [
      { key: 'patientId', label: 'Patient ID / Name', placeholder: 'Patient identifier' },
      { key: 'sessionNumber', label: 'Session Number', placeholder: 'e.g. 1, 2, 3…' },
      { key: 'bodyPart', label: 'Body Part / Condition', placeholder: 'e.g. Left Knee, Shoulder' },
    ],
  },
  general: {
    label: 'General Report',
    color: '#6366F1',
    placeholder: 'e.g. Site Visit Notes – April',
    fields: [
      { key: 'subject', label: 'Subject', placeholder: 'Report subject' },
      { key: 'category', label: 'Category', placeholder: 'e.g. Journal, Sport, Hobby' },
    ],
  },
  service: {
    label: 'Service Delivery Report',
    color: '#10B981',
    placeholder: 'e.g. Delivery Run – 2 Jun',
    fields: [
      { key: 'driverName', label: 'Driver Name', placeholder: 'Driver name' },
      { key: 'vehicleId', label: 'Vehicle / Route ID', placeholder: 'Vehicle or route identifier' },
      { key: 'clientOrganisation', label: 'Client / Organisation', placeholder: 'Client name' },
    ],
  },
};

export default function CreateReportScreen({ route, navigation }) {
  const { reportType } = route.params;
  const config = TYPE_CONFIG[reportType];
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  const [title, setTitle] = useState('');
  const [createdBy, setCreatedBy] = useState(
    currentUser?.displayName || currentUser?.email || ''
  );
  const [extraFields, setExtraFields] = useState({});
  const [gpsLocation, setGpsLocation] = useState(null);
  const [loadingGps, setLoadingGps] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await getCurrentLocation();
      if (result.ok) setGpsLocation(result.data);
      setLoadingGps(false);
    })();
  }, []);

  const setField = (key, value) =>
    setExtraFields((prev) => ({ ...prev, [key]: value }));

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a report title');
      return;
    }
    if (!createdBy.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    const action = dispatch(
      createReport({
        type: reportType,
        title: title.trim(),
        createdBy: createdBy.trim(),
        userId: currentUser?.uid || null,
        metadata: extraFields,
        gpsLocation,
      })
    );

    // Auto-sync to Firestore immediately after creation
    dispatch(syncReport(action.payload.id));

    scheduleReportReminder(title.trim(), 3600).catch(() => {});

    navigation.goBack();
  };

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Unknown report type: {reportType}</Text>
      </SafeAreaView>
    );
  }

  const isValid = title.trim() && createdBy.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.typeBadge, { backgroundColor: config.color + '20', borderColor: config.color }]}>
          <FileText size={16} color={config.color} strokeWidth={2} />
          <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
        </View>

        <Text style={styles.heading}>Create New Report</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Report Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={config.placeholder}
            style={styles.input}
            placeholderTextColor={lightColors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <User size={14} color={lightColors.textSecondary} strokeWidth={2} />
            <Text style={styles.label}>Your Name *</Text>
          </View>
          <TextInput
            value={createdBy}
            onChangeText={setCreatedBy}
            placeholder="Full name of report creator"
            style={styles.input}
            placeholderTextColor={lightColors.textSecondary}
          />
        </View>

        {config.fields.map((f) => (
          <View key={f.key} style={styles.field}>
            <View style={styles.labelRow}>
              <Tag size={14} color={lightColors.textSecondary} strokeWidth={2} />
              <Text style={styles.label}>{f.label}</Text>
            </View>
            <TextInput
              value={extraFields[f.key] || ''}
              onChangeText={(v) => setField(f.key, v)}
              placeholder={f.placeholder}
              style={styles.input}
              placeholderTextColor={lightColors.textSecondary}
            />
          </View>
        ))}

        <View style={[styles.gpsBox, { backgroundColor: gpsLocation ? '#d1fae5' : '#fef3c7' }]}>
          <View style={styles.gpsRow}>
            <MapPin size={16} color={gpsLocation ? '#065f46' : '#92400e'} strokeWidth={2.5} />
            <Text style={[styles.gpsLabel, { color: gpsLocation ? '#065f46' : '#92400e' }]}>
              GPS Location
            </Text>
          </View>
          {loadingGps ? (
            <ActivityIndicator color={lightColors.primary} size="small" />
          ) : gpsLocation ? (
            <Text style={styles.gpsText}>
              {gpsLocation.latitude.toFixed(4)}°, {gpsLocation.longitude.toFixed(4)}° (±{Math.round(gpsLocation.accuracy || 0)}m)
            </Text>
          ) : (
            <Text style={styles.gpsText}>GPS unavailable — permission may be needed</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isValid ? config.color : '#ccc' }]}
          onPress={handleCreate}
          disabled={!isValid}
        >
          <Text style={[styles.buttonText, { color: isValid ? '#fff' : '#666' }]}>
            Begin Report
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  error: { padding: spacing.md, color: lightColors.error },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  typeLabel: { fontSize: 13, fontWeight: '600' },
  heading: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: lightColors.textPrimary },
  input: {
    borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: 15, color: lightColors.textPrimary, minHeight: 48,
    backgroundColor: lightColors.surface,
  },
  gpsBox: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  gpsLabel: { fontWeight: '600', fontSize: 13 },
  gpsText: { fontSize: 12, color: lightColors.textPrimary, marginLeft: 22 },
  button: {
    paddingVertical: spacing.md, borderRadius: radius.md,
    alignItems: 'center', minHeight: 50, justifyContent: 'center',
  },
  buttonText: { fontWeight: '700', fontSize: 16 },
});
