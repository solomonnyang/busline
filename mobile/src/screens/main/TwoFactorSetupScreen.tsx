import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as apiEndpoints from '../../api/endpoints';
import type { TwoFactorSetup } from '../../api/types';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { biometricLabel, getSupportedBiometric, hasBiometricsEnabled } from '../../utils/biometrics';

type Props = NativeStackScreenProps<MainStackParamList, 'TwoFactor'>;

export function TwoFactorSetupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { enableBiometrics, disableBiometrics } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [backupCodesLeft, setBackupCodesLeft] = useState(0);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [bioSupported, setBioSupported] = useState(false);
  const [bioLabel, setBioLabel] = useState('');
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioPassword, setBioPassword] = useState('');
  const [showBioPassword, setShowBioPassword] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const status = await apiEndpoints.fetchTwoFactorStatus();
    setEnabled(status.enabled);
    setBackupCodesLeft(status.backup_codes_left);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatus().catch(() => setLoading(false));
  }, [loadStatus]);

  useEffect(() => {
    let active = true;
    (async () => {
      const kind = await getSupportedBiometric();
      if (!active) return;
      if (kind) {
        setBioSupported(true);
        setBioLabel(biometricLabel(kind));
      }
      const enabledBio = await hasBiometricsEnabled();
      if (!active) return;
      setBioEnabled(enabledBio);
    })();
    return () => {
      active = false;
    };
  }, []);

  function onToggleBio(value: boolean) {
    setError('');
    setMessage('');
    if (value) {
      setShowBioPassword(true);
    } else {
      disableBiometrics()
        .then(() => {
          setBioEnabled(false);
          setMessage('Biometric sign-in disabled.');
        })
        .catch(() => setError('Could not disable biometric sign-in.'));
    }
  }

  async function confirmEnableBio() {
    setError('');
    setMessage('');
    if (!bioPassword) {
      setError('Enter your password to enable biometric sign-in.');
      return;
    }
    setBioBusy(true);
    try {
      const profile = await apiEndpoints.fetchProfile();
      const email = profile.user.email;
      await apiEndpoints.login(email, bioPassword);
      await enableBiometrics(email, bioPassword);
      setBioEnabled(true);
      setShowBioPassword(false);
      setBioPassword('');
      setMessage(`Biometric sign-in enabled. Sign in with ${bioLabel || 'your fingerprint'} on the login screen.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enable biometric sign-in.');
    } finally {
      setBioBusy(false);
    }
  }

  function dismissCodes() {
    setBackupCodes([]);
    setMessage('');
  }

  async function startSetup() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      setSetup(await apiEndpoints.setupTwoFactor());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed.');
    } finally {
      setBusy(false);
    }
  }

  function cancelSetup() {
    setSetup(null);
    setCode('');
    setPassword('');
  }

  async function confirmEnable() {
    setError('');
    setMessage('');
    if (!code.trim() || !password) {
      setError('Enter the code from your app and your password.');
      return;
    }
    setBusy(true);
    try {
      const result = await apiEndpoints.enableTwoFactor(code.trim(), password);
      setEnabled(result.enabled);
      setBackupCodesLeft(result.backup_codes.length);
      setBackupCodes(result.backup_codes);
      setSetup(null);
      setCode('');
      setPassword('');
      setMessage('Two-factor authentication enabled.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enable failed.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setError('');
    setMessage('');
    if (!code.trim() || !password) {
      setError('Enter the current code and your password.');
      return;
    }
    setBusy(true);
    try {
      await apiEndpoints.disableTwoFactor(code.trim(), password);
      setEnabled(false);
      setBackupCodesLeft(0);
      setBackupCodes([]);
      setShowDisable(false);
      setShowRegenerate(false);
      setCode('');
      setPassword('');
      setMessage('Two-factor authentication disabled.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disable failed.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmRegenerate() {
    setError('');
    setMessage('');
    if (!password) {
      setError('Enter your password to generate new backup codes.');
      return;
    }
    setBusy(true);
    try {
      const result = await apiEndpoints.regenerateBackupCodes(password);
      setBackupCodesLeft(result.backup_codes.length);
      setBackupCodes(result.backup_codes);
      setShowRegenerate(false);
      setPassword('');
      setMessage('New backup codes generated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate codes.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.muted}>Loading security settings…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, styles.headerIconAccent]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.teal} />
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.title}>Two-factor authentication</Text>
            <Text style={styles.subtitle}>Protect your account with Google Authenticator</Text>
          </View>
          <View style={[styles.badge, enabled ? styles.badgeOn : styles.badgeOff]}>
            <Text style={[styles.badgeText, enabled ? styles.badgeTextOn : styles.badgeTextOff]}>
              {enabled ? 'On' : 'Off'}
            </Text>
          </View>
        </View>

        {error ? (
          <Pressable style={styles.bannerError} onPress={() => setError('')}>
            <Ionicons name="alert-circle" size={16} color={colors.white} />
            <Text style={styles.bannerErrorText}>{error}</Text>
          </Pressable>
        ) : null}
        {message ? (
          <Pressable style={styles.bannerSuccess} onPress={() => setMessage('')}>
            <Ionicons name="checkmark-circle" size={16} color={colors.white} />
            <Text style={styles.bannerSuccessText}>{message}</Text>
          </Pressable>
        ) : null}

        {/* ============ Disabled: setup ============ */}
        {!enabled && !setup ? (
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              Add an extra layer of security. Once enabled, you&apos;ll need a verification code
              from the Google Authenticator app to sign in.
            </Text>
            <PrimaryButton
              label="Set up authenticator app"
              icon="qr-code-outline"
              onPress={startSetup}
              loading={busy}
              variant="teal"
            />
          </View>
        ) : null}

        {!enabled && setup ? (
          <View style={styles.card}>
            <View style={styles.qrWrap}>
              <Image source={{ uri: setup.qr_data_uri }} style={styles.qr} resizeMode="contain" />
            </View>
            <Text style={styles.centerText}>
              Scan the QR code with Google Authenticator, or enter this key manually:
            </Text>
            <View style={styles.secretRow}>
              <Text style={styles.secret} selectable>
                {setup.secret}
              </Text>
            </View>

            <FormTextInput
              label="6-digit code from the app"
              value={code}
              onChangeText={setCode}
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
              icon="keypad-outline"
            />
            <FormTextInput
              label="Your password"
              value={password}
              onChangeText={setPassword}
              placeholder="Confirm with your password"
              secureTextEntry
              icon="lock-closed-outline"
            />

            <View style={styles.rowGap}>
              <PrimaryButton
                label="Enable 2FA"
                icon="shield-checkmark-outline"
                onPress={confirmEnable}
                loading={busy}
                variant="teal"
              />
              <PrimaryButton label="Cancel" variant="outline" onPress={cancelSetup} disabled={busy} />
            </View>
          </View>
        ) : null}

        {/* ============ Enabled: manage ============ */}
        {enabled ? (
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              Two-factor authentication is active. Keep your backup codes somewhere safe — each
              one can be used once to sign in if you lose your phone.
            </Text>

            <View style={styles.manageRow}>
              <Pressable
                style={({ pressed }) => [styles.manageBtn, pressed && styles.rowPressed]}
                onPress={() => {
                  setShowRegenerate((v) => !v);
                  setShowDisable(false);
                  setPassword('');
                  setCode('');
                }}
              >
                <Ionicons name="refresh" size={18} color={colors.teal} />
                <Text style={styles.manageBtnText}>New backup codes</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{backupCodesLeft} left</Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.manageBtnDanger, pressed && styles.rowPressed]}
                onPress={() => {
                  setShowDisable((v) => !v);
                  setShowRegenerate(false);
                  setPassword('');
                  setCode('');
                }}
              >
                <Ionicons name="shield-outline" size={18} color={colors.danger} />
                <Text style={styles.manageBtnDangerText}>Disable 2FA</Text>
              </Pressable>
            </View>

            {showDisable ? (
              <View style={styles.formBox}>
                <FormTextInput
                  label="Current code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="••••••"
                  keyboardType="number-pad"
                  maxLength={6}
                  icon="keypad-outline"
                />
                <FormTextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Confirm your password"
                  secureTextEntry
                  icon="lock-closed-outline"
                />
                <View style={styles.rowGap}>
                  <PrimaryButton
                    label="Disable"
                    variant="danger"
                    onPress={confirmDisable}
                    loading={busy}
                  />
                  <PrimaryButton label="Cancel" variant="outline" onPress={() => setShowDisable(false)} disabled={busy} />
                </View>
              </View>
            ) : null}

            {showRegenerate ? (
              <View style={styles.formBox}>
                <FormTextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  icon="lock-closed-outline"
                />
                <View style={styles.rowGap}>
                  <PrimaryButton
                    label="Generate codes"
                    icon="refresh"
                    onPress={confirmRegenerate}
                    loading={busy}
                  />
                  <PrimaryButton label="Cancel" variant="outline" onPress={() => setShowRegenerate(false)} disabled={busy} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ============ Biometric sign-in ============ */}
        <View style={styles.card}>
          <View style={styles.bioRow}>
            <View style={[styles.headerIcon, styles.headerIconAccent]}>
                <Ionicons name="finger-print" size={20} color={colors.teal} />
              </View>
            <View style={styles.headerBody}>
              <Text style={styles.title}>Biometric sign-in</Text>
              <Text style={styles.subtitle}>
                {bioSupported
                  ? `Sign in with ${bioLabel} instead of your password.`
                  : 'Not supported on this device.'}
              </Text>
            </View>
            <Switch
              value={bioEnabled}
              onValueChange={onToggleBio}
              disabled={!bioSupported || bioBusy}
              trackColor={{ false: colors.border, true: colors.teal }}
              thumbColor={colors.white}
            />
          </View>

          {showBioPassword ? (
            <View style={styles.formBox}>
              <Text style={styles.bodyText}>
                Enter your password once. We&apos;ll store it securely on this device and use it
                to sign you in after your {bioLabel || 'fingerprint'} is verified.
              </Text>
              <FormTextInput
                label="Password"
                value={bioPassword}
                onChangeText={setBioPassword}
                placeholder="Confirm your password"
                secureTextEntry
                icon="lock-closed-outline"
              />
              <View style={styles.rowGap}>
                <PrimaryButton
                  label="Enable biometric sign-in"
                  icon="finger-print"
                  onPress={confirmEnableBio}
                  loading={bioBusy}
                />
                <PrimaryButton
                  label="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowBioPassword(false);
                    setBioPassword('');
                  }}
                  disabled={bioBusy}
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* ============ Backup codes (one-time) ============ */}
        {backupCodes.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.warnBanner}>
              <Ionicons name="warning" size={16} color="#92400E" />
              <Text style={styles.warnText}>Save these codes now. They won&apos;t be shown again.</Text>
            </View>
            <View style={styles.codesGrid}>
              {backupCodes.map((c) => (
                <View key={c} style={styles.codeChip}>
                  <Text style={styles.codeChipText}>{c}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton label="I've saved these codes" icon="checkmark" onPress={dismissCodes} />
          </View>
        ) : null}

        <Text style={styles.hint}>
          Tip: store backup codes offline. To disable 2FA later, open Settings → Two-factor
          authentication.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconAccent: {
      backgroundColor: colors.tealSoft,
    },
    headerBody: {
      flex: 1,
    },
    title: {
      fontSize: 19,
      fontWeight: font.bold,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 1,
    },
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    badgeOn: {
      backgroundColor: colors.successSoft,
    },
    badgeOff: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeText: {
      fontSize: 14,
      fontWeight: font.bold,
    },
    badgeTextOn: {
      color: colors.success,
    },
    badgeTextOff: {
      color: colors.muted,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
      ...shadow.sm,
    },
    bodyText: {
      fontSize: 16,
      lineHeight: 20,
      color: colors.muted,
      marginBottom: 14,
    },
    centerText: {
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 10,
    },
    qrWrap: {
      alignItems: 'center',
      marginBottom: 12,
    },
    qr: {
      width: 200,
      height: 200,
      backgroundColor: colors.white,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
    },
    secretRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 14,
    },
    secret: {
      fontSize: 16,
      letterSpacing: 2,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    rowGap: {
      gap: 10,
    },
    bannerError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.danger,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 14,
    },
    bannerErrorText: {
      flex: 1,
      color: colors.white,
      fontSize: 15,
    },
    bannerSuccess: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.success,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 14,
    },
    bannerSuccessText: {
      flex: 1,
      color: colors.white,
      fontSize: 15,
    },
    manageRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 4,
    },
    bioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    manageBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.tealSoft,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    manageBtnDanger: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    manageBtnText: {
      flex: 1,
      color: colors.teal,
      fontSize: 15,
      fontWeight: font.semibold,
    },
    manageBtnDangerText: {
      flex: 1,
      color: colors.danger,
      fontSize: 15,
      fontWeight: font.semibold,
    },
    countBadge: {
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    countBadgeText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: font.semibold,
    },
    rowPressed: {
      opacity: 0.85,
    },
    formBox: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    warnBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FEF3C7',
      borderRadius: radius.md,
      padding: 10,
      marginBottom: 12,
    },
    warnText: {
      flex: 1,
      color: '#92400E',
      fontSize: 15,
      fontWeight: font.semibold,
    },
    codesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    codeChip: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    codeChipText: {
      fontSize: 15,
      letterSpacing: 1,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    hint: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 18,
    },
    muted: {
      fontSize: 16,
      color: colors.muted,
    },
  });
