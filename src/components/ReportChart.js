import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, Path, Circle, G } from 'react-native-svg';
import { spacing } from '../theme/tokens';

// ── Bar Chart ─────────────────────────────────────────────────────────────────
export function BarChart({ data, width = 320, height = 180, color = '#2563eb', label = '' }) {
  if (!data || data.length === 0) return null;

  const PAD_L = 36, PAD_B = 40, PAD_T = 12, PAD_R = 12;
  const plotW = width - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = plotW / data.length - 6;

  return (
    <View>
      {label ? <Text style={styles.chartLabel}>{label}</Text> : null}
      <Svg width={width} height={height}>
        {/* Y axis */}
        <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#d1d5db" strokeWidth={1} />
        {/* X axis */}
        <Line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="#d1d5db" strokeWidth={1} />

        {/* Grid lines + Y labels */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = PAD_T + plotH - (pct / 100) * plotH;
          const val = Math.round((pct / 100) * maxVal);
          return (
            <G key={pct}>
              <Line x1={PAD_L} y1={y} x2={PAD_L + plotW} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <SvgText x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{val}</SvgText>
            </G>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * plotH;
          const x = PAD_L + i * (plotW / data.length) + 3;
          const y = PAD_T + plotH - barH;
          return (
            <G key={i}>
              <Rect x={x} y={y} width={barW} height={barH} fill={d.color || color} rx={3} />
              <SvgText x={x + barW / 2} y={PAD_T + plotH + 14} textAnchor="middle" fontSize={9} fill="#6b7280">
                {d.label.length > 6 ? d.label.substring(0, 5) + '…' : d.label}
              </SvgText>
              {barH > 14 && (
                <SvgText x={x + barW / 2} y={y + 12} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="700">
                  {d.value}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ── Line Chart ────────────────────────────────────────────────────────────────
export function LineChart({ data, width = 320, height = 160, color = '#10b981', label = '' }) {
  if (!data || data.length < 2) return null;

  const PAD_L = 36, PAD_B = 32, PAD_T = 12, PAD_R = 12;
  const plotW = width - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const toX = (i) => PAD_L + (i / (data.length - 1)) * plotW;
  const toY = (v) => PAD_T + plotH - ((v - minVal) / range) * plotH;

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.value)}`)
    .join(' ');

  return (
    <View>
      {label ? <Text style={styles.chartLabel}>{label}</Text> : null}
      <Svg width={width} height={height}>
        <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#d1d5db" strokeWidth={1} />
        <Line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="#d1d5db" strokeWidth={1} />

        {[0, 50, 100].map((pct) => {
          const v = minVal + (pct / 100) * range;
          const y = toY(v);
          return (
            <G key={pct}>
              <Line x1={PAD_L} y1={y} x2={PAD_L + plotW} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <SvgText x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{Math.round(v)}</SvgText>
            </G>
          );
        })}

        <Path d={pathD} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) => (
          <Circle key={i} cx={toX(i)} cy={toY(d.value)} r={4} fill={color} />
        ))}

        {data.map((d, i) => (
          <SvgText key={i} x={toX(i)} y={PAD_T + plotH + 14} textAnchor="middle" fontSize={9} fill="#6b7280">
            {d.label.length > 4 ? d.label.substring(0, 3) + '…' : d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

// ── Donut / Pie Chart ─────────────────────────────────────────────────────────
export function DonutChart({ data, size = 140, label = '' }) {
  if (!data || data.length === 0) return null;

  const cx = size / 2, cy = size / 2;
  const R = size * 0.38, r = size * 0.22;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  let cursor = -Math.PI / 2;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cursor);
    const y1 = cy + R * Math.sin(cursor);
    const x2 = cx + R * Math.cos(cursor + angle);
    const y2 = cy + R * Math.sin(cursor + angle);
    const ix1 = cx + r * Math.cos(cursor);
    const iy1 = cy + r * Math.sin(cursor);
    const ix2 = cx + r * Math.cos(cursor + angle);
    const iy2 = cy + r * Math.sin(cursor + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`;
    cursor += angle;
    return { ...d, path };
  });

  return (
    <View style={styles.donutWrap}>
      {label ? <Text style={styles.chartLabel}>{label}</Text> : null}
      <Svg width={size} height={size}>
        {slices.map((s, i) => <Path key={i} d={s.path} fill={s.color} />)}
        <SvgText x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1f2937">
          {total}
        </SvgText>
      </Svg>
      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendText}>{d.label}: {d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: spacing.xs },
  donutWrap: { alignItems: 'center' },
  legend: { marginTop: spacing.sm, gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6b7280' },
});
