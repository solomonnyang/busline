import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { biometricLabel, getSupportedBiometric, hasBiometricsEnabled } from '../../utils/biometrics';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type LoginRoute = RouteProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const route = useRoute<LoginRoute>();
  const { login, completeTwoFactorLogin, biometricSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tfaToken, setTfaToken] = useState(route.params?.tfaToken ?? '');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(!!route.params?.tfaToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bioLabel, setBioLabel] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const kind = await getSupportedBiometric();
      if (!active || !kind) return;
      const enabled = await hasBiometricsEnabled();
      if (!active || !enabled) return;
      setBioLabel(Platform.OS === 'android' ? 'biometrics' : biometricLabel(kind));
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit() {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.requires_verification) {
        navigation.replace('VerifyEmail', { email: result.email });
        return;
      }
      if (result.requires_2fa) {
        setTfaToken(result.tfa_token);
        setRequiresTwoFactor(true);
        setError('');
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCode() {
    setError('');
    if (!code.trim()) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      await completeTwoFactorLogin(tfaToken, code.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onBiometricSignIn() {
    setError('');
    setLoading(true);
    try {
      const res = await biometricSignIn();
      if (res.status === 'two-factor') {
        setTfaToken(res.result.tfa_token);
        setRequiresTwoFactor(true);
        return;
      }
      if (res.status === 'verification') {
        navigation.replace('VerifyEmail', { email: res.result.email });
        return;
      }
      if (res.status === 'cancelled') return;
      if (res.status === 'failed') {
        setError('Could not verify your biometrics. Try again.');
        return;
      }
      if (res.status === 'no-credentials' || res.status === 'unavailable') {
        setError('Biometric sign-in is not set up. Enable it in Security settings.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Biometric sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    setRequiresTwoFactor(false);
    setTfaToken('');
    setCode('');
    setError('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.brand}>
            <LinearGradient
              colors={[colors.teal, isDark ? '#F59E0B' : '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Ionicons name="bus" size={30} color={colors.surface} />
            </LinearGradient>
            <Text style={styles.appName}>BusLine</Text>
            <Text style={styles.tagline}>Book bus tickets anywhere in Nigeria</Text>
          </View>

          {!requiresTwoFactor ? (
            <View style={styles.form}>
              <View style={styles.accentBar} />
              <Text style={styles.heading}>Welcome back</Text>
              <Text style={styles.subheading}>Sign in to continue booking</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <FormTextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                icon="mail-outline"
              />
              <FormTextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                icon="lock-closed-outline"
              />

              <View style={styles.forgotRow}>
                <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </Pressable>
              </View>

              <PrimaryButton label="Sign in" onPress={onSubmit} loading={loading} />

              {bioLabel ? (
                <>
                  <View style={styles.dividerRow}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.divider} />
                  </View>
                  <Pressable
                    onPress={onBiometricSignIn}
                    disabled={loading}
                    style={({ pressed }) => [styles.bioBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="finger-print" size={22} color={colors.teal} />
                    <Text style={styles.bioBtnText}>Sign in with {bioLabel}</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.codeBadge}>
                <Ionicons name="shield-checkmark" size={22} color={colors.surface} />
              </View>
              <Text style={styles.heading}>Two-step verification</Text>
              <Text style={styles.subheading}>
                Enter the 6-digit code from your Google Authenticator app
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <FormTextInput
                label="Authenticator code"
                value={code}
                onChangeText={setCode}
                placeholder="••••••"
                keyboardType="number-pad"
                maxLength={6}
                icon="keypad-outline"
              />

              <PrimaryButton
                label="Verify and sign in"
                onPress={onSubmitCode}
                loading={loading}
              />

              <Pressable onPress={backToLogin} style={styles.backRow}>
                <Ionicons name="arrow-back" size={14} color={colors.muted} />
                <Text style={styles.backText}>Back to sign in</Text>
              </Pressable>
            </View>
          )}

          {!requiresTwoFactor ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Pressable onPress={() => navigation.navigate('Register')}>
                <Text style={styles.link}>Create one</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    flex: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 48,
    },
    brand: {
      alignItems: 'center',
      marginBottom: 36,
    },
    logo: {
      width: 68,
      height: 68,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      ...shadow.md,
    },
    appName: {
      fontSize: 28,
      fontWeight: font.bold,
      color: colors.text,
    },
    tagline: {
      fontSize: 16,
      color: colors.muted,
      marginTop: 4,
    },
    form: {
      flex: 1,
    },
    heading: {
      fontSize: 24,
      fontWeight: font.bold,
      color: colors.text,
    },
    subheading: {
      fontSize: 16,
      color: colors.muted,
      marginBottom: 20,
      marginTop: 2,
    },
    error: {
      color: colors.danger,
      fontSize: 15,
      marginBottom: 12,
    },
    forgotRow: {
      alignItems: 'flex-end',
      marginBottom: 16,
      marginTop: -4,
    },
    forgotText: {
      color: colors.teal,
      fontSize: 15,
      fontWeight: font.semibold,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 18,
    },
    divider: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: font.semibold,
    },
    bioBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.teal,
      borderRadius: radius.pill,
      paddingVertical: 14,
      marginTop: 12,
    },
    bioBtnText: {
      color: colors.teal,
      fontSize: 16,
      fontWeight: font.bold,
    },
    codeBadge: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      backgroundColor: colors.teal,
      ...shadow.md,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 16,
    },
    backText: {
      color: colors.muted,
      fontSize: 16,
      fontWeight: font.semibold,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 24,
    },
    footerText: {
      color: colors.muted,
      fontSize: 16,
    },
    link: {
      color: colors.teal,
      fontSize: 16,
      fontWeight: font.bold,
    },
    accentBar: {
      width: 32,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.teal,
      marginBottom: 10,
    },
  });
