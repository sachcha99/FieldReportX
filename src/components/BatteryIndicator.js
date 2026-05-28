import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap, Battery, BatteryCharging } from 'lucide-react-native';
import { useBatteryLevel, useBatteryState, useLowPowerMode, BatteryState } from 'expo-battery';

export default function BatteryIndicator({ style }) {
  const level = useBatteryLevel();
  const state = useBatteryState();
  const isLowPower = useLowPowerMode();

  const percent = (level >= 0 && level <= 1) ? Math.round(level * 100) : null;
  const isCharging = state === BatteryState.CHARGING;
  const info = { percent, isCharging, isLowPower };

  if (info.percent === null) {
    return (
      <View style={[styles.row, style]}>
        <Battery size={14} color="#9ca3af" strokeWidth={2} />
        <Text style={[styles.label, { color: '#9ca3af' }]}>—</Text>
      </View>
    );
  }

  const color =
    info.isCharging ? '#10b981' :
    info.percent <= 20 ? '#ef4444' :
    info.percent <= 40 ? '#f59e0b' :
    '#6b7280';

  const Icon = info.isCharging ? BatteryCharging : Battery;

  return (
    <View style={[styles.row, style]}>
      {info.isLowPower && <Zap size={11} color="#f59e0b" strokeWidth={2.5} />}
      <Icon size={14} color={color} strokeWidth={2} />
      <Text style={[styles.label, { color }]}>{info.percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '600' },
});
