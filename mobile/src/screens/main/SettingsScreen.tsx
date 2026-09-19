import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, THEME_KEY, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>;

const CACHE_KEYS = [THEME_KEY];
const ICON_SIZE = 22;

export function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);

  function clearCache() {
    Alert.alert('Clear cache', 'This resets your app preferences. Your account stays signed in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void AsyncStorage.multiRemove(CACHE_KEYS).then(() => setMode('light'));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="moon-outline" size={ICON_SIZE} color={colors.muted} />
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Dark mode</Text>
              <Text style={styles.rowSub}>Use dark colors for BusLine</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              trackColor={{ false: styles.switchTrack.color, true: styles.switchTrackOn.color }}
              thumbColor={styles.switchThumb.color}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="cash-outline" size={ICON_SIZE} color={colors.muted} />
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Currency</Text>
              <Text style={styles.rowSub}>Nigeria · Naira (₦)</Text>
            </View>
            <Ionicons name="checkmark-circle" size={ICON_SIZE} color={colors.success} />
          </View>
          <Pressable
            onPress={clearCache}
            style={({ pressed }) => [styles.row, styles.rowLast, pressed && styles.rowPressed]}
          >
            <Ionicons name="trash-outline" size={ICON_SIZE} color={colors.muted} />
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Clear cache</Text>
              <Text style={styles.rowSub}>Reset preferences (keeps you signed in)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Pressable
            onPress={() => navigation.navigate('DeleteAccountFlow')}
            style={({ pressed }) => [styles.row, styles.rowLast, pressed && styles.rowPressed]}
          >
            <Ionicons name="trash-bin-outline" size={ICON_SIZE} color={colors.danger} />
            <View style={styles.rowBody}>
              <Text style={[styles.rowLabel, styles.dangerText]}>Delete account</Text>
              <Text style={styles.rowSub}>Permanently deactivate your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
          </Pressable>
        </View>

        <Text style={styles.version}>BusLine · Version 1.0.0</Text>
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
    content: {
      padding: 16,
      paddingBottom: 40,
      gap: 12,
    },
    dangerText: {
      color: colors.danger,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowPressed: {
      backgroundColor: colors.primarySoft,
    },
    rowBody: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 17,
      fontWeight: font.bold,
      color: colors.text,
    },
    rowSub: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 1,
    },
    switchTrack: {
      color: colors.border,
    },
    switchTrackOn: {
      color: colors.teal,
    },
    switchThumb: {
      color: colors.surface,
    },
    version: {
      textAlign: 'center',
      fontSize: 13,
      color: colors.muted,
      marginTop: 28,
    },
  });