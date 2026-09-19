import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const ENABLED_KEY = 'busline.biometrics.enabled';
const EMAIL_KEY = 'busline.biometrics.email';
const PASSWORD_KEY = 'busline.biometrics.password';

export type BiometricKind = 'FaceID' | 'Fingerprint' | 'Iris' | null;

export type AuthResult =
  | { success: true }
  | { success: false; reason: 'cancelled' | 'unavailable' | 'failed' };

export function biometricLabel(kind: BiometricKind): string {
  if (kind === 'FaceID') return 'Face ID';
  if (kind === 'Fingerprint') return 'Fingerprint';
  if (kind === 'Iris') return 'Iris';
  return 'Biometrics';
}

export async function getSupportedBiometric(): Promise<BiometricKind> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'FaceID';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'Iris';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Fingerprint';
    return null;
  } catch {
    return null;
  }
}

export async function hasBiometricsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(ENABLED_KEY, '1');
  } else {
    await AsyncStorage.removeItem(ENABLED_KEY);
  }
}

export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(EMAIL_KEY, email);
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function getBiometricCredentials(): Promise<{ email: string; password: string } | null> {
  try {
    const email = await SecureStore.getItemAsync(EMAIL_KEY);
    const password = await SecureStore.getItemAsync(PASSWORD_KEY);
    if (email && password) return { email, password };
    return null;
  } catch {
    return null;
  }
}

export async function clearBiometricCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(EMAIL_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
}

export async function canAuthenticate(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function authenticate(promptMessage: string): Promise<AuthResult> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { success: false, reason: 'unavailable' };
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { success: false, reason: 'unavailable' };
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) return { success: true };
    const cancelled = ['user_cancel', 'app_cancel', 'system_cancel', 'user_fallback'];
    if (cancelled.includes(result.error)) return { success: false, reason: 'cancelled' };
    return { success: false, reason: 'failed' };
  } catch {
    return { success: false, reason: 'failed' };
  }
}
