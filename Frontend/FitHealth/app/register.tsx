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
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RegisterScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { register } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Real-time validation errors
  const [emailErrorValidation, setEmailErrorValidation] = useState<string | null>(null);
  const [usernameErrorValidation, setUsernameErrorValidation] = useState<string | null>(null);
  const [passwordErrorValidation, setPasswordErrorValidation] = useState<string | null>(null);
  const [confirmPasswordErrorValidation, setConfirmPasswordErrorValidation] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) setEmailErrorValidation('El email es obligatorio');
    else if (!emailRegex.test(text)) setEmailErrorValidation('Formato de email inválido');
    else setEmailErrorValidation(null);
  };

  const validateUsername = (text: string) => {
    setUsername(text);
    if (!text) setUsernameErrorValidation('El nombre de usuario es obligatorio');
    else if (text.length < 3) setUsernameErrorValidation('Mínimo 3 caracteres');
    else setUsernameErrorValidation(null);
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    if (!text) setPasswordErrorValidation('La contraseña es obligatoria');
    else if (text.length < 6) setPasswordErrorValidation('La contraseña debe tener al menos 6 caracteres');
    else setPasswordErrorValidation(null);

    // Validate confirmation against the new password
    if (confirmPassword && text !== confirmPassword) {
      setConfirmPasswordErrorValidation('Las contraseñas no coinciden');
    } else if (confirmPassword && text === confirmPassword) {
      setConfirmPasswordErrorValidation(null);
    }
  };

  const validateConfirmPassword = (text: string) => {
    setConfirmPassword(text);
    if (!text) setConfirmPasswordErrorValidation('Confirma tu contraseña');
    else if (text !== password) setConfirmPasswordErrorValidation('Las contraseñas no coinciden');
    else setConfirmPasswordErrorValidation(null);
  };

  const handleRegister = async () => {
    setError(null);
    
    // Check if any fields are empty 
    if (!email || !username || !password || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    // Refuse submission if there remain real-time errors
    if (emailErrorValidation || usernameErrorValidation || passwordErrorValidation || confirmPasswordErrorValidation) {
      setError('Corrige los errores antes de continuar');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), username.trim(), password, role);
      // Tras registrar con éxito, vamos a la pantalla de aviso.
      router.replace('/verify-notice');
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('No se pudo crear la cuenta. Verifica tus datos.');
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
          <Text style={[styles.subtitle, { color: colors.primary }]}>Crea tu cuenta</Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.card }]}>
          <Text style={[styles.formTitle, { color: colors.primary }]}>Registro</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.primaryLight ?? '#F1F8E9', borderColor: colors.border, color: colors.text }, emailErrorValidation ? { borderColor: '#D32F2F', borderWidth: 1 } : {}]}
            placeholder="Email"
            placeholderTextColor="#8E9AAF"
            value={email}
            onChangeText={validateEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {emailErrorValidation && <Text style={{ color: colors.danger ?? '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{emailErrorValidation}</Text>}

          <TextInput
            style={[styles.input, { backgroundColor: colors.primaryLight ?? '#F1F8E9', borderColor: colors.border, color: colors.text }, usernameErrorValidation ? { borderColor: '#D32F2F', borderWidth: 1 } : {}]}
            placeholder="Nombre de usuario"
            placeholderTextColor="#8E9AAF"
            value={username}
            onChangeText={validateUsername}
            autoCapitalize="none"
          />
          {usernameErrorValidation && <Text style={{ color: colors.danger ?? '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{usernameErrorValidation}</Text>}

          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input, 
                styles.passwordInput,
                passwordErrorValidation ? { borderColor: '#D32F2F', borderWidth: 1 } : {}
              ]}
              placeholder="Contraseña"
              placeholderTextColor="#8E9AAF"
              value={password}
              onChangeText={validatePassword}
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
          {passwordErrorValidation && <Text style={{ color: colors.danger ?? '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{passwordErrorValidation}</Text>}

          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input, 
                styles.passwordInput,
                confirmPasswordErrorValidation ? { borderColor: '#D32F2F', borderWidth: 1 } : {}
              ]}
              placeholder="Confirmar contraseña"
              placeholderTextColor="#8E9AAF"
              value={confirmPassword}
              onChangeText={validateConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? 'eye-off' : 'eye'} 
                size={24} 
                color={colors.icon} 
              />
            </TouchableOpacity>
          </View>
          {confirmPasswordErrorValidation && <Text style={{ color: colors.danger ?? '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{confirmPasswordErrorValidation}</Text>}

          {/* Role selector */}
          <View style={styles.roleContainer}>
            <Text style={[styles.roleLabel, { color: colors.text }]}>Soy:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[styles.roleButton, { borderColor: colors.border }, role === 'patient' && { borderColor: colors.primary, backgroundColor: 'rgba(21, 101, 192, 0.1)' }]}
                onPress={() => setRole('patient')}
              >
                <Text style={[styles.roleButtonText, { color: colors.icon }, role === 'patient' && { color: colors.primary }]}>
                  Paciente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, { borderColor: colors.border }, role === 'doctor' && { borderColor: colors.primary, backgroundColor: 'rgba(21, 101, 192, 0.1)' }]}
                onPress={() => setRole('doctor')}
              >
                <Text style={[styles.roleButtonText, { color: colors.icon }, role === 'doctor' && { color: colors.primary }]}>
                  Doctor
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.linkContainer}>
            <Text style={[styles.linkText, { color: colors.text }]}>
              ¿Ya tienes cuenta?{' '}
              <Text style={[styles.linkBold, { color: colors.primary }]}>Inicia Sesión</Text>
            </Text>
          </TouchableOpacity>
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
    marginBottom: 32,
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
    paddingRight: 50,
    marginBottom: 14,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 1,
  },
  roleContainer: {
    marginBottom: 14,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  roleButtonTextActive: {
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
