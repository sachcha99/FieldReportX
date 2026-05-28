import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, Alert, Share, FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Share2, Save, ChevronDown, ChevronUp, Palette } from 'lucide-react-native';
import { saveCustomTemplate, deleteCustomTemplate, selectCustomTemplates, importTemplate } from '../store/slices/templatesSlice';
import { lightColors, spacing, radius } from '../theme/tokens';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];

export default function TemplateBuilderScreen({ navigation }) {
  const dispatch = useDispatch();
  const customTemplates = useSelector(selectCustomTemplates);

  const [mode, setMode] = useState('list'); // list | create | edit
  const [editingId, setEditingId] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [sections, setSections] = useState([
    { name: '', checklist: [''] },
  ]);

  const resetForm = () => {
    setName(''); setCategory(''); setColor('#6366F1');
    setSections([{ name: '', checklist: [''] }]);
    setEditingId(null);
  };

  const startCreate = () => { resetForm(); setMode('create'); };

  const startEdit = (tmpl) => {
    setName(tmpl.name);
    setCategory(tmpl.category || '');
    setColor(tmpl.color || '#6366F1');
    setSections(tmpl.sections.map((s) => ({
      name: s.name,
      checklist: Object.keys(s.checklist || {}),
    })));
    setEditingId(tmpl.id);
    setMode('edit');
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Required', 'Template name is required.'); return; }
    const validSections = sections.filter((s) => s.name.trim());
    if (validSections.length === 0) { Alert.alert('Required', 'Add at least one section.'); return; }

    const built = {
      name: name.trim(),
      category: category.trim() || 'Custom',
      color,
      id: editingId || undefined,
      sections: validSections.map((s) => ({
        name: s.name.trim(),
        checklist: Object.fromEntries(
          s.checklist.filter((c) => c.trim()).map((c) => [c.trim(), false])
        ),
      })),
    };

    dispatch(saveCustomTemplate(built));
    Alert.alert('Saved', `Template "${name}" saved.`);
    setMode('list');
    resetForm();
  };

  const handleDelete = (id, tmplName) => {
    Alert.alert('Delete Template', `Delete "${tmplName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteCustomTemplate(id)) },
    ]);
  };

  const handleShare = async (tmpl) => {
    const json = JSON.stringify(tmpl, null, 2);
    await Share.share({
      title: `FieldReportX Template: ${tmpl.name}`,
      message: `FieldReportX Template\n\n${json}`,
    });
  };

  const handleImportFromClipboard = async () => {
    Alert.prompt(
      'Import Template',
      'Paste the template JSON:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: (text) => {
            try {
              const tmpl = JSON.parse(text || '');
              if (!tmpl.name || !tmpl.sections) throw new Error('Invalid template format');
              dispatch(importTemplate(tmpl));
              Alert.alert('Imported', `Template "${tmpl.name}" imported.`);
            } catch {
              Alert.alert('Error', 'Invalid template JSON. Make sure you pasted the full template.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // ─── List view ────────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Template Builder</Text>
          <Text style={styles.sub}>Create and share custom report templates</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={startCreate}>
              <Plus size={16} color="#fff" strokeWidth={2.5} />
              <Text style={styles.primaryBtnText}>New Template</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn]} onPress={handleImportFromClipboard}>
              <Share2 size={16} color={lightColors.primary} strokeWidth={2} />
              <Text style={[styles.secondaryBtnText, { color: lightColors.primary }]}>Import</Text>
            </TouchableOpacity>
          </View>

          {customTemplates.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: lightColors.surface }]}>
              <Text style={styles.emptyTitle}>No Custom Templates</Text>
              <Text style={styles.emptySub}>Tap "New Template" to create your first custom report template.</Text>
            </View>
          ) : (
            customTemplates.map((tmpl) => (
              <View key={tmpl.id} style={[styles.tmplCard, { backgroundColor: lightColors.surface }]}>
                <View style={[styles.tmplColorBar, { backgroundColor: tmpl.color }]} />
                <View style={styles.tmplBody}>
                  <Text style={styles.tmplName}>{tmpl.name}</Text>
                  <Text style={styles.tmplMeta}>{tmpl.category} · {tmpl.sections?.length} sections · v{tmpl.version}</Text>
                  <View style={styles.tmplActions}>
                    <TouchableOpacity style={[styles.tmplBtn, { backgroundColor: tmpl.color }]} onPress={() => startEdit(tmpl)}>
                      <Text style={styles.tmplBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tmplBtn, { backgroundColor: '#6366f1' }]} onPress={() => handleShare(tmpl)}>
                      <Share2 size={12} color="#fff" strokeWidth={2} />
                      <Text style={styles.tmplBtnText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tmplBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleDelete(tmpl.id, tmpl.name)}>
                      <Trash2 size={12} color="#fff" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Create / Edit view ───────────────────────────────────────────────────────
  const addSection = () => setSections((prev) => [...prev, { name: '', checklist: [''] }]);
  const removeSection = (i) => setSections((prev) => prev.filter((_, idx) => idx !== i));
  const updateSectionName = (i, text) => setSections((prev) => prev.map((s, idx) => idx === i ? { ...s, name: text } : s));
  const addChecklistItem = (si) => setSections((prev) => prev.map((s, idx) => idx === si ? { ...s, checklist: [...s.checklist, ''] } : s));
  const removeChecklistItem = (si, ci) => setSections((prev) => prev.map((s, idx) => idx === si ? { ...s, checklist: s.checklist.filter((_, ci2) => ci2 !== ci) } : s));
  const updateChecklistItem = (si, ci, text) => setSections((prev) => prev.map((s, idx) => idx === si ? { ...s, checklist: s.checklist.map((c, ci2) => ci2 === ci ? text : c) } : s));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.formHeader}>
          <Text style={styles.heading}>{mode === 'edit' ? 'Edit Template' : 'New Template'}</Text>
          <TouchableOpacity onPress={() => { setMode('list'); resetForm(); }} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={[styles.fieldCard, { backgroundColor: lightColors.surface }]}>
          <Text style={styles.fieldLabel}>Template Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Building Site Audit"
            style={styles.input}
            placeholderTextColor={lightColors.textSecondary}
          />
          <Text style={styles.fieldLabel}>Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Construction, Health, Custom"
            style={styles.input}
            placeholderTextColor={lightColors.textSecondary}
          />
        </View>

        {/* Colour picker */}
        <View style={[styles.fieldCard, { backgroundColor: lightColors.surface }]}>
          <View style={styles.fieldLabelRow}>
            <Palette size={14} color={lightColors.textSecondary} strokeWidth={2} />
            <Text style={styles.fieldLabel}>Theme Colour</Text>
          </View>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        {/* Sections */}
        <Text style={styles.sectionHeading}>Sections</Text>
        {sections.map((sec, si) => (
          <View key={si} style={[styles.sectionCard, { backgroundColor: lightColors.surface, borderLeftColor: color }]}>
            <View style={styles.sectionRow}>
              <TextInput
                value={sec.name}
                onChangeText={(t) => updateSectionName(si, t)}
                placeholder={`Section ${si + 1} name`}
                style={[styles.input, { flex: 1 }]}
                placeholderTextColor={lightColors.textSecondary}
              />
              {sections.length > 1 && (
                <TouchableOpacity onPress={() => removeSection(si)} style={styles.removeSectionBtn}>
                  <Trash2 size={16} color="#ef4444" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.checklistLabel}>Checklist Items</Text>
            {sec.checklist.map((item, ci) => (
              <View key={ci} style={styles.checklistRow}>
                <TextInput
                  value={item}
                  onChangeText={(t) => updateChecklistItem(si, ci, t)}
                  placeholder={`Item ${ci + 1}`}
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholderTextColor={lightColors.textSecondary}
                />
                {sec.checklist.length > 1 && (
                  <TouchableOpacity onPress={() => removeChecklistItem(si, ci)} style={styles.removeItemBtn}>
                    <Text style={styles.removeItemText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => addChecklistItem(si)} style={styles.addItemBtn}>
              <Plus size={12} color={color} strokeWidth={2.5} />
              <Text style={[styles.addItemText, { color }]}>Add Item</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={[styles.addSectionBtn, { borderColor: color }]} onPress={addSection}>
          <Plus size={16} color={color} strokeWidth={2.5} />
          <Text style={[styles.addSectionText, { color }]}>Add Section</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: color }]} onPress={handleSave}>
          <Save size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.saveBtnText}>{mode === 'edit' ? 'Update Template' : 'Save Template'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  heading: { fontSize: 22, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.xs },
  sub: { fontSize: 13, color: lightColors.textSecondary, marginBottom: spacing.md },

  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: lightColors.primary,
    paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: lightColors.primary,
    backgroundColor: '#fff',
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 13 },

  emptyBox: { padding: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: lightColors.textPrimary, marginBottom: spacing.xs },
  emptySub: { fontSize: 13, color: lightColors.textSecondary, textAlign: 'center' },

  tmplCard: {
    flexDirection: 'row', borderRadius: radius.md, marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  tmplColorBar: { width: 6 },
  tmplBody: { flex: 1, padding: spacing.md },
  tmplName: { fontSize: 15, fontWeight: '700', color: lightColors.textPrimary },
  tmplMeta: { fontSize: 12, color: lightColors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  tmplActions: { flexDirection: 'row', gap: spacing.xs },
  tmplBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: spacing.sm, borderRadius: radius.sm,
  },
  tmplBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  cancelLink: { padding: spacing.xs },
  cancelText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },

  fieldCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: lightColors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm, textTransform: 'uppercase' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: lightColors.border, borderRadius: radius.sm,
    padding: spacing.sm, fontSize: 14, color: lightColors.textPrimary,
    backgroundColor: lightColors.background, marginBottom: spacing.xs,
  },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: '#1f2937', transform: [{ scale: 1.15 }] },

  sectionHeading: { fontSize: 14, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.sm },
  sectionCard: {
    backgroundColor: lightColors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  removeSectionBtn: { padding: spacing.xs },
  checklistLabel: { fontSize: 11, fontWeight: '600', color: lightColors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs, textTransform: 'uppercase' },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  removeItemBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  removeItemText: { fontSize: 20, color: '#ef4444', lineHeight: 22 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs, paddingVertical: spacing.xs },
  addItemText: { fontSize: 12, fontWeight: '600' },

  addSectionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed',
    marginBottom: spacing.md,
  },
  addSectionText: { fontWeight: '600', fontSize: 14 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
