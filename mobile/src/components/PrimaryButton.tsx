import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'dark' | 'teal';
  block?: boolean;
  pill?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  block = true,
  pill = false,
  icon,
  style,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;

  let gradient: readonly [string, string];
  if (isDisabled) gradient = [colors.border, colors.border];
  else if (variant === 'primary') gradient = [colors.primary, colors.primaryDeep];
  else if (variant === 'danger') gradient = [colors.danger, '#C13B3B'];
  else if (variant === 'dark') gradient = [colors.ink, '#19120E'];
  else if (variant === 'teal') gradient = [colors.teal, isDark ? '#F59E0B' : '#D97706'];
  else gradient = ['transparent', 'transparent'];

  const isSolid = variant === 'primary' || variant === 'danger' || variant === 'dark' || variant === 'teal';
  const spinnerColor =
    variant === 'danger' || variant === 'dark' || variant === 'teal'
      ? colors.white
      : variant === 'primary'
        ? isDark ? colors.ink : colors.white
        : colors.text;
  const labelColor =
    variant === 'danger' || variant === 'dark' || variant === 'teal'
      ? styles.labelLight
      : variant === 'primary'
        ? { color: isDark ? colors.ink : colors.white }
        : styles.labelDark;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrap,
        block && styles.block,
        pill && styles.pillWrap,
        style,
        pressed && !isDisabled && { opacity: 0.9, transform: [{ translateY: 1 }] },
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.base,
          styles[variant],
          pill && styles.pillBase,
          isDisabled && styles.disabled,
          isSolid && styles.solidShadow,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={spinnerColor} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={18} color={labelColor.color} /> : null}
            <Text style={[styles.label, labelColor]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  base: {
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  block: {
    width: '100%',
  },
  pillWrap: {
    borderRadius: radius.pill,
  },
  pillBase: {
    borderRadius: radius.pill,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  solidShadow: {
    ...shadow.md,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dark: {
    backgroundColor: colors.ink,
  },
  teal: {
    backgroundColor: colors.teal,
  },
  disabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: 17,
    fontFamily: 'System',
    fontWeight: font.bold,
  },
  labelDark: {
    color: colors.text,
  },
  labelLight: {
    color: colors.white,
  },
});
