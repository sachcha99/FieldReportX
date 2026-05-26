import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MapPin } from 'lucide-react-native';
import { createRentalReport, syncRentalReport } from '../store/slices/rentalsSlice';
import { selectCurrentUser } from '../store/slices/authSlice';
import { getCurrentLocation } from '../services/locationService';
import { lightColors, spacing, radius } from '../theme/tokens';
import LocationMap from '../components/LocationMap';

export default function CreateRentalScreen({ navigation }) {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [loadingGps, setLoadingGps] = useState(true);
  const [title, setTitle] = useState('');
  const [inspectorName, setInspectorName] = useState(
    currentUser?.displayName || currentUser?.email || ''
  );
  const [propertyAddress, setPropertyAddress] = useState('');

  useEffect(() => {
    (async () => {
      const result = await getCurrentLocation();
      if (result.ok) setGpsLocation(result.data);
      setLoadingGps(false);
    })();
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a report title');
      return;
    }
    if (!inspectorName.trim()) {
      Alert.alert('Error', 'Please enter inspector name');
      return;
    }
    if (!propertyAddress.trim()) {
      Alert.alert('Error', 'Please enter property address');
      return;
    }

    const action = dispatch(createRentalReport({
      title,
      propertyAddress,
      inspectorName,
      userId: currentUser?.uid || null,
      gpsLocation,
    }));

    // Auto-sync to Firestore immediately after creation
    dispatch(syncRentalReport(action.payload.id));

    navigation.goBack();
  };

  const isFormValid = title.trim() && inspectorName.trim() && propertyAddress.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Set up Rental Inspection</Text>
        <Text style={styles.subheading}>Property details and inspector information</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Report Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. 123 Oak Street Move-In"
            style={styles.input}
            placeholderTextColor={lightColors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Inspector Name</Text>
          <TextInput
            value={inspectorName}
            onChangeText={setInspectorName}
            placeholder="Your full name"
            style={styles.input}
            placeholderTextColor={lightColors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Property Address</Text>
          <TextInput
            value={propertyAddress}
            onChangeText={setPropertyAddress}
            placeholder="Full street address"
            style={styles.input}
            placeholderTextColor={lightColors.textSecondary}
            multiline
          />
        </View>

        <View style={[styles.gpsBox, { backgroundColor: gpsLocation ? '#d1fae5' : '#fee2e2' }]}>
          <View style={styles.gpsHeader}>
            <MapPin size={18} color={gpsLocation ? '#10b981' : '#ef4444'} strokeWidth={2.5} />
            <Text style={styles.gpsLabel}>GPS Location</Text>
          </View>
          {loadingGps ? (
            <ActivityIndicator color={lightColors.primary} />
          ) : gpsLocation ? (
            <Text style={styles.gpsText}>{gpsLocation.latitude.toFixed(4)}°, {gpsLocation.longitude.toFixed(4)}° (±{Math.round(gpsLocation.accuracy || 0)}m)</Text>
          ) : (
            <Text style={styles.gpsText}>Permission denied or GPS unavailable</Text>
          )}
        </View>

        {/* Map preview of captured GPS */}
        {gpsLocation && !loadingGps && (
          <LocationMap location={gpsLocation} height={180} style={styles.mapPreview} />
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isFormValid ? lightColors.primary : '#ccc' }]}
          onPress={handleSubmit}
          disabled={!isFormValid}
        >
          <Text style={[styles.buttonText, { color: isFormValid ? '#fff' : '#666' }]}>Begin Inspection</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.xs },
  subheading: { fontSize: 13, color: lightColors.textSecondary, marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: lightColors.textPrimary, minHeight: 48 },
  gpsBox: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  gpsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  gpsLabel: { fontWeight: '600', fontSize: 14 },
  gpsText: { fontSize: 13, color: lightColors.textPrimary, marginLeft: 26 },
  mapPreview: { marginBottom: spacing.lg },
  button: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 },
});
