import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthContext';
import { ApiError } from '../services/api';

const logo = require('../../assets/icon.png');

const SigninScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Informe e-mail e senha para continuar.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await login({ email, password, rememberMe });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível conectar à API. Verifique se o servidor está no ar.',
      );
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image source={logo} style={styles.logo} />
          <Text style={styles.brandText}>School Lab</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Entre para acessar o dashboard</Text>

          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="Your Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!submitting}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Your Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setError('');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              editable={!submitting}
            />
            {password.length > 0 && (
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRememberMe((prev) => !prev)}
            hitSlop={8}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color={colors.textPrimary} />}
            </View>
            <Text style={styles.rememberLabel}>Remember me</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.submit, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logo: { width: 28, height: 28, borderRadius: 6, marginRight: 8 },
  brandText: { color: colors.textPrimary, fontSize: 20, fontWeight: '600', letterSpacing: 0.5 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  field: { marginBottom: 14, justifyContent: 'center' },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
  },
  inputWithIcon: { paddingRight: 44 },
  eyeButton: { position: 'absolute', right: 14, top: 14 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 2 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberLabel: { color: colors.textSecondary, fontSize: 14 },
  error: { color: colors.error, fontSize: 13, marginBottom: 12, letterSpacing: 0.2 },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});

export default SigninScreen;
