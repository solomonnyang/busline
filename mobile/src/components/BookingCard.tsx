import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Booking } from '../api/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../theme';
import { formatPrice } from '../utils/format';

interface Props {
  booking: Booking;
  onPress: (booking: Booking) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function timeLabel(time: string | null | undefined): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h)) return time;
  const hour = h % 12 || 12;
  const minute = String(m ?? 0).padStart(2, '0');
  return `${hour}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
}

function statusTint(colors: ThemeColors, isDark: boolean, status: string) {
  switch (status) {
    case 'completed':
      return { fg: colors.accentBlue, bg: colors.accentBlue + (isDark ? '3D' : '1F') };
    case 'confirmed':
      return { fg: colors.success, bg: colors.successSoft };
    case 'pending':
      return { fg: colors.gold, bg: colors.goldSoft };
    case 'cancelled':
      return { fg: colors.danger, bg: colors.dangerSoft };
    default:
      return { fg: colors.muted, bg: colors.primarySoft };
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function BookingCard({ booking, onPress }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tint = statusTint(colors, isDark, booking.status);
  return (
    <Pressable
      onPress={() => onPress(booking)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.goldSoft }]}>
        <Ionicons name="ticket-outline" size={22} color={colors.gold} />
      </View>
      <View style={styles.body}>
        <Text style={styles.route} numberOfLines={1}>
          {booking.origin_city}
          <Text style={styles.arrow}> → </Text>
          {booking.destination_city}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {shortDate(booking.departure_date)} · {timeLabel(booking.departure_time)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>₦{formatPrice(booking.total_amount)}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: tint.fg }]} />
          <Text style={[styles.statusLabel, { color: tint.fg }]}>
            {STATUS_LABELS[booking.status] ?? booking.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  body: {
    flex: 1,
    paddingRight: 10,
  },
  route: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  arrow: {
    color: colors.muted,
    fontWeight: font.medium,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: font.semibold,
  },
});