import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { checkinBooking, fetchBusBookings, type BusVendorBooking } from '../../api/vendorBus';
import { StatusBadge } from '../../components/MarketplaceBits';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'BusBookings'>;

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;

export function BusBookingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [bookings, setBookings] = useState<BusVendorBooking[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setBookings(await fetchBusBookings(filter === 'all' ? undefined : { status: filter }));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => void load());
    return unsub;
  }, [navigation, load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function doCheckin(b: BusVendorBooking) {
    Alert.alert('Check in passenger', `Check in ${b.booking_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check in',
        onPress: async () => {
          try {
            await checkinBooking(b.id);
            await load();
          } catch {
            Alert.alert('Check-in failed', 'The payment must be confirmed for this booking.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="ticket-outline" size={46} color={colors.mutedLight} />
            <Text style={styles.emptyText}>No bookings here.</Text>
            <Text style={styles.emptySub}>Bookings for your trips will appear here.</Text>
          </View>
        ) : (
          bookings.map((b) => (
            <Pressable
              key={b.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('BusBookingDetail', { id: b.id })}
            >
              <View style={styles.cardTop}>
                <View style={[styles.thumb, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="ticket" size={20} color={colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {b.origin_city || ''} → {b.destination_city || ''}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {b.booking_number} · {b.customer_name || 'Passenger'}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {b.departure_date || ''} {b.departure_time ? `· ${b.departure_time}` : ''} · ₦{Number(b.total_amount).toLocaleString()}
                  </Text>
                  <View style={styles.badgeRow}>
                    <StatusBadge status={b.status} />
                    <StatusBadge status={b.payment_status} />
                  </View>
                </View>
              </View>
              {b.status === 'confirmed' && b.payment_status === 'paid' ? (
                <View style={styles.cardActions}>
                  <Pressable style={styles.ghost} onPress={() => doCheckin(b)}>
                    <Ionicons name="checkmark-done-outline" size={14} color={colors.success} />
                    <Text style={[styles.ghostText, { color: colors.success }]}>Check in</Text>
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 13, fontWeight: font.semibold, color: colors.muted },
    filterTextActive: { color: '#fff' },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 12,
    },
    errorText: { flex: 1, fontSize: 13, color: colors.danger, fontWeight: font.semibold },
    centered: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
    emptyText: { fontSize: 16, fontWeight: font.bold, color: colors.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
      ...shadow.sm,
    },
    cardPressed: { opacity: 0.85 },
    cardTop: { flexDirection: 'row', gap: 12 },
    thumb: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: font.bold, color: colors.text },
    cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    ghost: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.surfaceAlt,
    },
    ghostText: { fontSize: 13, fontWeight: font.bold, color: colors.primary },
  });
