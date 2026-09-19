import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/types';
import { font, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
type Route = RouteProp<AuthStackParamList, 'VerifyEmail'>;

export function VerifyEmailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { verifyEmail, resendVerification } = useAuth();
  const [email, setEmail] = useState(route.params.email || '');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function onSubmit() {
    setError('');
    if (!email.trim() || code.trim().length !== 6) {
      setError('Enter your email and the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email.trim(), code.trim());
      setVerified(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setResending(true);
    try {
      await resendVerification(email.trim());
      setInfo('A new code has been sent to your inbox.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resend failed.');
    } finally {
      setResending(false);
    }
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
              colors={[colors.primary, colors.primaryDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Ionicons name="mail-unread" size={30} color={colors.ink} />
            </LinearGradient>
            <Text style={styles.appName}>Verify your email</Text>
            <Text style={styles.tagline}>Enter the 6-digit code we emailed you</Text>
          </View>

          {!verified ? (
            <View style={styles.form}>
              <Text style={styles.heading}>Almost there</Text>
              <Text style={styles.subheading}>
                Confirm your email to activate your BusLine account.
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {info ? <Text style={styles.info}>{info}</Text> : null}

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
                label="Verification code"
                value={code}
                onChangeText={setCode}
                placeholder="••••••"
                keyboardType="number-pad"
                maxLength={6}
                icon="keypad-outline"
              />

              <PrimaryButton label="Verify account" onPress={onSubmit} loading={loading} />

              <Pressable onPress={onResend} style={styles.resendRow} disabled={resending}>
                <Ionicons name="repeat" size={14} color={colors.muted} />
                <Text style={styles.resendText}>{resending ? 'Sending…' : 'Resend code'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.codeBadge}>
                <Ionicons name="checkmark-circle" size={26} color={colors.ink} />
              </View>
              <Text style={styles.heading}>Email verified</Text>
              <Text style={styles.subheading}>
                Your account is active. Sign in to start booking.
              </Text>
              <PrimaryButton
                label="Go to sign in"
                onPress={() => navigation.replace('Login')}
              />
            </View>
          )}
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
    info: {
      color: colors.success,
      fontSize: 15,
      marginBottom: 12,
    },
    resendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 16,
    },
    resendText: {
      color: colors.muted,
      fontSize: 16,
      fontWeight: font.semibold,
    },
    codeBadge: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      backgroundColor: colors.primary,
      ...shadow.md,
    },
  });
