import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, SafeAreaView, Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import BatteryIndicator from '../components/BatteryIndicator';
import AdBanner from '../components/AdBanner';
import {
  Cloud, Trash2, CheckCircle, RefreshCw, Circle,
  FileText, GitCompare, Home, Wrench, Scale, Car, Heart, CheckSquare, Truck,
} from 'lucide-react-native';
import {
  selectAllRentalReports, deleteRentalReport,
  selectReportProgress as selectRentalProgress,
  selectSyncStatus as selectRentalSync,
  syncRentalReport,
} from '../store/slices/rentalsSlice';
import {
  selectAllReports, deleteReport,
  selectReportProgress, selectReportSyncStatus,
  syncReport, batchSyncAllReports, TYPE_META,
} from '../store/slices/reportsSlice';
import { batchSyncAllRentals } from '../store/slices/rentalsSlice';
import { selectCurrentUser } from '../store/slices/authSlice';
import { lightColors, spacing, radius } from '../theme/tokens';

const TYPE_ICONS = {
  rental: Home,
  trades: Wrench,
  legal: Scale,
  driving: Car,
  rehab: Heart,
  general: FileText,
  service: Truck,
};

const TYPE_DETAIL_SCREENS = {
  driving: 'DrivingDetail',
  legal: 'LegalDetail',
  service: 'ServiceDetail',
  trades: 'TradesDetail',
  rehab: 'RehabDetail',
};

function getDetailScreen(type) {
  return TYPE_DETAIL_SCREENS[type] || 'GenericReportDetail';
}

export default function HomeScreen({ navigation }) {
  const currentUser = useSelector(selectCurrentUser);
  const uid = currentUser?.uid;
  const allRentalReports = useSelector(selectAllRentalReports);
  const allGenericReports = useSelector(selectAllReports);
  const rentalReports = uid ? allRentalReports.filter((r) => r.userId === uid) : allRentalReports;
  const genericReports = uid ? allGenericReports.filter((r) => r.userId === uid) : allGenericReports;
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('all');

  // Auto-sync all unsynced reports whenever this screen gains focus
  useFocusEffect(
    useCallback(() => {
      dispatch(batchSyncAllReports());
      dispatch(batchSyncAllRentals());
    }, [dispatch])
  );

  const allReports = [
    ...rentalReports.map((r) => ({ ...r, _storeType: 'rental' })),
    ...genericReports.map((r) => ({ ...r, _storeType: 'generic' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const filteredReports = filter === 'all'
    ? allReports
    : allReports.filter((r) => (r._storeType === 'rental' ? 'rental' : r.type) === filter);

  const totalReports = allReports.length;
  const completedReports = allReports.filter((r) => r.status === 'completed').length;

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'rental', label: 'Rental' },
    { key: 'trades', label: 'Trades' },
    { key: 'legal', label: 'Legal' },
    { key: 'driving', label: 'Driving' },
    { key: 'rehab', label: 'Rehab' },
    { key: 'general', label: 'General' },
    { key: 'service', label: 'Service' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={lightColors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>FieldReportX</Text>
          <Text style={styles.subtitle}>{totalReports} reports • {completedReports} completed</Text>
        </View>
        <View style={styles.headerRight}>
          <BatteryIndicator />
          <TouchableOpacity
            style={styles.compareBtn}
            onPress={() => navigation.navigate('ReportComparison')}
          >
            <GitCompare size={20} color={lightColors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* New Report button */}
      <TouchableOpacity
        style={styles.newButton}
        onPress={() => navigation.navigate('TemplatesTab')}
      >
        <Text style={styles.newButtonText}>+ New Report</Text>
      </TouchableOpacity>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: filter === item.key ? lightColors.primary : lightColors.surface },
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[
                styles.filterText,
                { color: filter === item.key ? '#fff' : lightColors.textSecondary },
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Ad Banner */}
      <AdBanner style={styles.adBanner} />

      {filteredReports.length === 0 ? (
        <View style={styles.empty}>
          <FileText size={48} color={lightColors.textSecondary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>
            {filter === 'all' ? 'No reports yet' : `No ${filter} reports`}
          </Text>
          <Text style={styles.emptyText}>
            Tap "+ New Report" to create your first report.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReportRow
              report={item}
              onPress={() => {
                if (item._storeType === 'rental') {
                  navigation.navigate('ReportDetail', { reportId: item.id });
                } else {
                  navigation.navigate(getDetailScreen(item.type), { reportId: item.id });
                }
              }}
              onDelete={() => {
                Alert.alert(
                  'Delete Report',
                  'Are you sure you want to delete this report? This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        if (item._storeType === 'rental') {
                          dispatch(deleteRentalReport(item.id));
                        } else {
                          dispatch(deleteReport(item.id));
                        }
                      },
                    },
                  ]
                );
              }}
              onSync={() => {
                if (item._storeType === 'rental') {
                  dispatch(syncRentalReport(item.id));
                } else {
                  dispatch(syncReport(item.id));
                }
              }}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

function ReportRow({ report, onPress, onDelete, onSync }) {
  const isRental = report._storeType === 'rental';
  const reportType = isRental ? 'rental' : report.type;
  const meta = TYPE_META[reportType] || { color: lightColors.primary, label: 'Rental Inspection' };
  const Icon = TYPE_ICONS[reportType] || FileText;

  const rentalProgress = useSelector(
    isRental ? selectRentalProgress(report.id) : () => null
  );
  const genericProgress = useSelector(
    !isRental ? selectReportProgress(report.id) : () => null
  );
  const progress = isRental ? rentalProgress : genericProgress;

  const rentalSync = useSelector(
    isRental ? selectRentalSync(report.id) : () => null
  );
  const genericSync = useSelector(
    !isRental ? selectReportSyncStatus(report.id) : () => null
  );
  const syncStatus = isRental ? rentalSync : genericSync;

  const syncColor = syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#3b82f6' : '#9ca3af';
  const SyncIcon = syncStatus === 'synced' ? CheckCircle : syncStatus === 'syncing' ? RefreshCw : Circle;

  const statusColor = {
    draft: '#9ca3af',
    in_progress: '#f59e0b',
    completed: '#10b981',
    archived: '#8b5cf6',
    synced: '#3b82f6',
  }[report.status] || '#9ca3af';

  return (
    <TouchableOpacity style={[styles.row, { backgroundColor: lightColors.surface }]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: (meta.color || lightColors.primary) + '20' }]}>
        <Icon size={20} color={meta.color || lightColors.primary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{report.title}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta.label || 'Rental Inspection'} • {report.propertyAddress || report.metadata?.clientName || report.createdBy}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress || 0}%`, backgroundColor: meta.color || lightColors.primary }]} />
        </View>
        <View style={styles.rowFooter}>
          <Text style={styles.rowProgress}>{progress || 0}% complete</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor + '30' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {report.status?.replace('_', ' ') || 'draft'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onSync} style={styles.actionBtn}>
          <SyncIcon size={18} color={syncColor} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
          <Trash2 size={18} color={lightColors.error} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: lightColors.surface, marginBottom: spacing.sm,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  adBanner: { marginBottom: spacing.xs },
  title: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary },
  subtitle: { fontSize: 12, color: lightColors.textSecondary, marginTop: 2 },
  compareBtn: { padding: spacing.sm },

  newButton: {
    backgroundColor: lightColors.primary, marginHorizontal: spacing.md,
    marginBottom: spacing.sm, paddingVertical: spacing.md,
    borderRadius: radius.md, alignItems: 'center',
  },
  newButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  filterRow: { height: 44, marginBottom: spacing.xs },
  filterList: { paddingHorizontal: spacing.md, alignItems: 'center', gap: spacing.xs },
  filterChip: { height: 32, paddingHorizontal: spacing.md, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: spacing.xs },
  filterText: { fontSize: 12, fontWeight: '600' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: lightColors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  emptyText: { color: lightColors.textSecondary, fontSize: 14, textAlign: 'center' },

  list: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, gap: spacing.sm },
  rowIcon: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontWeight: '600', color: lightColors.textPrimary, fontSize: 14 },
  rowMeta: { fontSize: 11, color: lightColors.textSecondary, marginTop: 1 },
  progressBar: { height: 4, backgroundColor: lightColors.border, borderRadius: 2, marginTop: spacing.xs, marginBottom: spacing.xs },
  progressFill: { height: 4, borderRadius: 2 },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowProgress: { fontSize: 10, color: lightColors.textSecondary },
  statusDot: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'column', gap: spacing.xs },
  actionBtn: { padding: spacing.xs, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
});
