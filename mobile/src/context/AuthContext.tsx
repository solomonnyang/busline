import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as apiEndpoints from '../api/endpoints';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import type { LoginChallenge, LoginResult, Profile, RegisterResult, Session, StaffInfo, VerificationChallenge } from '../api/types';
import {
  authenticate,
  canAuthenticate,
  clearBiometricCredentials,
  getBiometricCredentials,
  getSupportedBiometric,
  hasBiometricsEnabled,
  saveBiometricCredentials,
  setBiometricsEnabled,
} from '../utils/biometrics';
import { registerDevicePushToken, unregisterDevicePushToken } from '../utils/pushNotifications';
const TOKEN_KEY = 'busline.token';
const USER_KEY = 'busline.user';
const PROFILE_KEY = 'busline.profile';
const STAFF_KEY = 'busline.staff';

export type BiometricSignInResult =
  | { status: 'success' }
  | { status: 'two-factor'; result: LoginChallenge }
  | { status: 'verification'; result: VerificationChallenge }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'failed' }
  | { status: 'no-credentials' };

interface AuthState {
  loading: boolean;
  token: string | null;
  user: Session['user'] | null;
  profile: Record<string, unknown> | null;
  staff: StaffInfo | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactorLogin: (tfaToken: string, code: string) => Promise<void>;
  biometricSignIn: () => Promise<BiometricSignInResult>;
  biometricAvailable: () => Promise<boolean>;
  enableBiometrics: (email: string, password: string) => Promise<void>;
  disableBiometrics: () => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    referral_code?: string;
  }) => Promise<RegisterResult>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Session['user'] | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [staff, setStaff] = useState<StaffInfo | null>(null);

  const applySession = useCallback((session: Session) => {
    setToken(session.token);
    setUser(session.user);
    setProfile(session.profile ?? null);
    setStaff(session.staff ?? null);
    setAuthToken(session.token);
  }, []);

  const persistSession = useCallback(async (session: Session) => {
    applySession(session);
    // The bearer token is a credential and belongs in the platform keystore
    // (Keychain/Keystore); public profile data stays in AsyncStorage.
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    await AsyncStorage.multiSet([
      [USER_KEY, JSON.stringify(session.user)],
      [PROFILE_KEY, JSON.stringify(session.profile ?? null)],
      [STAFF_KEY, JSON.stringify(session.staff ?? null)],
    ]);
  }, [applySession]);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    setStaff(null);
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.multiRemove([USER_KEY, PROFILE_KEY, STAFF_KEY]);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession();
    });
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const stored = await AsyncStorage.multiGet([USER_KEY, PROFILE_KEY, STAFF_KEY]);
        if (storedToken) {
          setToken(storedToken);
          setAuthToken(storedToken);
          setUser(stored[0][1] ? JSON.parse(stored[0][1]) : null);
          setProfile(stored[1][1] ? JSON.parse(stored[1][1]) : null);
          setStaff(stored[2][1] ? JSON.parse(stored[2][1]) : null);
          void registerDevicePushToken();
        }
      } catch (e) {
        // ignore malformed storage
      } finally {
        setLoading(false);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiEndpoints.login(email, password);
      if (result.requires_2fa || result.requires_verification) {
        return result;
      }
      await persistSession(result);
      void registerDevicePushToken();
      const enabled = await hasBiometricsEnabled();
      if (enabled) {
        await saveBiometricCredentials(email, password).catch(() => {
          // keep the flag but ignore storage failures
        });
      }
      return result;
    },
    [persistSession]
  );

  const completeTwoFactorLogin = useCallback(
    async (tfaToken: string, code: string) => {
      const session = await apiEndpoints.loginTwoFactor(tfaToken, code);
      await persistSession(session);
      void registerDevicePushToken();
    },
    [persistSession]
  );

  const biometricSignIn = useCallback(async (): Promise<BiometricSignInResult> => {
    const enabled = await hasBiometricsEnabled();
    if (!enabled) return { status: 'no-credentials' };
    const auth = await authenticate('Sign in to BusLine');
    if (!auth.success) {
      if (auth.reason === 'cancelled') return { status: 'cancelled' };
      if (auth.reason === 'unavailable') return { status: 'unavailable' };
      return { status: 'failed' };
    }
    const creds = await getBiometricCredentials();
    if (!creds) return { status: 'no-credentials' };
    try {
      const result = await apiEndpoints.login(creds.email, creds.password);
      if (result.requires_2fa) return { status: 'two-factor', result };
      if (result.requires_verification) return { status: 'verification', result };
      await persistSession(result);
      void registerDevicePushToken();
      return { status: 'success' };
    } catch {
      return { status: 'no-credentials' };
    }
  }, [persistSession]);

  const biometricAvailable = useCallback(async () => {
    const kind = await getSupportedBiometric();
    return kind !== null;
  }, []);

  const enableBiometrics = useCallback(async (email: string, password: string) => {
    const kind = await getSupportedBiometric();
    if (!kind) throw new Error('Biometrics are not available on this device.');
    if (!(await canAuthenticate())) {
      throw new Error('No fingerprint or Face ID is set up on this device.');
    }
    await saveBiometricCredentials(email, password);
    await setBiometricsEnabled(true);
  }, []);

  const disableBiometrics = useCallback(async () => {
    await setBiometricsEnabled(false);
    await clearBiometricCredentials();
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      referral_code?: string;
    }) => {
      // No session is persisted: the account must be email-verified first.
      return apiEndpoints.registerCustomer(payload);
    },
    []
  );

  const verifyEmail = useCallback(async (email: string, code: string) => {
    await apiEndpoints.verifyEmail(email, code);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await apiEndpoints.resendVerification(email);
  }, []);

  const logout = useCallback(async () => {
    await unregisterDevicePushToken();
    await clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const data = await apiEndpoints.fetchProfile();
    setUser(data.user);
    setProfile((data.profile as Record<string, unknown> | null) ?? null);
    setStaff((data.staff as StaffInfo | null) ?? null);
    await AsyncStorage.multiSet([
      [USER_KEY, JSON.stringify(data.user)],
      [PROFILE_KEY, JSON.stringify(data.profile ?? null)],
      [STAFF_KEY, JSON.stringify(data.staff ?? null)],
    ]);
  }, []);

  const updateAvatar = useCallback(
    async (avatarUrl: string) => {
      await apiEndpoints.updateAvatar(avatarUrl);
      await refreshProfile();
    },
    [refreshProfile]
  );

  const value = useMemo<AuthState>(
    () => ({
      loading,
      token,
      user,
      profile,
      staff,
      isAuthenticated: !!token,
      login,
      completeTwoFactorLogin,
      biometricSignIn,
      biometricAvailable,
      enableBiometrics,
      disableBiometrics,
      register,
      verifyEmail,
      resendVerification,
      logout,
      refreshProfile,
      updateAvatar,
    }),
    [loading, token, user, profile, staff, login, completeTwoFactorLogin, biometricSignIn, biometricAvailable, enableBiometrics, disableBiometrics, register, verifyEmail, resendVerification, logout, refreshProfile, updateAvatar]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
