import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword } from '../../api/endpoints';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/types';
import { font, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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
              <Ionicons name="key" size={30} color={colors.ink} />
            </LinearGradient>
            <Text style={styles.appName}>BusLine</Text>
            <Text style={styles.tagline}>Reset your password</Text>
          </View>

          {!sent ? (
            <View style={styles.form}>
              <Text style={styles.heading}>Forgot your password?</Text>
              <Text style={styles.subheading}>
                Enter the email you signed up with and we'll send you a secure reset link.
              </Text>

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

              <PrimaryButton label="Send reset link" onPress={onSubmit} loading={loading} />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.codeBadge}>
                <Ionicons name="mail-open-outline" size={22} color={colors.ink} />
              </View>
              <Text style={styles.heading}>Check your inbox</Text>
              <Text style={styles.subheading}>
                If an account exists for {email.trim()}, a password reset link is on its way. The
                link expires in 1 hour.
              </Text>
            </View>
          )}

          {!sent ? (
            <View style={styles.footer}>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Back to sign in</Text>
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
      lineHeight: 23,
    },
    error: {
      color: colors.danger,
      fontSize: 15,
      marginBottom: 12,
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
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 24,
    },
    link: {
      color: colors.text,
      fontSize: 16,
      fontWeight: font.bold,
    },
  });
