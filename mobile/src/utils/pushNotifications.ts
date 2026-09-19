import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as api from '../api/endpoints';

/**
 * Configure how notifications are presented while the app is foregrounded.
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Request notification permission and return whether it was granted.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.status === 'undetermined') {
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  }
  return false;
}

/**
 * Ensure an Android notification channel exists so pushes are delivered.
 */
export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#000000',
  });
}

function projectId(): string | undefined {
  const expoConfig = (Constants.expoConfig ?? {}) as {
    extra?: { eas?: { projectId?: string } };
  };
  return (
    expoConfig.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  );
}

/**
 * Obtain this device's Expo push token.
 * Returns null when unavailable (web, denied permission, failure).
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    await ensureAndroidChannel();
    const granted = await ensureNotificationPermission();
    if (!granted) return null;

    const opts: Record<string, string> = {};
    const pid = projectId();
    if (pid) opts.projectId = pid;

    const token = await Notifications.getExpoPushTokenAsync(opts);
    return token.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Register this device's push token with the backend while signed in.
 * Safe to call on every app launch/login, ignoring failures quietly.
 */
export async function registerDevicePushToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  try {
    await api.registerPushToken(
      token,
      Platform.OS,
      `${Platform.OS}-${Platform.Version ?? ''}`
    );
  } catch {
    // Registration is best-effort; never block the app on push setup.
  }
}

/**
 * Unregister this device's token from the backend (logout / opt-out).
 */
export async function unregisterDevicePushToken(): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;
    await api.unregisterPushToken(token);
  } catch {
    // best-effort
  }
}
