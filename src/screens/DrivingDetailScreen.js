import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Image, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Camera, FileText, CheckCircle, Circle, X, Check,
  Activity, Gauge, MapPin, Navigation, BarChart2,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { launchCamera } from '../services/cameraService';
import LocationMap from '../components/LocationMap';
import {
  selectReportById, selectReportProgress, selectOverallScore,
  updateSectionNotes, toggleChecklistItem, markSectionComplete,
  addPhotoToSection, removePhotoFromSection, markReportComplete,
  setSectionScore, saveSensorData, addGpsPoint, clearGpsRoute, TYPE_META,
} from '../store/slices/reportsSlice';
import {
  startAccelerometer, stopAccelerometer,
  computeSmoothnessScore, startGyroscope, stopGyroscope, computeAngleDelta,
} from '../services/sensorService';
import { lightColors, spacing, radius } from '../theme/tokens';

const ACCENT = '#8B5CF6';

function haversineDistance(a, b) {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function computePerformanceSummary({ smoothnessScore, steeringAngleDeg, maxSpeedKmh, totalDistanceM }) {
  if (smoothnessScore === null) return null;

  const speedScore =
    maxSpeedKmh === null ? 80
    : maxSpeedKmh <= 60 ? 100
    : maxSpeedKmh <= 80 ? 90
    : maxSpeedKmh <= 100 ? 75
    : maxSpeedKmh <= 120 ? 55
    : 35;

  const steeringScore =
    steeringAngleDeg === null ? 80
    : steeringAngleDeg <= 90 ? 100
    : steeringAngleDeg <= 200 ? 85
    : steeringAngleDeg <= 400 ? 65
    : 45;

  const overall = Math.round(smoothnessScore * 0.6 + speedScore * 0.2 + steeringScore * 0.2);

  const grade =
    overall >= 85 ? 'PASS — Excellent'
    : overall >= 70 ? 'PASS — Good'
    : overall >= 55 ? 'PASS — Satisfactory'
    : 'FAIL — Needs Improvement';

  const gradeColor =
    overall >= 85 ? '#10b981'
    : overall >= 70 ? '#3b82f6'
    : overall >= 55 ? '#f59e0b'
    : '#ef4444';

  return { overall, grade, gradeColor, speedScore, steeringScore, smoothnessScore };
}

export default function DrivingDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const dispatch = useDispatch();
  const report = useSelector(selectReportById(reportId));
  const progress = useSelector(selectReportProgress(reportId));
  const overallScore = useSelector(selectOverallScore(reportId));
  const [activeSection, setActiveSection] = useState(0);

  // ─── Sensor (accelerometer + gyroscope) state ────────────────────────────────
  const [sensorRecording, setSensorRecording] = useState(false);
  const [currentAccel, setCurrentAccel] = useState({ x: 0, y: 0, z: 0 });
  const [currentGyro, setCurrentGyro] = useState({ x: 0, y: 0, z: 0 });
  const [capturedScore, setCapturedScore] = useState(null);
  const [capturedAngleDelta, setCapturedAngleDelta] = useState(null);
  const accelSamples = useRef([]);
  const gyroSamples = useRef([]);
  const sensorStartTime = useRef(null);

  // ─── GPS speed + route state ─────────────────────────────────────────────────
  const [gpsTracking, setGpsTracking] = useState(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(null);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const locationSub = useRef(null);
  const lastPosition = useRef(null);
  const speedReadings = useRef([]);

  useEffect(() => {
    return () => {
      stopAccelerometer();
      stopGyroscope();
      if (locationSub.current) locationSub.current.remove();
    };
  }, []);

  if (!report) {
    return <SafeAreaView style={styles.container}><Text>Report not found.</Text></SafeAreaView>;
  }

  const section = report.sections[activeSection];
  const completedCount = report.sections.filter((s) => s.complete).length;
  const gpsRoute = report.gpsRoute || [];

  const avgSpeedKmh =
    speedReadings.current.length > 0
      ? (speedReadings.current.reduce((a, b) => a + b, 0) / speedReadings.current.length).toFixed(1)
      : null;

  // ─── Sensor handlers ─────────────────────────────────────────────────────────

  const handleStartSensor = () => {
    accelSamples.current = [];
    gyroSamples.current = [];
    sensorStartTime.current = Date.now();
    setSensorRecording(true);
    startAccelerometer((data) => { accelSamples.current.push(data); setCurrentAccel(data); }, 100);
    startGyroscope((data) => { gyroSamples.current.push(data); setCurrentGyro(data); }, 100);
  };

  const handleStopSensor = () => {
    stopAccelerometer();
    stopGyroscope();
    setSensorRecording(false);

    const score = computeSmoothnessScore(accelSamples.current);
    const angleDelta = computeAngleDelta(gyroSamples.current, 'z', 100);
    setCapturedScore(score);
    setCapturedAngleDelta(angleDelta);

    const duration = ((Date.now() - sensorStartTime.current) / 1000).toFixed(1);
    const avgMag = accelSamples.current.length > 0
      ? (accelSamples.current.reduce((s, d) => s + Math.sqrt(d.x ** 2 + d.y ** 2 + d.z ** 2), 0) / accelSamples.current.length).toFixed(2)
      : 0;

    const sensorData = {
      samples: accelSamples.current.length,
      durationSeconds: parseFloat(duration),
      averageMagnitude: parseFloat(avgMag),
      smoothnessScore: score,
      steeringAngleDeg: angleDelta,
      maxSpeedKmh: maxSpeedKmh || null,
      avgSpeedKmh: avgSpeedKmh ? parseFloat(avgSpeedKmh) : null,
      totalDistanceM: Math.round(totalDistance),
      capturedAt: new Date().toISOString(),
    };
    dispatch(saveSensorData({ reportId, sensorData }));
    if (score !== null) {
      dispatch(setSectionScore({ reportId, sectionId: section.id, score }));
    }

    Alert.alert(
      'Sensor Capture Done',
      `Smoothness: ${score}/100\nSteering: ${angleDelta}°\nDuration: ${duration}s`
    );
  };

  // ─── GPS handlers ─────────────────────────────────────────────────────────────

  const handleStartGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for speed tracking.');
        return;
      }
      dispatch(clearGpsRoute(reportId));
      lastPosition.current = null;
      speedReadings.current = [];
      setTotalDistance(0);
      setMaxSpeedKmh(0);
      setGpsTracking(true);

      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          const speedMs = loc.coords.speed != null ? Math.max(0, loc.coords.speed) : null;
          const speedKmh = speedMs != null ? parseFloat((speedMs * 3.6).toFixed(1)) : null;

          const point = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: speedMs,
            altitude: loc.coords.altitude,
            timestamp: new Date().toISOString(),
          };
          dispatch(addGpsPoint({ reportId, point }));

          if (speedKmh !== null) {
            setCurrentSpeedKmh(speedKmh);
            speedReadings.current.push(speedKmh);
            setMaxSpeedKmh((prev) => Math.max(prev, speedKmh));
          }

          if (lastPosition.current) {
            const d = haversineDistance(lastPosition.current, point);
            setTotalDistance((prev) => prev + d);
          }
          lastPosition.current = point;
        }
      );
    } catch (err) {
      setGpsTracking(false);
      Alert.alert('GPS Error', err.message || 'Failed to start GPS tracking.');
    }
  };

  const handleStopGps = () => {
    if (locationSub.current) { locationSub.current.remove(); locationSub.current = null; }
    setGpsTracking(false);
    Alert.alert(
      'GPS Stopped',
      `Points: ${gpsRoute.length + 1}\nDistance: ${(totalDistance / 1000).toFixed(2)} km` +
      (avgSpeedKmh ? `\nAvg speed: ${avgSpeedKmh} km/h` : '') +
      `\nMax speed: ${maxSpeedKmh.toFixed(1)} km/h`
    );
  };

  const handleAddPhoto = async () => {
    const asset = await launchCamera({ quality: 0.7 });
    if (asset) {
      dispatch(addPhotoToSection({
        reportId, sectionId: section.id,
        photo: { uri: asset.uri, timestamp: new Date().toISOString() },
      }));
    }
  };

  const magnitude = Math.sqrt(currentAccel.x ** 2 + currentAccel.y ** 2 + currentAccel.z ** 2);

  // Automated performance summary (computed once sensorData is saved)
  const perfSummary = report.sensorData
    ? computePerformanceSummary({
        smoothnessScore: report.sensorData.smoothnessScore,
        steeringAngleDeg: report.sensorData.steeringAngleDeg,
        maxSpeedKmh: report.sensorData.maxSpeedKmh,
        totalDistanceM: report.sensorData.totalDistanceM,
      })
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[styles.header, { backgroundColor: lightColors.surface }]}>
          <View style={styles.headerTop}>
            <Activity size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.typeText, { color: ACCENT }]}>Driving Test Report</Text>
            <View style={[styles.statusBadge, { backgroundColor: ACCENT + '20' }]}>
              <Text style={[styles.statusText, { color: ACCENT }]}>{report.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.meta}>Driver: {report.metadata?.driverName || report.createdBy}</Text>
          {report.metadata?.vehicleRego && (
            <Text style={styles.meta}>Vehicle: {report.metadata.vehicleRego}</Text>
          )}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{completedCount}/{report.sections.length} sections • {progress}%</Text>
            {overallScore !== null && (
              <View style={styles.scoreChip}>
                <Gauge size={12} color={ACCENT} strokeWidth={2.5} />
                <Text style={[styles.scoreText, { color: ACCENT }]}>{overallScore}/100</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── GPS Speed & Route Panel ─────────────────────────────────────────── */}
        <View style={[styles.panel, { backgroundColor: '#10b98110', borderColor: '#10b98140' }]}>
          <View style={styles.panelHeader}>
            <Navigation size={16} color="#10b981" strokeWidth={2} />
            <Text style={[styles.panelTitle, { color: '#10b981' }]}>Speed & Route Tracking</Text>
          </View>

          <View style={styles.speedStats}>
            <View style={styles.speedStat}>
              <Text style={styles.speedValue}>
                {currentSpeedKmh != null ? currentSpeedKmh.toFixed(1) : '—'}
              </Text>
              <Text style={styles.speedLabel}>km/h now</Text>
            </View>
            <View style={styles.speedStat}>
              <Text style={styles.speedValue}>{maxSpeedKmh.toFixed(1)}</Text>
              <Text style={styles.speedLabel}>km/h max</Text>
            </View>
            <View style={styles.speedStat}>
              <Text style={styles.speedValue}>{avgSpeedKmh ?? '—'}</Text>
              <Text style={styles.speedLabel}>km/h avg</Text>
            </View>
            <View style={styles.speedStat}>
              <Text style={styles.speedValue}>{(totalDistance / 1000).toFixed(2)}</Text>
              <Text style={styles.speedLabel}>km dist.</Text>
            </View>
          </View>

          {gpsTracking && (
            <View style={styles.speedometerBar}>
              <View style={[
                styles.speedometerFill,
                {
                  width: `${Math.min(100, ((currentSpeedKmh || 0) / 140) * 100)}%`,
                  backgroundColor:
                    (currentSpeedKmh || 0) <= 60 ? '#10b981'
                    : (currentSpeedKmh || 0) <= 100 ? '#f59e0b'
                    : '#ef4444',
                },
              ]} />
              <Text style={styles.speedometerLabel}>
                {(currentSpeedKmh || 0) <= 60 ? 'Safe speed'
                  : (currentSpeedKmh || 0) <= 100 ? 'Moderate'
                  : 'High speed'}
              </Text>
            </View>
          )}

          {gpsRoute.length > 0 && (
            <Text style={styles.routeInfo}>
              {gpsRoute.length} GPS points logged
            </Text>
          )}

          <View style={styles.panelButtons}>
            {!gpsTracking ? (
              <TouchableOpacity
                style={[styles.panelBtn, { backgroundColor: '#10b981' }]}
                onPress={handleStartGps}
              >
                <Navigation size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.panelBtnText}>Start GPS Tracking</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.panelBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleStopGps}
              >
                <MapPin size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.panelBtnText}>Stop GPS</Text>
              </TouchableOpacity>
            )}
          </View>

          {gpsRoute.length > 1 && (
            <LocationMap
              routePoints={gpsRoute}
              location={report.gpsLocation}
              height={220}
              style={{ marginTop: spacing.sm, borderRadius: 8 }}
            />
          )}
        </View>

        {/* ── Sensor Panel (vibration analysis) ──────────────────────────────── */}
        <View style={[styles.panel, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '40' }]}>
          <View style={styles.panelHeader}>
            <Activity size={16} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.panelTitle, { color: ACCENT }]}>Vibration & Stability Analysis</Text>
          </View>

          {sensorRecording && (
            <View style={styles.sensorReadings}>
              <View style={styles.readingRow}>
                <Text style={styles.axisLabel}>X</Text>
                <View style={[styles.axisBar, { width: `${Math.min(100, Math.abs(currentAccel.x) * 30)}%`, backgroundColor: '#ef4444' }]} />
                <Text style={styles.axisValue}>{currentAccel.x.toFixed(3)}</Text>
              </View>
              <View style={styles.readingRow}>
                <Text style={styles.axisLabel}>Y</Text>
                <View style={[styles.axisBar, { width: `${Math.min(100, Math.abs(currentAccel.y) * 30)}%`, backgroundColor: '#10b981' }]} />
                <Text style={styles.axisValue}>{currentAccel.y.toFixed(3)}</Text>
              </View>
              <View style={styles.readingRow}>
                <Text style={styles.axisLabel}>Z</Text>
                <View style={[styles.axisBar, { width: `${Math.min(100, Math.abs(currentAccel.z) * 30)}%`, backgroundColor: '#3b82f6' }]} />
                <Text style={styles.axisValue}>{currentAccel.z.toFixed(3)}</Text>
              </View>
              <Text style={styles.magnitudeText}>
                Magnitude: {magnitude.toFixed(3)} g  •  Samples: {accelSamples.current.length}
              </Text>
              <View style={styles.gyroRow}>
                <Text style={styles.gyroLabel}>Gyro (rad/s)</Text>
                <Text style={styles.gyroValue}>X {currentGyro.x.toFixed(3)}</Text>
                <Text style={styles.gyroValue}>Y {currentGyro.y.toFixed(3)}</Text>
                <Text style={styles.gyroValue}>Z {currentGyro.z.toFixed(3)}</Text>
              </View>
            </View>
          )}

          {capturedScore !== null && !sensorRecording && (
            <View style={styles.scoreResult}>
              <Text style={styles.scoreResultLabel}>Smoothness Score</Text>
              <Text style={[styles.scoreResultValue, {
                color: capturedScore >= 70 ? '#10b981' : capturedScore >= 40 ? '#f59e0b' : '#ef4444',
              }]}>
                {capturedScore}/100{' '}
                {capturedScore >= 70 ? '— Excellent' : capturedScore >= 40 ? '— Acceptable' : '— Needs Work'}
              </Text>
              {capturedAngleDelta !== null && (
                <Text style={styles.scoreResultLabel}>Steering rotation: {capturedAngleDelta}°</Text>
              )}
            </View>
          )}

          <View style={styles.panelButtons}>
            {!sensorRecording ? (
              <TouchableOpacity style={[styles.panelBtn, { backgroundColor: ACCENT }]} onPress={handleStartSensor}>
                <Activity size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.panelBtnText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.panelBtn, { backgroundColor: '#ef4444' }]} onPress={handleStopSensor}>
                <View style={styles.stopIcon} />
                <Text style={styles.panelBtnText}>Stop & Score</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Automated Performance Summary ───────────────────────────────────── */}
        {perfSummary && (
          <View style={[styles.summaryCard, { borderColor: perfSummary.gradeColor + '60' }]}>
            <View style={styles.summaryHeader}>
              <Gauge size={18} color={perfSummary.gradeColor} strokeWidth={2} />
              <Text style={styles.summaryTitle}>Automated Performance Summary</Text>
            </View>

            <View style={[styles.gradeRow, { backgroundColor: perfSummary.gradeColor + '15' }]}>
              <Text style={[styles.overallScore, { color: perfSummary.gradeColor }]}>
                {perfSummary.overall}/100
              </Text>
              <Text style={[styles.gradeText, { color: perfSummary.gradeColor }]}>
                {perfSummary.grade}
              </Text>
            </View>

            <View style={styles.summaryRows}>
              <SummaryRow label="Smoothness / Vibration" value={`${perfSummary.smoothnessScore}/100`} color={scoreColor(perfSummary.smoothnessScore)} />
              <SummaryRow label="Speed Compliance" value={`${perfSummary.speedScore}/100`} color={scoreColor(perfSummary.speedScore)} />
              <SummaryRow label="Steering Stability" value={`${perfSummary.steeringScore}/100`} color={scoreColor(perfSummary.steeringScore)} />
              {report.sensorData?.maxSpeedKmh != null && (
                <SummaryRow label="Max Speed" value={`${report.sensorData.maxSpeedKmh.toFixed(1)} km/h`} color={lightColors.textPrimary} />
              )}
              {report.sensorData?.avgSpeedKmh != null && (
                <SummaryRow label="Avg Speed" value={`${report.sensorData.avgSpeedKmh} km/h`} color={lightColors.textPrimary} />
              )}
              {report.sensorData?.totalDistanceM != null && (
                <SummaryRow label="Distance" value={`${(report.sensorData.totalDistanceM / 1000).toFixed(2)} km`} color={lightColors.textPrimary} />
              )}
              {report.sensorData?.steeringAngleDeg != null && (
                <SummaryRow label="Steering Rotation" value={`${report.sensorData.steeringAngleDeg}°`} color={lightColors.textPrimary} />
              )}
              {report.sensorData?.durationSeconds != null && (
                <SummaryRow label="Assessment Duration" value={`${report.sensorData.durationSeconds}s`} color={lightColors.textPrimary} />
              )}
            </View>

            <Text style={styles.summaryFooter}>
              Captured {report.sensorData?.capturedAt
                ? new Date(report.sensorData.capturedAt).toLocaleString()
                : ''}
            </Text>
          </View>
        )}

        {/* Section tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {report.sections.map((s, idx) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setActiveSection(idx)}
              style={[styles.tab, {
                backgroundColor: activeSection === idx ? ACCENT : lightColors.surface,
                borderColor: activeSection === idx ? ACCENT : lightColors.border,
              }]}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, { color: activeSection === idx ? '#fff' : lightColors.textPrimary }]}>
                  {s.name.split(' ')[0]}
                </Text>
                {s.complete && <Check size={13} color={activeSection === idx ? '#fff' : '#10b981'} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section card */}
        <View style={[styles.sectionCard, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.sectionTitle}>{section.name}</Text>

          {Object.entries(section.checklist || {}).map(([key, checked]) => (
            <TouchableOpacity
              key={key}
              onPress={() => dispatch(toggleChecklistItem({ reportId, sectionId: section.id, key }))}
              style={[styles.checkItem, { backgroundColor: checked ? '#d1fae5' : lightColors.background }]}
            >
              {checked
                ? <CheckCircle size={20} color="#10b981" strokeWidth={2.5} />
                : <Circle size={20} color={lightColors.textSecondary} strokeWidth={2} />}
              <Text style={[styles.checkLabel, { color: checked ? '#065f46' : lightColors.textPrimary }]}>{key}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.scoreSect}>
            <Text style={styles.notesLabel}>Section Score: {section.score !== null ? `${section.score}/100` : 'Not set'}</Text>
            <View style={styles.scoreRow}>
              {[0, 25, 50, 75, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.scoreBtn, { backgroundColor: section.score === val ? ACCENT : lightColors.background }]}
                  onPress={() => dispatch(setSectionScore({ reportId, sectionId: section.id, score: val }))}
                >
                  <Text style={[styles.scoreBtnText, { color: section.score === val ? '#fff' : lightColors.textPrimary }]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.notesLabel}>Assessor Notes</Text>
          <TextInput
            value={section.conditionNotes}
            onChangeText={(text) => dispatch(updateSectionNotes({ reportId, sectionId: section.id, notes: text }))}
            placeholder="Observations and findings..."
            style={styles.notesInput}
            placeholderTextColor={lightColors.textSecondary}
            multiline
          />

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
                    onPress={() => dispatch(removePhotoFromSection({ reportId, sectionId: section.id, photoIndex: index }))}
                  >
                    <X size={13} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              )}
              style={{ marginBottom: spacing.sm }}
            />
          )}

          <TouchableOpacity style={[styles.photoBtn, { backgroundColor: ACCENT }]} onPress={handleAddPhoto}>
            <Camera size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.photoBtnText}>Capture Photo</Text>
          </TouchableOpacity>

          {!section.complete ? (
            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: ACCENT }]}
              onPress={() => dispatch(markSectionComplete({ reportId, sectionId: section.id }))}
            >
              <Check size={16} color="#fff" strokeWidth={3} />
              <Text style={styles.completeBtnText}>Mark Section Complete</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}>
              <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />
              <Text style={styles.completedText}>Section Complete</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#374151' }]}
          onPress={() => navigation.navigate('ReportCharts', { reportId, reportType: 'generic' })}
        >
          <BarChart2 size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>View Charts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: ACCENT }]}
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

        {completedCount === report.sections.length && report.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
            onPress={() => { dispatch(markReportComplete({ reportId })); Alert.alert('Done', 'Driving report marked complete!'); }}
          >
            <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
            <Text style={styles.actionBtnText}>Mark Report Complete</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function scoreColor(score) {
  if (score >= 75) return '#10b981';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

function SummaryRow({ label, value, color }) {
  return (
    <View style={summaryRowStyles.row}>
      <Text style={summaryRowStyles.label}>{label}</Text>
      <Text style={[summaryRowStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const summaryRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 13, color: lightColors.textSecondary },
  value: { fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  header: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  typeText: { fontSize: 12, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', color: lightColors.textPrimary, marginBottom: 2 },
  meta: { fontSize: 12, color: lightColors.textSecondary },
  progressBar: { height: 6, backgroundColor: lightColors.border, borderRadius: 3, marginTop: spacing.sm, marginBottom: spacing.xs },
  progressFill: { height: 6, backgroundColor: ACCENT, borderRadius: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: 11, color: lightColors.textSecondary },
  scoreChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  scoreText: { fontSize: 11, fontWeight: '700' },

  panel: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  panelTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  panelButtons: { flexDirection: 'row', gap: spacing.sm },
  panelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md },
  panelBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  speedStats: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  speedStat: { flex: 1, backgroundColor: lightColors.background, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  speedValue: { fontSize: 18, fontWeight: '700', color: lightColors.textPrimary },
  speedLabel: { fontSize: 9, color: lightColors.textSecondary, marginTop: 2 },
  speedometerBar: { height: 20, backgroundColor: lightColors.border, borderRadius: 10, overflow: 'hidden', marginBottom: spacing.sm, justifyContent: 'center' },
  speedometerFill: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 10, minWidth: 4 },
  speedometerLabel: { fontSize: 10, color: '#fff', fontWeight: '700', textAlign: 'center', zIndex: 1 },
  routeInfo: { fontSize: 11, color: lightColors.textSecondary, marginBottom: spacing.sm },

  sensorReadings: { marginBottom: spacing.sm },
  readingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  axisLabel: { width: 16, fontSize: 12, fontWeight: '700', color: lightColors.textPrimary },
  axisBar: { height: 8, borderRadius: 4, minWidth: 4 },
  axisValue: { fontSize: 11, color: lightColors.textSecondary, width: 60 },
  magnitudeText: { fontSize: 11, color: lightColors.textSecondary, marginTop: spacing.xs },
  gyroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: lightColors.border },
  gyroLabel: { fontSize: 10, fontWeight: '600', color: lightColors.textSecondary, flex: 1 },
  gyroValue: { fontSize: 11, color: lightColors.textPrimary, minWidth: 70 },
  scoreResult: { padding: spacing.sm, backgroundColor: lightColors.background, borderRadius: radius.sm, marginBottom: spacing.sm },
  scoreResultLabel: { fontSize: 12, color: lightColors.textSecondary },
  scoreResultValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  stopIcon: { width: 12, height: 12, backgroundColor: '#fff', borderRadius: 2 },

  summaryCard: { backgroundColor: lightColors.surface, borderRadius: radius.md, borderWidth: 2, padding: spacing.md, marginBottom: spacing.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: lightColors.textPrimary },
  gradeRow: { padding: spacing.md, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  overallScore: { fontSize: 32, fontWeight: '800' },
  gradeText: { fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'right' },
  summaryRows: { gap: 0 },
  summaryFooter: { fontSize: 10, color: lightColors.textSecondary, marginTop: spacing.sm },

  tabs: { marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, marginRight: spacing.sm, borderWidth: 1 },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tabText: { fontWeight: '600', fontSize: 12 },

  sectionCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.md },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, borderRadius: radius.sm, marginBottom: spacing.xs, minHeight: 44 },
  checkLabel: { flex: 1, fontSize: 14 },

  scoreSect: { marginTop: spacing.md },
  scoreRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  scoreBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: lightColors.border },
  scoreBtnText: { fontSize: 13, fontWeight: '600' },

  notesLabel: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  notesInput: { borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 13, color: lightColors.textPrimary, minHeight: 80, textAlignVertical: 'top' },

  photoWrap: { position: 'relative', marginRight: spacing.sm },
  photo: { width: 110, height: 110, borderRadius: radius.md },
  removePhoto: { position: 'absolute', top: -8, right: -8, backgroundColor: lightColors.error, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, marginTop: spacing.sm },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  completeBtnText: { color: '#fff', fontWeight: '600' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, justifyContent: 'center' },
  completedText: { color: '#10b981', fontWeight: '600', fontSize: 14 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
