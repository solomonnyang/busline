import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../theme';

const STATUS_COLORS: Record<string, string> = {
  pending: '#d97706',
  confirmed: '#16a34a',
  checked_in: '#0E9384',
  checked_out: '#64748b',
  preparing: '#d97706',
  ready: '#0E9384',
  delivered: '#16a34a',
  cancelled: '#dc2626',
  rejected: '#dc2626',
  paid: '#16a34a',
  unpaid: '#d97706',
  refunded: '#64748b',
  success: '#16a34a',
  failed: '#dc2626',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = STATUS_COLORS[status ?? ''] ?? colors.muted;
  const label = (status ?? '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label || '—'}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      borderRadius: radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: font.bold,
      textTransform: 'capitalize',
    },
  });
