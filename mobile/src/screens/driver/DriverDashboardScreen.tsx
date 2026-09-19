import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchDriverTripDetail, fetchDriverTrips } from '../../api/endpoints';
import type { DriverTrip } from '../../api/types';
import { StatusBadge } from '../../components/MarketplaceBits';
import { useAuth } from '../../context/AuthContext';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

const FILTERS = ['all', 'today', 'upcoming', 'completed', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

export function DriverDashboardScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, staff, logout } = useAuth();

  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [detail, setDetail] = useState<{
    trip: DriverTrip;
    bookings: { id: number; booking_number: string; customer_name?: string; seat_count: number; status: string }[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrips(await fetchDriverTrips());
    } catch (e) {
      Alert.alert(
        'Could not load trips',
        e instanceof Error ? e.message : 'Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const sections = useMemo(() => {
    const grouped: { today: DriverTrip[]; upcoming: DriverTrip[]; past: DriverTrip[] } = {
      today: [],
      upcoming: [],
      past: [],
    };
    for (const t of trips) {
      if (t.status === 'cancelled') continue;
      const isPast =
        t.status === 'completed' ||
        (t.departure_date < today && t.status !== 'scheduled') ||
        (t.departure_date < today && t.departure_time && t.status === 'scheduled');
      if (isPast) grouped.past.push(t);
      else if (t.departure_date === today) grouped.today.push(t);
      else grouped.upcoming.push(t);
    }
    const sort = (a: DriverTrip, b: DriverTrip) =>
      `${a.departure_date} ${a.departure_time}`.localeCompare(`${b.departure_date} ${b.departure_time}`);
    return {
      today: grouped.today.sort(sort),
      upcoming: grouped.upcoming.sort(sort),
      past: grouped.past.sort((a, b) =>
        `${b.departure_date} ${b.departure_time}`.localeCompare(`${a.departure_date} ${a.departure_time}`)
      ),
    };
  }, [trips, today]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'today':
        return sections.today;
      case 'upcoming':
        return sections.upcoming;
      case 'completed':
        return trips.filter((t) => t.status === 'completed');
      case 'cancelled':
        return trips.filter((t) => t.status === 'cancelled');
      default:
        return trips;
    }
  }, [filter, trips, sections]);

  async function openDetail(trip: DriverTrip) {
    setShowDetail(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await fetchDriverTripDetail(trip.id);
      setDetail({
        trip: { ...data.trip, driver_role: data.driver_role, assigned_at: data.assigned_at },
        bookings: (data.bookings ?? []) as typeof detail extends { bookings: infer B } ? B : never,
      });
    } catch (e) {
      setDetail(null);
      Alert.alert('Trip detail', e instanceof Error ? e.message : 'Could not load this trip.');
    } finally {
      setDetailLoading(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Log out', 'Sign out of your driver account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerBody}>
            <Text style={styles.eyebrow}>Driver dashboard</Text>
            <Text style={styles.title} numberOfLines={1}>
              Hi, {user?.name?.split(' ')[0] || 'Driver'}
            </Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={confirmLogout} accessibilityLabel="Log out">
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>

        {staff ? (
          <View style={styles.crewChip}>
            <Ionicons name="id-card-outline" size={15} color={colors.primary} />
            <Text style={styles.crewChipText}>Assigned to vendor #{staff.vendor_id}</Text>
          </View>
        ) : null}

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

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="time-outline" size={46} color={colors.mutedLight} />
            <Text style={styles.emptyText}>No trips in this view</Text>
            <Text style={styles.emptySub}>Trips assigned to you by an admin or vendor will appear here.</Text>
          </View>
        ) : (
          <>
            {filter === 'all' && (
              <>
                <SectionHeader icon="today-outline" title="Today" count={sections.today.length} />
                {renderTrips(sections.today, colors, styles, openDetail)}
                <SectionHeader icon="calendar-outline" title="Upcoming" count={sections.upcoming.length} />
                {renderTrips(sections.upcoming, colors, styles, openDetail)}
                <SectionHeader icon="checkmark-done-outline" title="Past trips" count={sections.past.length} />
                {renderTrips(sections.past, colors, styles, openDetail)}
              </>
            )}
            {filter === 'today' && renderTrips(sections.today, colors, styles, openDetail)}
            {filter === 'upcoming' && renderTrips(sections.upcoming, colors, styles, openDetail)}
            {filter === 'completed' &&
              renderTrips(trips.filter((t) => t.status === 'completed'), colors, styles, openDetail)}
            {filter === 'cancelled' &&
              renderTrips(trips.filter((t) => t.status === 'cancelled'), colors, styles, openDetail)}
          </>
        )}
      </ScrollView>

      <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBody}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {detail?.trip.origin_city} → {detail?.trip.destination_city}
                </Text>
                <Text style={styles.modalSub}>
                  {detail?.trip.departure_date} {detail?.trip.departure_time}
                  {detail?.trip.arrival_time ? ` – ${detail.trip.arrival_time}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setShowDetail(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {detailLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : detail ? (
              <>
                <View style={styles.detailChips}>
                  <View style={[styles.detailChip, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="bus-outline" size={13} color={colors.primary} />
                    <Text style={[styles.detailChipText, { color: colors.primary }]}>{detail.trip.bus_name}</Text>
                  </View>
                  <View style={[styles.detailChip, { backgroundColor: colors.warningSoft }]}>
                    <Ionicons name="id-card-outline" size={13} color={colors.warning} />
                    <Text style={[styles.detailChipText, { color: colors.warning }]}>{detail.trip.driver_role}</Text>
                  </View>
                  <View style={[styles.detailChip, { backgroundColor: colors.successSoft }]}>
                    <Ionicons name="people-outline" size={13} color={colors.success} />
                    <Text style={[styles.detailChipText, { color: colors.success }]}>
                      {detail.bookings.reduce((n, b) => n + Number(b.seat_count || 0), 0)} passenger(s)
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalSectionTitle}>Bookings on this trip</Text>
                {detail.bookings.length === 0 ? (
                  <Text style={styles.emptySub}>No bookings yet.</Text>
                ) : (
                  detail.bookings.map((b) => (
                    <View key={b.id} style={styles.passengerRow}>
                      <View style={[styles.passengerIcon, { backgroundColor: colors.primarySoft }]}>
                        <Ionicons name="person" size={15} color={colors.primary} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {b.customer_name || 'Passenger'}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {b.booking_number} · {b.seat_count} seat(s)
                        </Text>
                      </View>
                      <StatusBadge status={b.status} />
                    </View>
                  ))
                )}
              </>
            ) : (
              <Text style={styles.emptySub}>Could not load this trip.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title, count }: { icon: keyof typeof Ionicons.glyphMap; title: string; count: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 ? <Text style={styles.sectionCount}>{count}</Text> : null}
    </View>
  );
}

function renderTrips(
  trips: DriverTrip[],
  colors: ThemeColors,
  styles: ReturnType<typeof createStyles>,
  onPress: (t: DriverTrip) => void
) {
  if (trips.length === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptySub}>No trips here.</Text>
      </View>
    );
  }
  return trips.map((t) => (
    <Pressable key={t.id} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => onPress(t)}>
      <View style={styles.cardTop}>
        <View style={[styles.thumb, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="bus" size={20} color={colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {t.origin_city} → {t.destination_city}
          </Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {t.departure_date} · {t.departure_time}
            {t.arrival_time ? ` – ${t.arrival_time}` : ''}
          </Text>
          <Text style={styles.cardMetaText} numberOfLines={1}>
            {t.bus_name || 'Bus'} · {t.vendor_name || 'Vendor'}
          </Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <StatusBadge status={t.status} />
        <View style={[styles.roleBadge, t.driver_role === 'assistant' && styles.roleBadgeAssistant]}>
          <Ionicons name="id-card-outline" size={11} color={t.driver_role === 'assistant' ? colors.accentPurple : colors.primary} />
          <Text style={[styles.roleText, { color: t.driver_role === 'assistant' ? colors.accentPurple : colors.primary }]}>
            {t.driver_role}
          </Text>
        </View>
        <Text style={styles.seatsText}>
          {t.passenger_count != null ? `${t.passenger_count} passenger(s)` : 'No bookings yet'}
        </Text>
      </View>
    </Pressable>
  ));
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
    centered: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    headerBody: { flex: 1 },
    eyebrow: { fontSize: 12, fontWeight: font.bold, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
    title: { fontSize: 24, fontWeight: font.bold, color: colors.text, marginTop: 2 },
    logoutBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    crewChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 14,
    },
    crewChipText: { fontSize: 12, fontWeight: font.semibold, color: colors.primary },
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
    emptyText: { fontSize: 16, fontWeight: font.bold, color: colors.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: 20, marginTop: 2 },
    emptyRow: { paddingVertical: 16, alignItems: 'center' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: font.bold, color: colors.text, flex: 1 },
    sectionCount: {
      fontSize: 12,
      fontWeight: font.bold,
      color: colors.muted,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
      ...shadow.sm,
    },
    cardPressed: { opacity: 0.8 },
    cardTop: { flexDirection: 'row', gap: 12 },
    thumb: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: font.bold, color: colors.text },
    cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
    cardMetaText: { fontSize: 13, color: colors.muted, marginTop: 2 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    roleBadgeAssistant: { backgroundColor: colors.accentPurple + '1A' },
    roleText: { fontSize: 11, fontWeight: font.bold, textTransform: 'capitalize' },
    seatsText: { fontSize: 12, color: colors.muted },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 18,
      maxHeight: '78%',
      ...shadow.md,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    modalHeaderBody: { flex: 1 },
    modalTitle: { fontSize: 18, fontWeight: font.bold, color: colors.text },
    modalSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    detailChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
    detailChipText: { fontSize: 12, fontWeight: font.bold, textTransform: 'capitalize' },
    modalSectionTitle: { fontSize: 14, fontWeight: font.bold, color: colors.text, marginBottom: 8 },
    passengerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: 10,
      marginBottom: 8,
    },
    passengerIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1 },
    rowName: { fontSize: 14, fontWeight: font.bold, color: colors.text },
    rowSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  });
