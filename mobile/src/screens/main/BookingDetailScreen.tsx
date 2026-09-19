import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import type { TicketData } from '../../api/types';
import { LeafletMapWebView, type LeafletMarker, type LeafletRoute } from '../../components/LeafletMapWebView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Skeleton } from '../../components/Skeleton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { durationMinutes, formatDate, formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<MainStackParamList, 'BookingDetail'>;

const HEADER_H = 60; // collapsed sheet height (drag bar + route line)
const PARTIAL = 0.6; // highest the sheet can open (fraction of screen); no full-screen

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatMinutesLabel(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function BookingDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<TicketData | null>(null);
  const [road, setRoad] = useState<api.RoadRouteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ticket = await api.fetchBookingDetail(route.params.id);
      setData(ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const bookingDraft = data?.booking;
  const originLat = toNum(bookingDraft?.origin_lat);
  const originLng = toNum(bookingDraft?.origin_lng);
  const destLat = toNum(bookingDraft?.destination_lat);
  const destLng = toNum(bookingDraft?.destination_lng);

  useEffect(() => {
    let active = true;
    setRoad(null);
    if (originLat === null || originLng === null || destLat === null || destLng === null) return;
    api
      .fetchRoadRoute(
        { latitude: originLat, longitude: originLng },
        { latitude: destLat, longitude: destLng }
      )
      .then((r) => {
        if (active) setRoad(r);
      });
    return () => {
      active = false;
    };
  }, [originLat, originLng, destLat, destLng]);

  // --- Draggable bottom sheet over the fullscreen map ---
  const areaRef = useRef(0);
  const heightRef = useRef(HEADER_H);
  const startHeightRef = useRef(0);
  const [collapsed, setCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);
  const sheetHeight = useRef(new Animated.Value(HEADER_H)).current;

  async function copyBookingNumber() {
    await Clipboard.setStringAsync(booking?.booking_number ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function partialHeight() {
    return areaRef.current > 0 ? areaRef.current * PARTIAL : collapsedHeight();
  }
  function collapsedHeight() {
    return HEADER_H;
  }
  function clampHeight(h: number) {
    return Math.min(Math.max(h, collapsedHeight()), partialHeight());
  }
  function snapSheet(target: number, animated = true) {
    const next = clampHeight(target);
    heightRef.current = next;
    setCollapsed(next <= (partialHeight() + collapsedHeight()) / 2);
    if (animated) {
      Animated.spring(sheetHeight, { toValue: next, useNativeDriver: false, bounciness: 0, speed: 16 }).start();
    } else {
      sheetHeight.setValue(next);
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startHeightRef.current = heightRef.current;
        sheetHeight.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const next = clampHeight(startHeightRef.current - g.dy);
        heightRef.current = next;
        sheetHeight.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) < 5 && Math.abs(g.dx) < 5) {
          snapSheet(collapsed ? partialHeight() : collapsedHeight());
          return;
        }
        const current = startHeightRef.current - g.dy;
        const mid = (partialHeight() + collapsedHeight()) / 2;
        let target: number;
        if (g.vy < -0.35) {
          target = partialHeight();
        } else if (g.vy > 0.35) {
          target = collapsedHeight();
        } else {
          target = current < mid ? collapsedHeight() : partialHeight();
        }
        snapSheet(target);
      },
    }),
  ).current;

  async function onCancel() {
    const refundsToWallet = (data?.payments || []).some(
      (p) =>
        p.payment_method === 'wallet' ||
        (p.payment_method === 'paystack' && p.status === 'success')
    );
    Alert.alert(
      'Cancel booking',
      refundsToWallet
        ? 'Cancel this booking? Seats will be released and the amount refunded to your wallet.'
        : 'Cancel this booking? Reserved seats will be released.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await api.cancelBooking(route.params.id);
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not cancel booking.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.safe}>
        <View style={styles.area}>
          <View style={[styles.backBtn, { top: insets.top + 8 }]}>
            <Skeleton width={42} height={42} radius={21} />
          </View>
        </View>
        <View style={styles.skeletonBody}>
          <View style={styles.skeletonCard}>
            <Skeleton width={120} height={20} />
            <Skeleton width="100%" height={16} style={{ marginTop: 14 }} />
            <Skeleton width="70%" height={16} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={16} style={{ marginTop: 22 }} />
            <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={16} style={{ marginTop: 22 }} />
            <Skeleton width="55%" height={16} style={{ marginTop: 8 }} />
          </View>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { position: 'absolute', top: insets.top + 8, left: 16 }, pressed && { opacity: 0.7 }]}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.error}>{error || 'Booking not found.'}</Text>
      </View>
    );
  }

  const booking = data.booking;
  const seats = data.seats || [];
  const canCancel = ['pending', 'confirmed'].includes(booking.status);

  const originLatB = toNum(booking.origin_lat);
  const originLngB = toNum(booking.origin_lng);
  const destLatB = toNum(booking.destination_lat);
  const destLngB = toNum(booking.destination_lng);
  const hasRoute =
    originLatB !== null && originLngB !== null && destLatB !== null && destLngB !== null;

  const mapMarkers: LeafletMarker[] = hasRoute
    ? [
        { id: 'origin', latitude: originLatB!, longitude: originLngB!, label: booking.origin_city, kind: 'from' },
        { id: 'destination', latitude: destLatB!, longitude: destLngB!, label: booking.destination_city, kind: 'to' },
      ]
    : [];

  const straightRoute: LeafletRoute | null = hasRoute
    ? {
        coords: [
          { latitude: originLatB!, longitude: originLngB! },
          { latitude: destLatB!, longitude: destLngB! },
        ],
        color: colors.ink,
        weight: 4,
      }
    : null;

  const mapRoute: LeafletRoute | null =
    road && road.coords.length >= 2
      ? { coords: road.coords, color: colors.ink, weight: 4 }
      : straightRoute;

  const scheduleJourney =
    booking.arrival_time && booking.departure_time
      ? durationMinutes(booking.departure_time, booking.arrival_time)
      : null;

  const roadJourney = road ? formatMinutesLabel(road.durationSec / 60) : null;
  const durationLabel = scheduleJourney ?? roadJourney;
  const distanceLabel = road && road.distanceKm > 0 ? `${Math.round(road.distanceKm)} km` : null;
  const travelBadge = [durationLabel, distanceLabel].filter(Boolean).join(' · ') || null;

  return (
    <View style={styles.safe}>
      <View
        style={styles.area}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.round(h) !== Math.round(areaRef.current)) {
            areaRef.current = h;
            if (heightRef.current === collapsedHeight()) {
              snapSheet(partialHeight(), false);
            }
          }
        }}
      >
        <LeafletMapWebView
          style={StyleSheet.absoluteFillObject}
          markers={mapMarkers}
          route={mapRoute}
          autoFit
          fitPadding={{ top: insets.top + 56, right: 44, bottom: HEADER_H + 20, left: 44 }}
        />

        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { top: insets.top + 8 }, pressed && { opacity: 0.7 }]}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        {travelBadge ? (
          <View style={[styles.travelBadge, { top: insets.top + 10 }]}>
            <Ionicons name="time-outline" size={13} color={colors.teal} />
            <Text style={styles.travelBadgeText}>{travelBadge}</Text>
          </View>
        ) : null}

        <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
          <View style={styles.sheetHeader} {...panResponder.panHandlers}>
            <Pressable
              onPress={() => snapSheet(collapsed ? partialHeight() : collapsedHeight())}
              style={styles.sheetGrab}
              accessibilityRole="button"
              accessibilityLabel={collapsed ? 'Show booking details' : 'Hide booking details'}
            >
              <View style={styles.grabber} />
            </Pressable>
            <Text style={styles.sheetRoute} numberOfLines={1}>
              {booking.origin_city} → {booking.destination_city}
            </Text>
          </View>

          {collapsed ? null : (
            <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.journeyRow}>
              <View style={styles.journeyItem}>
                <Text style={styles.journeyLabel}>Departs</Text>
                <Text style={styles.journeyValue}>{formatDate(booking.departure_date)}</Text>
                <Text style={styles.journeySub}>{booking.departure_time}</Text>
              </View>
              <View style={styles.journeyItem}>
                <Text style={styles.journeyLabel}>Destination</Text>
                <Text style={styles.journeyValue} numberOfLines={1}>
                  {booking.destination_city}
                </Text>
                <Text style={styles.journeySub}>{booking.origin_city}</Text>
              </View>
            </View>

            <View style={styles.hair} />
            <View style={styles.journeyRow}>
              <View style={styles.journeyItem}>
                <Text style={styles.journeyLabel}>Seats</Text>
                <Text style={styles.journeyValue} numberOfLines={1}>
                  {seats.length > 0 ? seats.map((s) => s.seat_number).join(', ') : '—'}
                </Text>
                <Text style={styles.journeySub}>
                  {seats.length} seat{seats.length === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.journeyItem}>
                <Text style={styles.journeyLabel}>Booking no.</Text>
                <Pressable
                  onPress={copyBookingNumber}
                  style={({ pressed }) => [styles.copyRow, pressed && { opacity: 0.6 }]}
                  hitSlop={6}
                >
                  <Text style={styles.copyValue} numberOfLines={1}>
                    {booking.booking_number}
                  </Text>
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={14}
                    color={copied ? colors.teal : colors.muted}
                  />
                  <Text style={[styles.copyHint, copied && { color: colors.teal }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.hair} />
            <View style={styles.operatorRow}>
              <View style={styles.operatorInfo}>
                <Text style={styles.operatorName} numberOfLines={1}>
                  {booking.vendor_name}
                </Text>
                <Text style={styles.operatorDetail} numberOfLines={1}>
                  {[booking.bus_name, booking.bus_type, booking.registration_number]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {booking.vendor_phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${booking.vendor_phone!.replace(/[^+\d]/g, '')}`)}
                  style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.7 }]}
                  hitSlop={8}
                >
                  <Ionicons name="call-outline" size={15} color={colors.text} />
                </Pressable>
              ) : null}
            </View>

            {seats.length > 0 ? (
              <>
                <View style={styles.hair} />
                {seats.map((s) => (
                  <View key={s.id} style={styles.paxRow}>
                    <Text style={styles.paxSeat}>{s.seat_number}</Text>
                    <View style={styles.paxInfo}>
                      <Text style={styles.paxName} numberOfLines={1}>
                        {s.passenger_name}
                      </Text>
                      {s.passenger_age || s.passenger_gender ? (
                        <Text style={styles.paxMeta} numberOfLines={1}>
                          {[s.passenger_age ? `${s.passenger_age} yrs` : null, s.passenger_gender]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.paxPrice}>₦{formatPrice(s.ticket_price)}</Text>
                  </View>
                ))}
              </>
            ) : null}

            <View style={styles.hair} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total paid</Text>
              <Text style={styles.totalAmount}>₦{formatPrice(booking.total_amount)}</Text>
            </View>

            {data.qr ? (
              <>
                <View style={styles.hair} />
                <Text style={styles.cardTitle}>Boarding pass</Text>
                <View style={styles.qrWrap}>
                  <Image source={{ uri: data.qr }} style={styles.qr} resizeMode="contain" />
                </View>
                <Text style={styles.qrHint}>Show this QR to the bus staff at check-in.</Text>
              </>
            ) : null}

            <View style={styles.actionsRow}>
              <PrimaryButton
                label="Download ticket"
                onPress={() => navigation.navigate('Ticket', { id: booking.id })}
                icon="ticket"
                variant="dark"
                block={false}
                style={styles.actionBtn}
              />
              {canCancel ? (
                <PrimaryButton
                  label="Cancel booking"
                  onPress={onCancel}
                  loading={cancelling}
                  variant="danger"
                  block={false}
                  style={styles.actionBtn}
                />
              ) : null}
            </View>
          </ScrollView>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    area: {
      flex: 1,
      overflow: 'hidden',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      overflow: 'hidden',
      zIndex: 25,
      ...shadow.md,
    },
    sheetHeader: {
      paddingTop: 8,
      paddingBottom: 6,
      backgroundColor: colors.surface,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 5,
    },
    sheetGrab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      position: 'relative',
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.mutedLight,
    },
    sheetRoute: {
      fontSize: 13,
      fontWeight: font.semibold,
      color: colors.text,
      textTransform: 'capitalize',
      textAlign: 'left',
      marginTop: 6,
      paddingHorizontal: 16,
    },
    sheetBody: {
      flex: 1,
      marginTop: HEADER_H,
    },
    backBtn: {
      position: 'absolute',
      left: 16,
      width: 42,
      height: 42,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 30,
      ...shadow.sm,
    },
    travelBadge: {
      position: 'absolute',
      right: 16,
      maxWidth: '62%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
      zIndex: 30,
      ...shadow.sm,
    },
    travelBadgeText: {
      fontSize: 13,
      fontWeight: font.semibold,
      color: colors.text,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 18,
      paddingBottom: 32,
    },
    hair: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 18,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      padding: 24,
    },
    error: {
      color: colors.danger,
      fontSize: 16,
      textAlign: 'center',
    },
    journeyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 24,
    },
    journeyItem: {
      flex: 1,
      minWidth: 0,
    },
    journeyLabel: {
      fontSize: 11,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      fontWeight: font.bold,
    },
    journeyValue: {
      fontSize: 15,
      fontWeight: font.bold,
      color: colors.text,
      marginTop: 4,
      textTransform: 'capitalize',
    },
    journeySub: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    copyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    copyValue: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: font.bold,
      color: colors.text,
      letterSpacing: 0.6,
    },
    copyHint: {
      fontSize: 11,
      fontWeight: font.semibold,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    operatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    operatorInfo: {
      flex: 1,
    },
    operatorName: {
      fontSize: 16,
      fontWeight: font.semibold,
      color: colors.text,
      textTransform: 'capitalize',
    },
    operatorDetail: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    callBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    paxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 3,
    },
    paxSeat: {
      width: 34,
      fontSize: 14,
      fontWeight: font.bold,
      color: colors.text,
    },
    paxInfo: {
      flex: 1,
    },
    paxName: {
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.text,
    },
    paxMeta: {
      fontSize: 13,
      color: colors.muted,
      textTransform: 'capitalize',
    },
    paxPrice: {
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.text,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.text,
    },
    totalAmount: {
      fontSize: 20,
      fontWeight: font.bold,
      color: colors.text,
    },
    cardTitle: {
      fontSize: 12,
      fontWeight: font.bold,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      textAlign: 'center',
    },
    qrWrap: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    qr: {
      width: 120,
      height: 120,
    },
    qrHint: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },
    actionsRow: {
      flexDirection: 'column',
      gap: 10,
      marginTop: 24,
    },
    actionBtn: {
      width: '100%',
      flex: undefined,
    },
    actionWide: {
      flex: 1,
      width: '100%',
    },
    skeletonBody: {
      padding: 16,
    },
    skeletonCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      ...shadow.sm,
    },
  });