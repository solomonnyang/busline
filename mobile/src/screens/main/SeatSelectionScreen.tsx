import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as api from '../../api/endpoints';
import type { LoyaltyRules, PassengerInput, Seat, SeatMapData, Trip } from '../../api/types';
import { PaystackCheckoutModal } from '../../components/PaystackCheckoutModal';
import { PaymentMethodSheet } from '../../components/PaymentMethodSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SeatMap } from '../../components/SeatMap';
import { Skeleton } from '../../components/Skeleton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { durationMinutes, formatDate, formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<MainStackParamList, 'SeatSelection'>;

const MAX_SEATS = 10;

interface Pax {
  name: string;
  age: string;
  gender: string;
}

export function SeatSelectionScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const trip = route.params.trip;
  const [loading, setLoading] = useState(true);
  const [seatData, setSeatData] = useState<SeatMapData | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [pax, setPax] = useState<Record<number, Pax>>({});
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [earlyBirdRules, setEarlyBirdRules] = useState<LoyaltyRules['early_bird'] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const checkoutRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        trip.vendor_phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${trip.vendor_phone!.replace(/[^+\d]/g, '')}`)}
            style={({ pressed }) => [styles.headerCall, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityLabel="Call operator"
          >
            <MaterialCommunityIcons name="headset" size={24} color={colors.ink} />
          </Pressable>
        ) : null,
    });
  }, [navigation, trip.vendor_phone, colors, styles]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.fetchSeatMap(trip.id);
        if (active) setSeatData(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load seat map.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [trip.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const wallet = await api.fetchWallet();
        if (active) setWalletBalance(Number(wallet.wallet.balance));
      } catch {
        // wallet balance is cosmetic here; the server validates anyway
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rules = await api.fetchOfferRules();
        if (active) setEarlyBirdRules(rules.early_bird);
      } catch {
        // early-bird is display-only; the server computes the discount anyway
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function seatNumber(id: number): string {
    const seat = seatData?.seats.find((s) => s.id === id);
    return seat ? seat.seat_number : '?';
  }

  function toggleSeat(seat: Seat) {
    if (seat.reserved) return;
    setSelected((prev) => {
      if (prev.includes(seat.id)) return prev.filter((id) => id !== seat.id);
      if (prev.length >= selectionCap) return prev;
      const next = [...prev, seat.id];
      setPax((p) => ({ ...p, [seat.id]: p[seat.id] || { name: '', age: '', gender: '' } }));
      return next;
    });
  }

  function updatePax(id: number, field: keyof Pax, value: string) {
    setPax((p) => ({ ...p, [id]: { ...p[id], [field]: value } }));
  }

  function buildOrder(): { seats: number[]; passengers: PassengerInput[] } | null {
    const ordered = selected;
    if (ordered.length === 0) {
      setError('Select at least one seat.');
      return null;
    }
    const passengers: PassengerInput[] = ordered.map((id) => {
      const p = pax[id] || { name: '', age: '', gender: '' };
      return {
        name: p.name.trim(),
        age: p.age ? Number(p.age) : null,
        gender: p.gender || null,
      };
    });
    if (passengers.some((p) => !p.name)) {
      setError('Please enter a name for every passenger.');
      return null;
    }
    return { seats: ordered, passengers };
  }

  function openPaymentSheet() {
    if (!buildOrder()) return;
    setError('');
    setSheetOpen(true);
  }

  async function payWithWallet() {
    setSheetOpen(false);
    const order = buildOrder();
    if (!order) return;
    if (walletBalance !== null && walletBalance < totalAmount) {
      setError('Insufficient wallet balance. Top up to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createBooking({
        trip_id: trip.id,
        payment_method: 'wallet',
        seats: order.seats,
        passengers: order.passengers,
        callback_url: 'busline://payment/callback',
      });
      navigation.replace('BookingDetail', { id: result.booking.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function payWithPaystack() {
    setSheetOpen(false);
    const order = buildOrder();
    if (!order) return;

    setSubmitting(true);
    try {
      const result = await api.createBooking({
        trip_id: trip.id,
        payment_method: 'paystack',
        seats: order.seats,
        passengers: order.passengers,
        callback_url: 'busline://payment/callback',
      });
      if (result.authorization_url) {
        checkoutRef.current = result.payment_ref;
        setCheckoutUrl(result.authorization_url);
      } else {
        setError(result.paystack_error || 'Payment link unavailable. Please try again.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerified(reference: string): Promise<void> {
    const ticket = await api.verifyBookingPayment(reference);
    checkoutRef.current = null;
    navigation.replace('BookingDetail', { id: ticket.booking.id });
  }

  // While the Paystack checkout is open, poll the safe status endpoint so a
  // completed payment advances to the booking detail even if Paystack never
  // redirects back to the app.
  useEffect(() => {
    if (!checkoutUrl) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const ref = checkoutRef.current;
      if (!ref) return;
      try {
        const status = await api.checkBookingPaymentStatus(ref);
        if (cancelled) return;
        if (status.status === 'success') {
          clearInterval(timer);
          const ticket = await api.verifyBookingPayment(ref);
          if (!cancelled) navigation.replace('BookingDetail', { id: ticket.booking.id });
        }
      } catch {
        // transient network error; keep polling
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutUrl]);

  async function handleCheckoutClose() {
    const ref = checkoutRef.current;
    checkoutRef.current = null;
    setCheckoutUrl(null);
    // The in-app redirect may have been missed; reconcile to success if the
    // payment already completed on Paystack's side.
    try {
      if (ref) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const status = await api.checkBookingPaymentStatus(ref);
          if (status.status === 'success' && status.booking_id) {
            navigation.replace('BookingDetail', { id: status.booking_id });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    } catch {
      // stay on this screen; the booking remains pending and can be retried
    }
  }

  const subtotal = selected.length * Number(trip.price);
  const earlyBird =
    earlyBirdRules &&
    earlyBirdRules.days > 0 &&
    earlyBirdRules.discount_percent > 0 &&
    (() => {
      const dep = new Date(`${trip.departure_date}T00:00:00`);
      const diff = Math.floor((dep.getTime() - new Date().getTime()) / 86400000);
      return diff >= earlyBirdRules.days;
    })()
      ? earlyBirdRules
      : null;
  const discountAmount = earlyBird
    ? Math.round(subtotal * earlyBird.discount_percent * 100) / 10000
    : 0;
  const totalAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  const availableSeats = seatData ? seatData.seats.filter((s) => !s.reserved).length : 0;
  const selectionCap = Math.min(MAX_SEATS, availableSeats || MAX_SEATS);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.skeletonWrap}>
            <View style={styles.skeletonSummary}>
              <Skeleton width="70%" height={18} />
              <Skeleton width="45%" height={13} style={{ marginTop: 8 }} />
            </View>
            <View style={styles.card}>
              <Skeleton width={120} height={13} />
              <View style={styles.skeletonSeatGrid}>
                {[0, 1, 2, 3, 4].map((row) => (
                  <View key={row} style={styles.skeletonSeatRow}>
                    {[0, 1, 2, 3].map((col) => (
                      <Skeleton key={col} width={38} height={38} radius={10} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.card}>
                <Skeleton width="50%" height={14} />
                <Skeleton width="100%" height={46} radius={12} style={{ marginTop: 10 }} />
              </View>
            ))}
          </View>
        ) : error && !seatData ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <>
            <TripSummary trip={trip} />

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardHeadIcon}>
                    <Ionicons name="grid-outline" size={15} color={colors.muted} />
                  </View>
                  <Text style={styles.cardTitle}>Choose your seats</Text>
                </View>
                <View style={styles.counter}>
                  <Text style={styles.counterText}>
                    {selected.length} / {availableSeats}
                  </Text>
                </View>
              </View>
              <SeatMap seats={seatData?.seats || []} selected={selected} max={MAX_SEATS} onToggle={toggleSeat} layout={seatData?.layout} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.cardHeadIcon, styles.cardHeadIconGold]}>
                    <Ionicons name="people-outline" size={15} color={colors.muted} />
                  </View>
                  <Text style={styles.cardTitle}>Passenger details</Text>
                </View>
                {selected.length > 0 ? (
                  <View style={styles.counter}>
                    <Text style={styles.counterText}>{selected.length} selected</Text>
                  </View>
                ) : null}
              </View>
              {selected.length === 0 ? (
                <Text style={styles.emptyHint}>Select at least one seat to continue.</Text>
              ) : (
                selected.map((id, idx) => (
                  <View key={id} style={styles.paxPanel}>
                    <View style={styles.paxHead}>
                      <View style={styles.seatChip}>
                        <Text style={styles.seatChipText}>Seat {seatNumber(id)}</Text>
                      </View>
                      <Text style={styles.paxPrice}>₦{formatPrice(trip.price)}</Text>
                    </View>
                    <PaxInput
                      placeholder="Passenger {n} full name"
                      placeholderN={idx + 1}
                      value={pax[id]?.name || ''}
                      onChangeText={(v) => updatePax(id, 'name', v)}
                    />
                    <View style={styles.paxRow}>
                      <TextInput
                        style={[styles.input, styles.paxCol]}
                        placeholder="Age"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        value={pax[id]?.age || ''}
                        onChangeText={(v) => updatePax(id, 'age', v.replace(/[^0-9]/g, ''))}
                      />
                      <View style={[styles.genderWrap, styles.paxCol]}>
                        {['male', 'female'].map((g) => (
                          <GenderPill
                            key={g}
                            label={g}
                            active={(pax[id]?.gender || '') === g}
                            onPress={() => updatePax(id, 'gender', (pax[id]?.gender || '') === g ? '' : g)}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {!loading && seatData ? (
        <View style={styles.bottomBar}>
          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLbl}>Subtotal</Text>
              <Text style={styles.summaryVal}>₦{formatPrice(subtotal)}</Text>
            </View>
            {earlyBird ? (
              <View style={styles.summaryRow}>
                <View style={styles.ebLblWrap}>
                  <Ionicons name="sunny" size={13} color={colors.success} />
                  <Text style={styles.ebLbl}>Early bird · {earlyBird.discount_percent}% off</Text>
                </View>
                <Text style={styles.ebVal}>−₦{formatPrice(discountAmount)}</Text>
              </View>
            ) : null}
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryLbl}>Total</Text>
              <Text style={styles.totalAmount}>₦{formatPrice(totalAmount)}</Text>
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actionRow}>
            <PrimaryButton
              label={`Book & Pay ₦${formatPrice(totalAmount)}`}
              icon="lock-closed-outline"
              variant="dark"
              onPress={openPaymentSheet}
              loading={submitting}
              disabled={selected.length === 0}
              block
            />
          </View>
        </View>
      ) : null}

      <PaymentMethodSheet
        visible={sheetOpen}
        amount={totalAmount}
        seatCount={selected.length}
        walletBalance={walletBalance}
        busy={submitting}
        onWallet={payWithWallet}
        onPaystack={payWithPaystack}
        onClose={() => setSheetOpen(false)}
      />

      {checkoutUrl ? (
        <PaystackCheckoutModal
          url={checkoutUrl}
          onClose={handleCheckoutClose}
          onVerified={handleVerified}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function TripSummary({ trip }: { trip: Trip }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.card, styles.summary]}>
      <View style={styles.sumBusRow}>
        <View style={styles.sumBusIcon}>
          <Ionicons name="bus" size={18} color={colors.mutedLight} />
        </View>
        <Text style={styles.sumBus} numberOfLines={1}>
          {trip.vendor_name} · {trip.bus_name} ({trip.registration_number})
        </Text>
      </View>
      <View style={styles.sumRoute}>
        <Text style={styles.sumCity} numberOfLines={1}>
          {trip.origin_city}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.muted} />
        <Text style={[styles.sumCity, styles.sumDest]} numberOfLines={1}>
          {trip.destination_city}
        </Text>
      </View>
      <View style={styles.sumMeta}>
        <Text style={styles.sumMetaText}>{formatDate(trip.departure_date)}</Text>
        <Text style={styles.sumDot}>·</Text>
        <Text style={styles.sumMetaText}>{trip.departure_time}</Text>
        {trip.arrival_time ? (
          <>
            <Text style={styles.sumDot}>·</Text>
            <Text style={styles.sumMetaText}>{durationMinutes(trip.departure_time, trip.arrival_time)}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.sumPriceRow}>
        <View style={styles.sumPriceBlock}>
          <Text style={styles.sumPrice}>₦{formatPrice(trip.price)}</Text>
          <Text style={styles.sumPriceSub}>per seat</Text>
        </View>
        {trip.bus_type ? (
          <View style={styles.sumCat}>
            <Text style={styles.sumCatText}>{trip.bus_type}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

interface PaxInputProps {
  placeholder: string;
  placeholderN: number;
  value: string;
  onChangeText: (v: string) => void;
}

function PaxInput({ placeholder, placeholderN, value, onChangeText }: PaxInputProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder.replace('{n}', String(placeholderN))}
      placeholderTextColor="#94a3b8"
      autoCapitalize="words"
      value={value}
      onChangeText={onChangeText}
    />
  );
}

function GenderPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.genderPill,
        active && { backgroundColor: colors.teal, borderColor: colors.teal },
      ]}
    >
      <Text style={[styles.genderText, active && styles.genderTextActive]}>{label}</Text>
    </Pressable>
  );
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  safe: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 260,
  },
  center: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    ...shadow.sm,
  },
  skeletonWrap: {
    gap: 14,
  },
  skeletonSummary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  skeletonSeatGrid: {
    gap: 10,
    marginTop: 14,
  },
  skeletonSeatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: font.bold,
    color: colors.text,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeadIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadIconGold: {
    backgroundColor: colors.surfaceAlt,
  },
  counter: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterText: {
    fontSize: 15,
    fontWeight: font.bold,
    color: colors.muted,
  },
  summary: {
    borderRadius: 22,
    padding: 18,
    alignItems: 'stretch',
  },
  sumBusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sumBusIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sumRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sumCity: {
    fontSize: 21,
    fontWeight: font.bold,
    color: colors.text,
    maxWidth: 150,
  },
  sumDest: {
    color: colors.text,
  },
  sumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  sumMetaText: {
    fontSize: 15,
    color: colors.muted,
  },
  sumDot: {
    color: colors.mutedLight,
  },
  sumBus: {
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
  sumPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sumPriceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  sumPrice: {
    fontSize: 24,
    fontWeight: font.bold,
    color: colors.text,
  },
  sumPriceSub: {
    fontSize: 13,
    color: colors.muted,
  },
  sumCat: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sumCatText: {
    fontSize: 13,
    fontWeight: font.semibold,
    color: colors.text,
  },
  emptyHint: {
    color: colors.muted,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 16,
  },
  paxPanel: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  paxHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  seatChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seatChipText: {
    fontSize: 15,
    fontWeight: font.bold,
    color: colors.text,
  },
  paxPrice: {
    fontSize: 15,
    color: colors.muted,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  paxRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paxCol: {
    flex: 1,
  },
  genderWrap: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  genderPill: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  genderText: {
    fontSize: 14,
    fontWeight: font.semibold,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  genderTextActive: {
    color: colors.white,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    shadowColor: '#2B1F19',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 12,
  },
  summaryRows: {
    marginBottom: 10,
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCall: {
    marginRight: 16,
    padding: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 2,
  },
  summaryLbl: {
    fontSize: 16,
    color: colors.muted,
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.text,
  },
  ebLblWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ebLbl: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.success,
  },
  ebVal: {
    fontSize: 15,
    fontWeight: font.bold,
    color: colors.success,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: font.bold,
    color: colors.text,
  },
});
