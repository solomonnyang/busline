import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as api from '../../api/endpoints';
import type { TicketData } from '../../api/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Skeleton } from '../../components/Skeleton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { durationMinutes, formatBookingDate, formatPrice, statusColor } from '../../utils/format';

type Props = NativeStackScreenProps<MainStackParamList, 'Ticket'>;

export function TicketScreen({ route }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef<View>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ticket = await api.fetchTicket(route.params.id);
      setData(ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleDownload() {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const uri = await captureRef(ticketRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo access to save your ticket.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Your ticket has been saved to your photos.');
    } catch {
      Alert.alert('Download failed', 'Could not save the ticket. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.skeletonSafe}>
        <View style={styles.skeletonTicket}>
          <View style={styles.skeletonTop}>
            <View style={styles.skeletonTopRow}>
              <View>
                <Skeleton width={100} height={12} />
                <Skeleton width={150} height={20} style={{ marginTop: 8 }} />
              </View>
              <Skeleton width={70} height={26} radius={13} />
            </View>
            <View style={styles.skeletonRoute}>
              <View style={{ alignItems: 'flex-start', gap: 6 }}>
                <Skeleton width={64} height={30} />
                <Skeleton width={80} height={14} />
              </View>
              <Skeleton width={70} height={30} radius={15} />
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Skeleton width={64} height={30} />
                <Skeleton width={80} height={14} />
              </View>
            </View>
          </View>
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonMetaRow}>
              <Skeleton width={120} height={14} />
              <Skeleton width={120} height={14} />
            </View>
            <View style={styles.skeletonMetaRow}>
              <Skeleton width={130} height={14} />
              <Skeleton width={110} height={14} />
            </View>
            <Skeleton width="100%" height={90} radius={16} style={{ marginTop: 14 }} />
          </View>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Ticket not found.'}</Text>
      </View>
    );
  }

  const booking = data.booking;
  const status = booking.status.replace('_', ' ');

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View ref={ticketRef} style={styles.ticket} collapsable={false}>
        <LinearGradient
          colors={
            isDark ? ['#FBBF24', '#D97706'] : [colors.teal, '#D97706']
          }
          style={styles.ticketTop}
        >
          <View style={styles.ticketHead}>
            <View>
              <Text style={styles.label}>Boarding pass</Text>
              <Text style={styles.number}>{booking.booking_number}</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: softColor(colors, booking.status) }]}>
              <Text style={[styles.status, { color: statusColor(booking.status) }]}>{status}</Text>
            </View>
          </View>

          <View style={styles.route}>
            <View style={styles.routeCity}>
              <Text style={styles.cityCode}>{initials(booking.origin_city)}</Text>
              <Text style={styles.cityName} numberOfLines={1}>{booking.origin_city}</Text>
            </View>
            <View style={styles.routeLine}>
              <View style={styles.dash} />
              <View style={styles.plane}>
                <Ionicons name="bus" size={18} color={colors.white} />
              </View>
              <View style={styles.dash} />
            </View>
            <View style={[styles.routeCity, styles.routeCityRight]}>
              <Text style={styles.cityCode}>{initials(booking.destination_city)}</Text>
              <Text style={[styles.cityName, styles.destName]} numberOfLines={1}>
                {booking.destination_city}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.zigzag}>
          <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.surfaceAlt }]} />
          <View style={styles.dashedLine} />
          <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.surfaceAlt }]} />
        </View>

        <View style={styles.ticketBody}>
          <View style={styles.metaRow}>
            <Meta label="Departs" value={`${booking.departure_date} · ${booking.departure_time}`} />
            {booking.arrival_time ? (
              <Meta
                label="Duration"
                value={durationMinutes(booking.departure_time, booking.arrival_time)}
              />
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <Meta label="Bus" value={booking.bus_name} />
            <Meta label="Registration" value={booking.registration_number} />
          </View>

          <View style={styles.metaRow}>
            <Meta label="Operator" value={booking.vendor_name} />
            <Meta label="Seats" value={(data.seats || []).map((s) => s.seat_number).join(', ')} />
          </View>

          <View style={styles.cardDivider} />

          <Text style={styles.cardTitle}>Passengers</Text>
          {(data.seats || []).map((s) => (
            <View key={s.id} style={styles.paxRow}>
              <View style={styles.seatChip}>
                <Text style={styles.seatChipText}>Seat {s.seat_number}</Text>
              </View>
              <View style={styles.paxInfo}>
                <Text style={styles.paxName}>{s.passenger_name}</Text>
                {s.passenger_age || s.passenger_gender ? (
                  <Text style={styles.paxMeta}>
                    {[s.passenger_age ? `${s.passenger_age} yrs` : null, s.passenger_gender]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.paxPrice}>₦{formatPrice(s.ticket_price)}</Text>
            </View>
          ))}

          <View style={styles.cardDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total paid</Text>
            <Text style={styles.totalAmount}>₦{formatPrice(booking.total_amount)}</Text>
          </View>
        </View>

        {data.qr ? (
          <View style={styles.qrWrap}>
            <Image source={{ uri: data.qr }} style={styles.qr} resizeMode="contain" />
            <Text style={styles.qrHint}>Show this QR to the bus staff at check-in.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.downloadBtn}>
        <PrimaryButton
          label="Download ticket"
          icon="download-outline"
          loading={downloading}
          onPress={() => void handleDownload()}
        />
      </View>
    </ScrollView>
  );
}

function initials(city: string | null | undefined): string {
  if (!city) return '??';
  return city
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function softColor(colors: ThemeColors, status: string): string {
  if (status === 'cancelled' || status === 'failed') return colors.dangerSoft;
  if (status === 'paid' || status === 'completed') return colors.successSoft;
  if (status === 'confirmed') return colors.primarySoft;
  return colors.warningSoft;
}

function Meta({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
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
      alignItems: 'center',
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
    ticket: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadow.sm,
    },
    ticketTop: {
      padding: 18,
      paddingBottom: 20,
      backgroundColor: colors.primary,
    },
    ticketHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: font.bold,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    number: {
      fontSize: 20,
      fontWeight: font.bold,
      color: colors.white,
      letterSpacing: 0.5,
      marginTop: 2,
    },
    statusChip: {
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    status: {
      fontSize: 14,
      fontWeight: font.bold,
      textTransform: 'capitalize',
    },
    route: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 18,
      gap: 10,
    },
    routeCity: {
      flex: 1,
      alignItems: 'flex-start',
    },
    routeCityRight: {
      alignItems: 'flex-end',
    },
    cityCode: {
      fontSize: 34,
      fontWeight: font.bold,
      color: colors.white,
    },
    cityName: {
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.white,
      marginTop: 2,
      opacity: 0.85,
    },
    destName: {
      textAlign: 'right',
    },
    routeLine: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
    },
    dash: {
      width: 34,
      height: 2,
      borderTopWidth: 2,
      borderTopColor: colors.ink,
      borderStyle: 'dashed',
      opacity: 0.4,
    },
    plane: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 2,
    },
    zigzag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      height: 18,
    },
    notch: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    notchLeft: {
      marginLeft: -9,
    },
    notchRight: {
      marginRight: -9,
    },
    dashedLine: {
      flex: 1,
      borderTopWidth: 2,
      borderTopColor: colors.ink,
      borderStyle: 'dashed',
      opacity: 0.35,
    },
    ticketBody: {
      padding: 18,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 14,
    },
    meta: {
      flex: 1,
    },
    metaLabel: {
      fontSize: 13,
      fontWeight: font.bold,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    metaValue: {
      fontSize: 16,
      fontWeight: font.semibold,
      color: colors.text,
      marginTop: 2,
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: font.bold,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    paxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    seatChip: {
      backgroundColor: colors.teal,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    seatChipText: {
      fontSize: 14,
      fontWeight: font.bold,
      color: colors.white,
    },
    paxInfo: {
      flex: 1,
    },
    paxName: {
      fontSize: 16,
      fontWeight: font.semibold,
      color: colors.text,
    },
    paxMeta: {
      fontSize: 14,
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
      fontSize: 16,
      fontWeight: font.bold,
      color: colors.text,
    },
    totalAmount: {
      fontSize: 22,
      fontWeight: font.bold,
      color: colors.gold,
    },
    qrWrap: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 18,
      paddingBottom: 20,
      paddingTop: 4,
    },
    qr: {
      width: 190,
      height: 190,
    },
    qrHint: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 8,
    },
    downloadBtn: {
      width: '100%',
      maxWidth: 420,
      marginTop: 20,
    },
    skeletonSafe: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      padding: 16,
    },
    skeletonTicket: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    skeletonTop: {
      backgroundColor: colors.primary,
      padding: 18,
      paddingBottom: 20,
    },
    skeletonTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    skeletonRoute: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
    },
    skeletonBody: {
      padding: 18,
      gap: 12,
    },
    skeletonMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });
