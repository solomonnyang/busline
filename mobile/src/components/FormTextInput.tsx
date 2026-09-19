import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

export function FormTextInput({ label, error, icon, style, ...rest }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          !!error && styles.inputWrapError,
          focused && !error && styles.inputWrapFocused,
          style,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.mutedLight}
          />
        ) : null}
        <TextInput
          placeholderTextColor={colors.mutedLight}
          style={[styles.input, icon && styles.inputWithIcon]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 17,
    color: colors.text,
  },
  inputWithIcon: {
    paddingLeft: 10,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 4,
  },
});
