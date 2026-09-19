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
import { checkinBooking, fetchBusBookingDetail, type BusVendorBooking } from '../../api/vendorBus';
import { StatusBadge } from '../../components/MarketplaceBits';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'BusBookingDetail'>;

interface BookingSeat {
  id: number;
  seat_number?: string | null;
  passenger_name?: string | null;
  passenger_age?: number | null;
  passenger_gender?: string | null;
  ticket_price?: number | string | null;
}

export function BusBookingDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [booking, setBooking] = useState<BusVendorBooking | null>(null);
  const [seats, setSeats] = useState<BookingSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchBusBookingDetail(id);
      setBooking(data.booking);
      setSeats(data.seats);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function doCheckin() {
    Alert.alert('Check in passenger', `Check in ${booking?.booking_number ?? 'this booking'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check in',
        onPress: async () => {
          setCheckingIn(true);
          try {
            await checkinBooking(id);
            await load();
          } catch (e) {
            Alert.alert('Check-in failed', e instanceof Error ? e.message : 'Payment must be confirmed.');
          } finally {
            setCheckingIn(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={46} color={colors.mutedLight} />
        <Text style={styles.emptyText}>Booking not found.</Text>
        <PrimaryButton label="Go back" onPress={() => navigation.goBack()} style={styles.backButton} />
      </View>
    );
  }

  const canCheckin = booking.status === 'confirmed' && booking.payment_status === 'paid';

  return (
    <View style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>{booking.booking_number}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge status={booking.status} />
              <StatusBadge status={booking.payment_status} />
            </View>
          </View>
          <Text style={styles.heroRoute} numberOfLines={2}>
            {booking.origin_city || '—'} → {booking.destination_city || '—'}
          </Text>
          {booking.bus_name ? (
            <Text style={styles.heroSub}>
              {booking.bus_name}
              {booking.registration_number ? ` · ${booking.registration_number}` : ''}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <InfoRow icon="person-outline" label="Passenger" value={booking.customer_name || '—'} />
          {booking.customer_email ? <InfoRow icon="mail-outline" label="Email" value={booking.customer_email} /> : null}
          <InfoRow icon="calendar-outline" label="Departure" value={`${booking.departure_date || '—'}${booking.departure_time ? ` · ${booking.departure_time}` : ''}`} />
          <InfoRow icon="calendar-outline" label="Booked" value={booking.booking_date || '—'} />
          <InfoRow icon="people-outline" label="Seats" value={String(seats.length)} />
          <InfoRow icon="pricetag-outline" label="Total" value={`₦${Number(booking.total_amount).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`} highlight />
        </View>

        {seats.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Passengers & seats</Text>
            {seats.map((s, i) => (
              <View key={s.id} style={styles.seatCard}>
                <View style={[styles.seatIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="person" size={16} color={colors.primary} />
                </View>
                <View style={styles.seatBody}>
                  <Text style={styles.seatName} numberOfLines={1}>
                    {s.passenger_name || `Passenger ${i + 1}`}
                  </Text>
                  <Text style={styles.seatMeta}>
                    Seat {s.seat_number || '—'}
                    {s.passenger_age ? ` · ${s.passenger_age}y` : ''}
                  </Text>
                </View>
                <Text style={styles.seatPrice}>
                  ₦{Number(s.ticket_price ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {canCheckin ? (
          <View style={styles.footer}>
            <PrimaryButton label="Check in passenger" onPress={doCheckin} loading={checkingIn} icon="checkmark-done-outline" />
          </View>
        ) : (
          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <Text style={styles.noteText}>
              Check-in is available once the booking is confirmed and payment is marked paid.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon: IconName; label: string; value: string; highlight?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={highlight ? colors.primary : colors.muted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, backgroundColor: colors.surfaceAlt },
    emptyText: { fontSize: 16, fontWeight: font.bold, color: colors.text, textAlign: 'center' },
    backButton: { maxWidth: 200 },
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
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      padding: 18,
      marginBottom: 12,
      ...shadow.md,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
    heroLabel: { fontSize: 14, fontWeight: font.bold, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.4 },
    badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    heroRoute: { fontSize: 22, fontWeight: font.bold, color: '#fff', marginTop: 10 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
      ...shadow.sm,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
    infoLabel: { width: 90, fontSize: 14, color: colors.muted },
    infoValue: { flex: 1, fontSize: 14, fontWeight: font.semibold, color: colors.text },
    infoValueHighlight: { color: colors.primary, fontSize: 16, fontWeight: font.bold },
    sectionTitle: { fontSize: 17, fontWeight: font.bold, color: colors.text, marginBottom: 10 },
    seatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 8,
    },
    seatIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    seatBody: { flex: 1 },
    seatName: { fontSize: 14, fontWeight: font.bold, color: colors.text },
    seatMeta: { fontSize: 12, color: colors.muted, marginTop: 1 },
    seatPrice: { fontSize: 14, fontWeight: font.bold, color: colors.success },
    footer: { marginTop: 16 },
    noteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginTop: 16,
    },
    noteText: { flex: 1, fontSize: 13, color: colors.muted },
  });
