import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Mail, Lock, User, Eye, EyeOff, ChevronLeft, CheckCircle } from 'lucide-react-native';
import { registerWithEmail, selectAuthLoading, selectAuthError, clearError } from '../store/slices/authSlice';
import { lightColors, spacing, radius } from '../theme/tokens';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Clear any stale errors (e.g. from LoginScreen) on mount
  useEffect(() => { dispatch(clearError()); }, []);

  useEffect(() => {
    if (authError) {
      Alert.alert('Registration Failed', authError, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [authError]);

  const isEmailValid = email.includes('@') && email.includes('.');
  const isPasswordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isEmailValid && isPasswordValid && passwordsMatch && !loading;

  const handleRegister = () => {
    if (!isEmailValid) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    if (!isPasswordValid) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (!passwordsMatch) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    dispatch(registerWithEmail({ email: email.trim(), password }));
  };

  const requirements = [
    { label: 'Valid email address', met: isEmailValid },
    { label: 'At least 6 characters', met: isPasswordValid },
    { label: 'Passwords match', met: passwordsMatch && confirmPassword.length > 0 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={20} color={lightColors.primary} strokeWidth={2.5} />
            <Text style={styles.backBtnText}>Back to Login</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subheading}>Set up your FieldReportX account to sync reports across devices.</Text>

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputRow, isEmailValid && email.length > 0 && styles.inputValid]}>
                <Mail size={16} color={lightColors.textSecondary} strokeWidth={2} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={lightColors.textSecondary}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, isPasswordValid && styles.inputValid]}>
                <Lock size={16} color={lightColors.textSecondary} strokeWidth={2} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={lightColors.textSecondary}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword
                    ? <EyeOff size={16} color={lightColors.textSecondary} strokeWidth={2} />
                    : <Eye size={16} color={lightColors.textSecondary} strokeWidth={2} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm password */}
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputRow, passwordsMatch && confirmPassword.length > 0 && styles.inputValid]}>
                <Lock size={16} color={lightColors.textSecondary} strokeWidth={2} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  placeholderTextColor={lightColors.textSecondary}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Requirements checklist */}
            <View style={styles.requirements}>
              {requirements.map((req) => (
                <View key={req.label} style={styles.reqRow}>
                  <CheckCircle
                    size={14}
                    color={req.met ? '#10b981' : lightColors.border}
                    strokeWidth={2.5}
                  />
                  <Text style={[styles.reqText, req.met && styles.reqTextMet]}>
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { opacity: canSubmit ? 1 : 0.5 }]}
              onPress={handleRegister}
              disabled={!canSubmit}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Create Account</Text>}
            </TouchableOpacity>

            {/* <View style={[styles.noteBox, { backgroundColor: lightColors.surface }]}>
              <Text style={styles.noteText}>
                If Firebase is not configured, accounts won't sync to the cloud. Use Guest mode to work fully offline.
              </Text>
            </View> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg },
  backBtnText: { color: lightColors.primary, fontWeight: '600', fontSize: 14 },

  heading: { fontSize: 26, fontWeight: '800', color: lightColors.textPrimary, marginBottom: spacing.xs },
  subheading: { fontSize: 14, color: lightColors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },

  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: lightColors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: lightColors.surface, minHeight: 50,
  },
  inputValid: { borderColor: '#10b981' },
  input: { flex: 1, fontSize: 15, color: lightColors.textPrimary },

  requirements: { gap: spacing.xs, padding: spacing.md, backgroundColor: lightColors.surface, borderRadius: radius.md },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reqText: { fontSize: 13, color: lightColors.textSecondary },
  reqTextMet: { color: '#10b981', fontWeight: '500' },

  primaryBtn: {
    backgroundColor: lightColors.primary, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, minHeight: 52,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  noteBox: { padding: spacing.md, borderRadius: radius.md },
  noteText: { fontSize: 12, color: lightColors.textSecondary, lineHeight: 17 },
});
