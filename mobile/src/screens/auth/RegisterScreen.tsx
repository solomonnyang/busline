import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const TOTAL_STEPS = 3;

const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /\d/.test(pw) },
  { label: 'One symbol (!@#$…)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function passwordChecks(pw: string): boolean[] {
  return PASSWORD_RULES.map((r) => r.test(pw));
}

function passwordScore(pw: string): number {
  return passwordChecks(pw).filter(Boolean).length;
}

export function RegisterScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const { register } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detailsValid = name.trim().length >= 2 && email.trim().length > 0 && phone.trim().length > 0;
  const strongPassword = password.length > 0 && passwordChecks(password).every(Boolean);
  const passwordValid = strongPassword && password === confirm && confirm.length > 0;
  const canContinue = step === 0 ? detailsValid : step === 1 ? passwordValid : agree;
  const checks = passwordChecks(password);
  const score = checks.filter(Boolean).length;

  function back() {
    setError('');
    if (step === 0) {
      navigation.goBack();
      return;
    }
    setStep(step - 1);
  }

  async function createAccount() {
    setError('');
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        referral_code: referralCode.trim() || undefined,
      });
      navigation.replace('VerifyEmail', { email: email.trim() });
    } catch (e) {
      const err = e as ApiError;
      if (err.errors && err.errors.email) {
        setError(err.errors.email);
      } else {
        setError(err.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  function continuePressed() {
    setError('');
    if (step === 0 && !detailsValid) {
      setError('Please enter your full name, email and phone number to continue.');
      return;
    }
    if (step === 1 && !passwordValid) {
      if (password.length < 8) setError('Password must be at least 8 characters.');
      else if (!strongPassword)
        setError('Password must include uppercase, lowercase, a number and a symbol.');
      else setError('Passwords do not match.');
      return;
    }
    if (step === TOTAL_STEPS - 1) {
      if (!agree) {
        setError('Please agree to the terms to continue.');
        return;
      }
      void createAccount();
      return;
    }
    setStep(step + 1);
  }

  function renderStep() {
    if (step === 0) {
      return (
        <>
          <View style={styles.stepHeader}>
            <View style={[styles.stepIcon, styles.stepIconTeal]}>
              <Ionicons name="person-outline" size={22} color={colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Your details</Text>
            <Text style={styles.stepSub}>Tell us a little about yourself.</Text>
          </View>

          <FormTextInput
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            autoCapitalize="words"
            icon="person-outline"
          />
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
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+234 800 000 0000"
            keyboardType="phone-pad"
            icon="call-outline"
          />
          <FormTextInput
            label="Referral code (optional)"
            value={referralCode}
            onChangeText={(v) => setReferralCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="BL…"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={50}
            icon="gift-outline"
          />
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <View style={styles.stepHeader}>
            <View style={[styles.stepIcon, styles.stepIconTeal]}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Secure your account</Text>
            <Text style={styles.stepSub}>Create a strong password to protect your account.</Text>
          </View>

          <FormTextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters with symbols"
            secureTextEntry
            autoCapitalize="none"
            icon="lock-closed-outline"
          />
          <FormTextInput
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat your password"
            secureTextEntry
            autoCapitalize="none"
            icon="lock-closed-outline"
          />

          {password.length > 0 ? (
            <>
              <View style={styles.strengthWrap}>
                <View style={styles.strengthTrack}>
                  {PASSWORD_RULES.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSeg,
                        checks[i] && styles.strengthSegOn,
                        i === score - 1 && score === PASSWORD_RULES.length ? styles.strengthSegStrong : null,
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthText, score === PASSWORD_RULES.length && styles.strengthTextStrong]}>
                  {score === 0
                    ? 'Very weak'
                    : score <= 2
                      ? 'Weak'
                      : score <= 4
                        ? 'Good'
                        : 'Strong'}
                </Text>
              </View>

              {PASSWORD_RULES.map((rule, i) => (
                <View key={rule.label} style={styles.ruleRow}>
                  <Ionicons
                    name={checks[i] ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={checks[i] ? colors.teal : colors.mutedLight}
                  />
                  <Text style={[styles.ruleText, checks[i] && styles.ruleTextPassed]}>{rule.label}</Text>
                </View>
              ))}

              <View style={styles.ruleRow}>
                <Ionicons
                  name={password === confirm && password.length > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={password === confirm && password.length > 0 ? colors.teal : colors.mutedLight}
                />
                <Text style={[styles.ruleText, password === confirm && password.length > 0 && styles.ruleTextPassed]}>
                  Passwords match
                </Text>
              </View>
            </>
          ) : null}
        </>
      );
    }

    return (
      <>
<View style={styles.stepHeader}>
            <View style={[styles.stepIcon, styles.stepIconTeal]}>
              <Ionicons name="checkmark-done-outline" size={22} color={colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Almost done</Text>
            <Text style={styles.stepSub}>Review your details before creating your account.</Text>
          </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Name</Text>
            <Text style={styles.summaryValue}>{name.trim()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Email</Text>
            <Text style={styles.summaryValue}>{email.trim()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phone</Text>
            <Text style={styles.summaryValue}>{phone.trim()}</Text>
          </View>
          {referralCode.trim() ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Referral</Text>
              <Text style={styles.summaryValue}>{referralCode.trim()}</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => setAgree(!agree)}
          style={({ pressed }) => [styles.agreeRow, pressed && { opacity: 0.8 }]}
        >
          <View style={[styles.checkbox, agree && styles.checkboxOn]}>
            {agree ? <Ionicons name="checkmark" size={18} color={colors.surface} /> : null}
          </View>
          <Text style={styles.agreeText}>
            I agree to the <Text style={styles.agreeLink}>Terms of Service</Text> and{' '}
            <Text style={styles.agreeLink}>Privacy Policy</Text>.
          </Text>
        </Pressable>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={back} hitSlop={12} style={styles.back}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.heading}>Create account</Text>
          </View>

          <View style={styles.progress}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View key={i} style={[styles.progressBar, i <= step && styles.progressBarOn]} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {renderStep()}

          <View style={styles.footer}>
            <Pressable onPress={back} hitSlop={10} style={styles.backLink}>
              <Ionicons name="arrow-back" size={17} color={colors.text} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <View style={styles.action}>
              <PrimaryButton
                label={step === TOTAL_STEPS - 1 ? 'Create account' : 'Continue'}
                onPress={continuePressed}
                loading={loading}
                disabled={!canContinue}
                icon={step === TOTAL_STEPS - 1 ? 'checkmark-circle-outline' : 'arrow-forward'}
              />
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
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
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
    },
    back: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    heading: {
      fontSize: 24,
      fontWeight: font.bold,
      color: colors.text,
    },
    progress: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 20,
    },
    progressBar: {
      flex: 1,
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
    },
    progressBarOn: {
      backgroundColor: colors.teal,
    },
    stepHeader: {
      marginBottom: 18,
    },
    stepIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    stepIconTeal: {
      backgroundColor: colors.tealSoft,
      borderColor: colors.teal,
    },
    stepTitle: {
      fontSize: 20,
      fontWeight: font.bold,
      color: colors.text,
    },
    stepSub: {
      fontSize: 15,
      color: colors.muted,
      marginTop: 4,
      lineHeight: 21,
    },
    error: {
      color: colors.danger,
      fontSize: 15,
      marginBottom: 12,
    },
    strengthWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
      marginBottom: 4,
    },
    strengthTrack: {
      flex: 1,
      flexDirection: 'row',
      gap: 4,
    },
    strengthSeg: {
      flex: 1,
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
    },
    strengthSegOn: {
      backgroundColor: colors.teal,
    },
    strengthSegStrong: {
      backgroundColor: colors.success,
    },
    strengthText: {
      fontSize: 13,
      fontWeight: font.bold,
      color: colors.muted,
    },
    strengthTextStrong: {
      color: colors.success,
    },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    ruleText: {
      fontSize: 14,
      color: colors.muted,
    },
    ruleTextPassed: {
      color: colors.text,
    },
    summaryCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
      marginBottom: 20,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.muted,
    },
    summaryValue: {
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.text,
      flexShrink: 1,
      textAlign: 'right',
    },
    agreeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: {
      backgroundColor: colors.teal,
      borderColor: colors.teal,
    },
    agreeText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      lineHeight: 21,
    },
    agreeLink: {
      fontWeight: font.bold,
      color: colors.teal,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 24,
    },
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingRight: 16,
    },
    backText: {
      fontSize: 16,
      fontWeight: font.semibold,
      color: colors.text,
    },
    action: {
      flex: 1,
      maxWidth: 240,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    footerText: {
      color: colors.muted,
      fontSize: 16,
    },
    link: {
      color: colors.text,
      fontSize: 16,
      fontWeight: font.bold,
    },
  });