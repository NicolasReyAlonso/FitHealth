import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Real-time validation states
  const [emailErrorValidation, setEmailErrorValidation] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) {
      setEmailErrorValidation(t('auth.email_required'));
    } else if (!emailRegex.test(text)) {
      setEmailErrorValidation(t('auth.invalid_email'));
    } else {
      setEmailErrorValidation(null);
    }
  };

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError(t('auth.fill_all'));
      return;
    }
    if (emailErrorValidation) {
      setError(t('auth.fix_errors'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(err.response.data.detail || t('auth.verify_email_first'));
      } else {
        setError(t('auth.wrong_credentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🏃‍♂️</Text>
          <Text style={[styles.title, { color: colors.text }]}>FitHealth</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>{t('auth.tagline')}</Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.card }]}>
          <Text style={[styles.formTitle, { color: colors.primary }]}>{t('auth.login_title')}</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.primaryLight ?? '#F1F8E9', borderColor: colors.border, color: colors.text }, emailErrorValidation ? { borderColor: colors.danger ?? '#D32F2F', borderWidth: 1 } : {}]}
            placeholder={t('auth.email')}
            placeholderTextColor="#8E9AAF"
            value={email}
            onChangeText={validateEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {emailErrorValidation && <Text style={{ color: colors.danger ?? '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{emailErrorValidation}</Text>}

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.primaryLight ?? '#F1F8E9', borderColor: colors.border, color: colors.text }, styles.passwordInput]}
              placeholder={t('auth.password')}
              placeholderTextColor="#8E9AAF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={24} 
                color={colors.icon} 
              />
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login_button')}</Text>
            )}
          </TouchableOpacity>

          <Link href="/register" asChild>
            <TouchableOpacity style={styles.linkContainer}>
              <Text style={[styles.linkText, { color: colors.text }]}>
                {t('auth.no_account')}{' '}
                <Text style={[styles.linkBold, { color: colors.primary }]}>{t('auth.sign_up')}</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  form: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 0, 
  },
  passwordInput: {
    paddingRight: 50, // space for the eye icon
    marginBottom: 14,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 1,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
  linkBold: {
    fontWeight: '700',
  },
});
