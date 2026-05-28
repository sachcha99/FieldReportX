import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, Clipboard,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { User, Mail, LogOut, Shield, Cloud, Database, Bell, Radio } from 'lucide-react-native';
import { selectCurrentUser, logoutUser } from '../store/slices/authSlice';
import { selectAllRentalReports } from '../store/slices/rentalsSlice';
import { selectAllReports } from '../store/slices/reportsSlice';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { lightColors, spacing, radius } from '../theme/tokens';
import {
  scheduleReportReminder, cancelAllNotifications,
  registerForRemoteNotifications, simulateRemoteNotification,
} from '../services/notificationService';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const uid = user?.uid;
  const allRentalReports = useSelector(selectAllRentalReports);
  const allGenericReports = useSelector(selectAllReports);
  const rentalReports = uid ? allRentalReports.filter((r) => r.userId === uid) : allRentalReports;
  const genericReports = uid ? allGenericReports.filter((r) => r.userId === uid) : allGenericReports;
  const totalReports = rentalReports.length + genericReports.length;
  const completedReports = [
    ...rentalReports, ...genericReports,
  ].filter((r) => r.status === 'completed').length;

  const firebaseReady = isFirebaseConfigured();
  const [pushToken, setPushToken] = useState(null);

  useEffect(() => {
    registerForRemoteNotifications().then(setPushToken).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local reports will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logoutUser()) },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      await scheduleReportReminder('Test Report', 5);
      Alert.alert('Notification Scheduled', 'You will receive a test notification in 5 seconds.');
    } catch {
      Alert.alert('Error', 'Could not schedule notification. Check permissions.');
    }
  };

  const handleTestRemoteNotification = async () => {
    try {
      await simulateRemoteNotification('new_template', { name: 'Building Site Audit' });
      Alert.alert('Remote Notification Sent', 'Simulated a "New Template Available" remote notification.');
    } catch {
      Alert.alert('Error', 'Could not send remote notification.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Account</Text>

        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: lightColors.primary }]}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {(user?.displayName || user?.email || 'G').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>
              {user?.displayName || user?.email || 'Guest User'}
            </Text>
            {user?.email && (
              <Text style={styles.userEmail}>{user.email}</Text>
            )}
            <View style={styles.userBadge}>
              <Text style={styles.userBadgeText}>
                {user?.isAnonymous ? 'Guest / Local' : 'Registered Account'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: lightColors.surface }]}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{totalReports}</Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{completedReports}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{totalReports - completedReports}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>

        {/* System info */}
        <Text style={styles.sectionTitle}>System</Text>
        <View style={[styles.infoCard, { backgroundColor: lightColors.surface }]}>
          <InfoRow
            Icon={Cloud}
            label="Cloud Sync"
            value={firebaseReady ? 'Connected' : 'Not configured'}
            valueColor={firebaseReady ? '#10b981' : '#f59e0b'}
          />
          <InfoRow
            Icon={Database}
            label="Local Storage"
            value="SQLite + AsyncStorage"
            valueColor={lightColors.textSecondary}
          />
          <InfoRow
            Icon={Shield}
            label="Auth Mode"
            value={user?.isAnonymous ? 'Local / Guest' : 'Firebase Email'}
            valueColor={lightColors.textSecondary}
          />
          {user?.uid && (
            <InfoRow
              Icon={User}
              label="User ID"
              value={user.uid.substring(0, 12) + '…'}
              valueColor={lightColors.textSecondary}
            />
          )}
          {/* <InfoRow
            Icon={Radio}
            label="Push Token"
            value={pushToken ? pushToken.substring(0, 28) + '…' : 'Registering…'}
            valueColor={pushToken ? '#10b981' : lightColors.textSecondary}
          /> */}
        </View>

        {/* Actions */}
        {/* <Text style={styles.sectionTitle}>Actions</Text>
        <View style={[styles.infoCard, { backgroundColor: lightColors.surface }]}>
          <TouchableOpacity style={styles.actionRow} onPress={handleTestNotification}>
            <Bell size={18} color={lightColors.primary} strokeWidth={2} />
            <Text style={styles.actionText}>Test Notification</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={handleTestRemoteNotification}>
            <Radio size={18} color="#8B5CF6" strokeWidth={2} />
            <Text style={styles.actionText}>Test Remote Notification</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Cancel Notifications', 'All scheduled notifications cancelled.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear All', onPress: cancelAllNotifications },
            ])}
          >
            <Bell size={18} color={lightColors.textSecondary} strokeWidth={2} />
            <Text style={styles.actionText}>Clear All Notifications</Text>
          </TouchableOpacity>
        </View> */}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <LogOut size={18} color={lightColors.error} strokeWidth={2} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {user?.isAnonymous && (
          <View style={[styles.upgradeBox, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.upgradeTitle}>Upgrade to Full Account</Text>
            <Text style={styles.upgradeText}>
              Create an account to sync your reports across devices and enable cloud backup.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ Icon, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Icon size={16} color={lightColors.textSecondary} strokeWidth={2} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { fontSize: 24, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.lg },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md,
  },
  avatarBox: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  userName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  userBadge: { marginTop: spacing.xs, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
  userBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  statsRow: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary },
  statLabel: { fontSize: 11, color: lightColors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: lightColors.border },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: lightColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },

  infoCard: { borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: lightColors.border },
  infoLabel: { flex: 1, fontSize: 14, color: lightColors.textPrimary },
  infoValue: { fontSize: 13, fontWeight: '500' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: lightColors.border },
  actionText: { fontSize: 14, color: lightColors.textPrimary },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: lightColors.error,
  },
  signOutText: { color: lightColors.error, fontWeight: '600', fontSize: 15 },

  upgradeBox: { padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  upgradeTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: spacing.xs },
  upgradeText: { fontSize: 13, color: '#1d4ed8', lineHeight: 18 },
});
