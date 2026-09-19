import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { ThemeProvider, useTheme } from './src/theme';
import { configureNotifications } from './src/utils/pushNotifications';

const ONBOARDING_KEY = 'busline.onboarded';

function AppInner() {
  const { colors, isDark } = useTheme();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.surface,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  useEffect(() => {
    configureNotifications();
    let active = true;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => {
        if (active) setOnboarded(v === '1');
      })
      .catch(() => {
        if (active) setOnboarded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (onboarded === null) {
    return null;
  }

  if (!onboarded) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onDone={() => setOnboarded(true)} />
      </>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
