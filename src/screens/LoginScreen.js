import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { FileText, Mail, Lock, User, Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { loginWithEmail, loginAsGuest, selectAuthLoading, selectAuthError, clearError } from '../store/slices/authSlice';
import { lightColors, spacing, radius } from '../theme/tokens';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState('email'); // 'email' | 'guest'

  // Clear any stale errors on mount
  useEffect(() => { dispatch(clearError()); }, []);

  useEffect(() => {
    if (authError) {
      Alert.alert('Sign In Failed', authError, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [authError]);

  const handleEmailLogin = () => {
    if (!email.trim()) { Alert.alert('Required', 'Please enter your email address.'); return; }
    if (!password.trim()) { Alert.alert('Required', 'Please enter your password.'); return; }
    dispatch(loginWithEmail({ email: email.trim(), password }));
  };

  const handleGuestLogin = () => {
    dispatch(loginAsGuest(guestName.trim() || 'Guest'));
  };

  const isEmailValid = email.includes('@') && email.includes('.');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Logo / Brand */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <FileText size={40} color="#fff" strokeWidth={1.5} />
            </View>
            <Text style={styles.appName}>FieldReportX</Text>
            <Text style={styles.appTagline}>Professional field reporting</Text>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'email' && styles.tabBtnActive]}
              onPress={() => setTab('email')}
            >
              <Mail size={15} color={tab === 'email' ? '#fff' : lightColors.textSecondary} strokeWidth={2} />
              <Text style={[styles.tabBtnText, tab === 'email' && styles.tabBtnTextActive]}>
                Email Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'guest' && styles.tabBtnActive]}
              onPress={() => setTab('guest')}
            >
              <User size={15} color={tab === 'guest' ? '#fff' : lightColors.textSecondary} strokeWidth={2} />
              <Text style={[styles.tabBtnText, tab === 'guest' && styles.tabBtnTextActive]}>
                Guest / Local
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email login form */}
          {tab === 'email' && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputRow}>
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

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Lock size={16} color={lightColors.textSecondary} strokeWidth={2} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Your password"
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

              <TouchableOpacity
                style={[styles.primaryBtn, { opacity: (loading || !isEmailValid) ? 0.6 : 1 }]}
                onPress={handleEmailLogin}
                disabled={loading || !isEmailValid}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={styles.primaryBtnText}>Sign In</Text><ChevronRight size={18} color="#fff" strokeWidth={2.5} /></>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.linkBtnText}>
                  Don't have an account? <Text style={styles.linkBtnHighlight}>Create one</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Guest / Local login form */}
          {tab === 'guest' && (
            <View style={styles.form}>
              <View style={[styles.infoBox, { backgroundColor: '#fef3c7' }]}>
                <Text style={styles.infoText}>
                  Guest mode saves reports locally on your device only. You can switch to a full account anytime to enable cloud sync.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Your Name (Optional)</Text>
                <View style={styles.inputRow}>
                  <User size={16} color={lightColors.textSecondary} strokeWidth={2} />
                  <TextInput
                    value={guestName}
                    onChangeText={setGuestName}
                    placeholder="e.g. Jane Smith"
                    placeholderTextColor={lightColors.textSecondary}
                    style={styles.input}
                    autoCorrect={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#6366F1', opacity: loading ? 0.6 : 1 }]}
                onPress={handleGuestLogin}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={styles.primaryBtnText}>Continue as Guest</Text><ChevronRight size={18} color="#fff" strokeWidth={2.5} /></>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },

  brand: { alignItems: 'center', paddingVertical: spacing.xl },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: lightColors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: lightColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: { fontSize: 28, fontWeight: '800', color: lightColors.textPrimary, letterSpacing: -0.5 },
  appTagline: { fontSize: 14, color: lightColors.textSecondary, marginTop: 4 },

  tabRow: { flexDirection: 'row', backgroundColor: lightColors.surface, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.sm },
  tabBtnActive: { backgroundColor: lightColors.primary },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: lightColors.textSecondary },
  tabBtnTextActive: { color: '#fff' },

  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: lightColors.textPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: lightColors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: lightColors.surface, minHeight: 50,
  },
  input: { flex: 1, fontSize: 15, color: lightColors.textPrimary },

  primaryBtn: {
    backgroundColor: lightColors.primary, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, minHeight: 52, marginTop: spacing.xs,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  linkBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  linkBtnText: { fontSize: 14, color: lightColors.textSecondary },
  linkBtnHighlight: { color: lightColors.primary, fontWeight: '600' },

  infoBox: { padding: spacing.md, borderRadius: radius.md },
  infoText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
});
