import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import {
  Home, Car, Heart, Wrench, Scale, Truck, FileText,
  Camera, Mic, MapPin, Activity, ChevronRight,
} from 'lucide-react-native';
import { lightColors, spacing, radius } from '../theme/tokens';

const TEMPLATES = [
  {
    id: 'rental',
    name: 'Rental Inspection',
    type: 'rental',
    color: '#2563EB',
    Icon: Home,
    description: 'Move-in/out property condition documentation',
    features: ['Room-by-room checklists', 'GPS-tagged photos', 'Comparison with previous reports'],
    navTarget: 'CreateRental',
    isRental: true,
  },
  {
    id: 'trades',
    name: 'Trades Report',
    type: 'trades',
    color: '#F59E0B',
    Icon: Wrench,
    description: 'Electrician, plumber, fitter & turner work verification',
    features: ['Before & after photos', 'Compliance checklists', 'GPS-tagged evidence'],
    navTarget: 'CreateReport',
  },
  {
    id: 'legal',
    name: 'Legal & Forensic',
    type: 'legal',
    color: '#06B6D4',
    Icon: Scale,
    description: 'Evidence collection, witness statements, chain of custody',
    features: ['Audio recordings', 'Screenshot uploads', 'Chain-of-custody log', 'Document attachments'],
    navTarget: 'CreateReport',
  },
  {
    id: 'driving',
    name: 'Driving Test Report',
    type: 'driving',
    color: '#8B5CF6',
    Icon: Car,
    description: 'Driving behaviour assessment with sensor data',
    features: ['Accelerometer smoothness score', 'GPS route tracking', 'Speed monitoring'],
    navTarget: 'CreateReport',
  },
  {
    id: 'rehab',
    name: 'Patient Rehabilitation',
    type: 'rehab',
    color: '#EC4899',
    Icon: Heart,
    description: 'Track patient recovery and movement performance',
    features: ['Session tracking', 'Scored assessments', 'Progress comparison', 'Clinician notes'],
    navTarget: 'CreateReport',
  },
  {
    id: 'general',
    name: 'General Report',
    type: 'general',
    color: '#6366F1',
    Icon: FileText,
    description: 'Notes, journals, sport, coaching, hobby reports',
    features: ['Flexible checklists', 'Photo evidence', 'Audio notes'],
    navTarget: 'CreateReport',
  },
  {
    id: 'service',
    name: 'Service Delivery',
    type: 'service',
    color: '#10B981',
    Icon: Truck,
    description: 'Delivery routes, stop tracking, GPS monitoring',
    features: ['Live GPS route', 'Speed tracking', 'Stop-by-stop sign-off'],
    navTarget: 'CreateReport',
  },
];

export default function TemplateLibraryScreen({ navigation }) {
  const handleSelect = (template) => {
    if (template.isRental) {
      navigation.navigate('HomeStack', { screen: 'CreateRental' });
    } else {
      navigation.navigate('HomeStack', {
        screen: 'CreateReport',
        params: { reportType: template.type },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lightColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Report Templates</Text>
        <Text style={styles.subtitle}>Choose a template to start a new report</Text>

        {TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[styles.card, { borderLeftColor: template.color, borderLeftWidth: 4 }]}
            onPress={() => handleSelect(template)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: template.color }]}>
                <template.Icon size={26} color="#fff" strokeWidth={2} />
              </View>
              <View style={styles.cardTitleArea}>
                <Text style={styles.cardTitle}>{template.name}</Text>
                <Text style={styles.cardDesc}>{template.description}</Text>
              </View>
              <ChevronRight size={20} color={lightColors.textSecondary} strokeWidth={2} />
            </View>

            <View style={styles.features}>
              {template.features.map((f, i) => (
                <View key={i} style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: template.color }]} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { fontSize: 24, fontWeight: '700', color: lightColors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontSize: 13, color: lightColors.textSecondary, marginBottom: spacing.lg },

  card: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  iconBox: {
    width: 52, height: 52, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cardTitleArea: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: lightColors.textPrimary },
  cardDesc: { fontSize: 12, color: lightColors.textSecondary, marginTop: 2, lineHeight: 16 },

  features: { gap: 4 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { fontSize: 12, color: lightColors.textSecondary },
});
