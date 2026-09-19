import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Trip } from '../api/types';
import { BusVector } from './BusVector';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../theme';
import { durationMinutes, formatDate, formatPrice } from '../utils/format';

interface Props {
  trip: Trip;
  onPress: (trip: Trip) => void;
  selected?: boolean;
}

export function TripCard({ trip, onPress, selected = false }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const lowStock = trip.available_seats > 0 && trip.available_seats <= 5;
  const meta = [formatDate(trip.departure_date), trip.departure_time];
  if (trip.arrival_time) meta.push(durationMinutes(trip.departure_time, trip.arrival_time));
  return (
    <Pressable
      onPress={() => onPress(trip)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
      ]}
    >
      {selected ? (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={12} color={colors.surface} />
        </View>
      ) : null}

      <View style={styles.routeRow}>
        <View style={styles.route}>
          <Text style={styles.city} numberOfLines={1}>
            {trip.origin_city}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.teal} />
          <Text style={[styles.city, styles.dest]} numberOfLines={1}>
            {trip.destination_city}
          </Text>
        </View>
        <Text style={styles.price}>₦{formatPrice(trip.price)}</Text>
      </View>

      <Text style={styles.meta}>{meta.join(' · ')}</Text>

      <View style={styles.divider} />

      <View style={styles.footer}>
        {trip.category_image ? (
          <Image source={{ uri: trip.category_image }} style={styles.busImg} />
        ) : (
          <View style={styles.busIcon}>
            <BusVector size={44} color={colors.teal} />
          </View>
        )}
        <Text style={styles.busText} numberOfLines={1}>
          <Text style={styles.vendorName}>{trip.vendor_name}</Text>
          {trip.bus_name ? <Text> · {trip.bus_name}</Text> : null}
        </Text>
        <View style={[styles.seats, lowStock && styles.seatsLow]}>
          <Text style={[styles.seatsText, lowStock && { color: colors.warning }]}>
            {trip.available_seats > 0 ? `${trip.available_seats} seats` : 'Sold out'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    ...shadow.sm,
  },
  cardSelected: {
    borderColor: colors.teal,
    borderWidth: 2,
    backgroundColor: colors.tealSoft,
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  city: {
    fontSize: 19,
    fontWeight: font.bold,
    color: colors.text,
    maxWidth: 110,
  },
  dest: {
    color: colors.text,
  },
  price: {
    fontSize: 18,
    fontWeight: font.bold,
    color: colors.text,
    marginLeft: 8,
  },
  meta: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busImg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  busText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: colors.muted,
  },
  vendorName: {
    fontWeight: font.semibold,
    color: colors.text,
  },
  seats: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
  },
  seatsLow: {
    backgroundColor: colors.warningSoft,
  },
  seatsText: {
    fontSize: 14,
    fontWeight: font.semibold,
    color: colors.text,
  },
});
