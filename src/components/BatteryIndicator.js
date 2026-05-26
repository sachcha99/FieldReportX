import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap, Battery, BatteryCharging } from 'lucide-react-native';
import { getBatteryInfo, subscribeBatteryLevel } from '../services/batteryService';

export default function BatteryIndicator({ style }) {
  const [info, setInfo] = useState({ percent: null, isCharging: false, isLowPower: false });

  useEffect(() => {
    getBatteryInfo().then(setInfo);
    const sub = subscribeBatteryLevel((percent) =>
      setInfo((prev) => ({ ...prev, percent }))
    );
    return () => sub?.remove?.();
  }, []);

  if (info.percent === null) return null;

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
