import React, { useState, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Image, PanResponder, Dimensions, Alert, ScrollView,
} from 'react-native';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';
import { X, Trash2, Undo2, Save, Pen, Circle as CircleIcon, ArrowUpRight, Minus } from 'lucide-react-native';
import { spacing, radius } from '../theme/tokens';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#000000'];
const TOOLS = [
  { id: 'pen', label: 'Draw', Icon: Pen },
  { id: 'circle', label: 'Circle', Icon: CircleIcon },
  { id: 'arrow', label: 'Arrow', Icon: ArrowUpRight },
  { id: 'line', label: 'Line', Icon: Minus },
];

const { width: SCREEN_W } = Dimensions.get('window');
const CANVAS_W = SCREEN_W - spacing.md * 2;
const CANVAS_H = CANVAS_W * 0.75;

// onSave(annotations) — receives array of annotation objects for storage
export default function PhotoAnnotationModal({ visible, photoUri, onClose, onSave }) {
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ef4444');
  const [annotations, setAnnotations] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const startPoint = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        startPoint.current = { x: locationX, y: locationY };

        if (tool === 'pen') {
          setCurrentPath({
            type: 'pen',
            color,
            d: `M ${locationX} ${locationY}`,
            points: [{ x: locationX, y: locationY }],
          });
        }
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (tool === 'pen') {
          setCurrentPath((prev) => {
            if (!prev) return prev;
            return { ...prev, d: prev.d + ` L ${locationX} ${locationY}` };
          });
        } else {
          // Preview for shape tools
          setCurrentPath({
            type: tool,
            color,
            x1: startPoint.current.x,
            y1: startPoint.current.y,
            x2: locationX,
            y2: locationY,
          });
        }
      },

      onPanResponderRelease: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(null);
        startPoint.current = null;

        if (tool === 'pen') {
          setAnnotations((prev) => {
            const last = prev[prev.length - 1];
            // commit what was being drawn
            return [...prev, last ?? { type: 'pen', color, d: `M ${locationX} ${locationY}` }];
          });
          // rebuild from the drawn state directly
          setAnnotations((prev) => {
            // replace placeholder we just pushed
            const copy = [...prev];
            copy.pop();
            return copy;
          });
        } else {
          setAnnotations((prev) => [
            ...prev,
            {
              type: tool,
              color,
              x1: startPoint.current?.x ?? locationX,
              y1: startPoint.current?.y ?? locationY,
              x2: locationX,
              y2: locationY,
            },
          ]);
        }
      },
    })
  ).current;

  // Re-create panResponder closure capturing current tool/color
  const livePanResponder = useRef(null);
  // Use a ref-based approach so PanResponder always sees fresh state
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  toolRef.current = tool;
  colorRef.current = color;

  const livePR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        startPoint.current = { x: locationX, y: locationY };
        if (toolRef.current === 'pen') {
          setCurrentPath({ type: 'pen', color: colorRef.current, d: `M ${locationX} ${locationY}` });
        } else {
          setCurrentPath({ type: toolRef.current, color: colorRef.current, x1: locationX, y1: locationY, x2: locationX, y2: locationY });
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (toolRef.current === 'pen') {
          setCurrentPath((prev) => prev ? { ...prev, d: prev.d + ` L ${locationX} ${locationY}` } : prev);
        } else {
          setCurrentPath((prev) => prev ? { ...prev, x2: locationX, y2: locationY } : prev);
        }
      },
      onPanResponderRelease: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setAnnotations((prev) => {
          if (toolRef.current === 'pen') {
            return [...prev, currentPath ?? { type: 'pen', color: colorRef.current, d: `M ${locationX} ${locationY}` }];
          }
          return [...prev, {
            type: toolRef.current,
            color: colorRef.current,
            x1: startPoint.current?.x ?? locationX,
            y1: startPoint.current?.y ?? locationY,
            x2: locationX,
            y2: locationY,
          }];
        });
        setCurrentPath(null);
      },
    })
  ).current;

  const handleUndo = () => setAnnotations((prev) => prev.slice(0, -1));
  const handleClear = () => {
    Alert.alert('Clear Annotations', 'Remove all drawings from this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setAnnotations([]) },
    ]);
  };

  const handleSave = () => {
    onSave && onSave(annotations);
    onClose && onClose();
  };

  const renderAnnotation = (a, idx) => {
    if (a.type === 'pen') {
      return <Path key={idx} d={a.d} stroke={a.color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    }
    if (a.type === 'circle') {
      const cx = (a.x1 + a.x2) / 2;
      const cy = (a.y1 + a.y2) / 2;
      const r = Math.sqrt((a.x2 - a.x1) ** 2 + (a.y2 - a.y1) ** 2) / 2;
      return <Circle key={idx} cx={cx} cy={cy} r={r} stroke={a.color} strokeWidth={3} fill="none" />;
    }
    if (a.type === 'line') {
      return <Line key={idx} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={a.color} strokeWidth={3} strokeLinecap="round" />;
    }
    if (a.type === 'arrow') {
      const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
      const len = 16;
      const ax1 = a.x2 - len * Math.cos(angle - 0.4);
      const ay1 = a.y2 - len * Math.sin(angle - 0.4);
      const ax2 = a.x2 - len * Math.cos(angle + 0.4);
      const ay2 = a.y2 - len * Math.sin(angle + 0.4);
      return (
        <G key={idx}>
          <Line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={a.color} strokeWidth={3} strokeLinecap="round" />
          <Line x1={a.x2} y1={a.y2} x2={ax1} y2={ay1} stroke={a.color} strokeWidth={3} strokeLinecap="round" />
          <Line x1={a.x2} y1={a.y2} x2={ax2} y2={ay2} stroke={a.color} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Annotate Photo</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Canvas */}
          <View style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H }]} {...livePR.panHandlers}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#9ca3af' }}>No image</Text>
              </View>
            )}
            <Svg style={StyleSheet.absoluteFill} width={CANVAS_W} height={CANVAS_H}>
              {annotations.map(renderAnnotation)}
              {currentPath && renderAnnotation(currentPath, 'current')}
            </Svg>
          </View>

          {/* Tool selector */}
          <View style={styles.toolRow}>
            {TOOLS.map(({ id, label, Icon }) => (
              <TouchableOpacity
                key={id}
                style={[styles.toolBtn, tool === id && styles.toolBtnActive]}
                onPress={() => setTool(id)}
              >
                <Icon size={18} color={tool === id ? '#fff' : '#374151'} strokeWidth={2} />
                <Text style={[styles.toolLabel, tool === id && { color: '#fff' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Colour picker */}
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleUndo} disabled={annotations.length === 0}>
              <Undo2 size={18} color={annotations.length === 0 ? '#9ca3af' : '#374151'} strokeWidth={2} />
              <Text style={[styles.actionLabel, annotations.length === 0 && { color: '#9ca3af' }]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleClear}>
              <Trash2 size={18} color="#ef4444" strokeWidth={2} />
              <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSave}>
              <Save size={18} color="#fff" strokeWidth={2} />
              <Text style={[styles.actionLabel, { color: '#fff' }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} drawn
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1f2937', paddingHorizontal: spacing.md, paddingTop: 52, paddingBottom: spacing.md,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: spacing.xs },
  body: { padding: spacing.md, alignItems: 'center', paddingBottom: spacing.xl },

  canvas: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 2, borderColor: '#d1d5db',
    backgroundColor: '#e5e7eb',
    marginBottom: spacing.md,
  },

  toolRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toolBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: spacing.sm,
    borderRadius: radius.sm, borderWidth: 1.5, borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  toolBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  toolLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },

  colorRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: '#1f2937', transform: [{ scale: 1.2 }] },

  actionsRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  saveBtn: { backgroundColor: '#10b981', borderColor: '#10b981', flex: 2 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },

  hint: { fontSize: 11, color: '#9ca3af', marginTop: spacing.sm },
});
