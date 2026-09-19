import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import type { TerminalBus, TerminalDetail, Trip } from '../../api/types';
import { Skeleton } from '../../components/Skeleton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { durationMinutes, formatDate, formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<MainStackParamList, 'TerminalDetail'>;

type PriceFilter = 'all' | 'lt5' | '5to10' | 'gt10';

const PRICE_FILTERS: { key: PriceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lt5', label: 'Under ₦5k' },
  { key: '5to10', label: '₦5k–10k' },
  { key: 'gt10', label: 'Above ₦10k' },
];

const HERO_BG =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfHNmhq24GFBMPs2XJ8yR41DhKni2XHLTVjxAPDbDeFQ&s=10';

function matchesPrice(b: TerminalBus, filter: PriceFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'lt5') return b.price < 5000;
  if (filter === '5to10') return b.price >= 5000 && b.price <= 10000;
  return b.price > 10000;
}

export function TerminalDetailScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<TerminalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchTerminal(route.params.id);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load terminal.');
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.fetchTerminal(route.params.id);
        if (active) setDetail(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load terminal.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [route.params.id]);

  const q = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!detail) return [];
    return (detail.buses_by_vendor ?? [])
      .map((group) => ({
        ...group,
        buses: group.buses.filter((b) => {
          if (!matchesPrice(b, priceFilter)) return false;
          if (!q) return true;
          return [
            b.bus_name,
            b.bus_type,
            b.registration_number,
            b.origin_city,
            b.destination_city,
            b.departure_time,
            group.vendor_name,
          ].some((f) => (f ?? '').toLowerCase().includes(q));
        }),
      }))
      .filter((g) => g.buses.length > 0);
  }, [detail, q, priceFilter]);

  function openBus(bus: TerminalBus, vendor: { vendor_name: string; vendor_logo?: string | null }) {
    const trip: Trip = {
      id: bus.trip_id,
      vendor_id: bus.vendor_id,
      bus_id: bus.bus_id,
      route_id: bus.route_id,
      departure_date: bus.departure_date ?? '',
      departure_time: bus.departure_time ?? '',
      arrival_time: bus.arrival_time,
      price: bus.price,
      available_seats: bus.available_seats,
      status: bus.status,
      bus_name: bus.bus_name ?? '',
      bus_type: bus.bus_type ?? '',
      registration_number: bus.registration_number ?? '',
      total_seats: bus.total_seats,
      origin_city: bus.origin_city ?? '',
      destination_city: bus.destination_city ?? '',
      origin_city_id: bus.origin_city_id,
      destination_city_id: bus.destination_city_id,
      vendor_name: vendor.vendor_name,
      vendor_logo: vendor.vendor_logo,
    };
    navigation.navigate('SeatSelection', { trip });
  }

  if (loading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top + 16 }]}>
        <Skeleton width={90} height={26} />
        <Skeleton width={44} height={44} radius={14} style={{ marginTop: 18 }} />
        <Skeleton width={200} height={28} style={{ marginTop: 12 }} />
        <Skeleton width={140} height={14} style={{ marginTop: 8 }} />
        <View style={styles.skeletonPills}>
          <Skeleton width={64} height={30} radius={14} />
          <Skeleton width={70} height={30} radius={14} />
          <Skeleton width={74} height={30} radius={14} />
        </View>
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={46} height={14} />
              <Skeleton width="60%" height={14} />
              <Skeleton width={50} height={14} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedLight} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!detail) return null;

  return (
    <View style={styles.safe}>
      <View style={[styles.hero, isDark && styles.heroDark, { paddingTop: insets.top }]}>
        <Image
          source={{ uri: HERO_BG }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <BlurView
          intensity={36}
          tint={isDark ? 'dark' : 'default'}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.heroOverlay, isDark && styles.heroOverlayDark]} />
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{detail.name}</Text>
        </View>

        <View style={styles.heroIcon}>
          <Ionicons name="business" size={22} color={colors.ink} />
        </View>
        <Text style={styles.title}>{detail.name}</Text>
        <View style={styles.subtitleRow}>
          <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.subtitle}>
            {[detail.city_name, detail.city_state].filter(Boolean).join(', ')}
          </Text>
        </View>
        {detail.address ? <Text style={styles.address}>{detail.address}</Text> : null}

        <View style={styles.statRow}>
          {detail.est_duration_minutes ? (
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={14} color={colors.ink} />
              <Text style={styles.statText}>{formatMinutes(detail.est_duration_minutes)}</Text>
            </View>
          ) : null}
          <View style={styles.stat}>
            <Ionicons name="bus-outline" size={14} color={colors.ink} />
            <Text style={styles.statText}>
              {detail.available_buses ?? 0}
            </Text>
          </View>
          {detail.min_price != null ? (
            <View style={styles.stat}>
              <Ionicons name="pricetag-outline" size={14} color={colors.ink} />
              <Text style={styles.statText}>₦{formatPrice(detail.min_price)}+</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 48 }]}>

        {detail.amenities_list && detail.amenities_list.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenities}>
              {detail.amenities_list.map((a) => (
                <View key={a} style={styles.amenityChip}>
                  <Ionicons name="checkmark" size={12} color={colors.primary} />
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Departures</Text>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search bus, route or vendor"
              placeholderTextColor={colors.mutedLight}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.priceFilters}
          >
            {PRICE_FILTERS.map((f) => {
              const active = priceFilter === f.key;
              return (
                <Pressable key={f.key} onPress={() => setPriceFilter(f.key)} hitSlop={6}>
                  <Text style={[styles.priceChip, active && styles.priceChipActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredGroups.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No matching departures</Text>
              <Text style={styles.emptySub}>Try adjusting your search or price filter.</Text>
            </View>
          ) : (
            filteredGroups.map((group) => (
              <View key={group.vendor_id} style={styles.group}>
                <View style={styles.groupHead}>
                  <Text style={styles.groupName}>{group.vendor_name}</Text>
                  <Text style={styles.groupCount}>
                    {group.buses.length} {group.buses.length === 1 ? 'departure' : 'departures'}
                  </Text>
                </View>
                {group.buses.map((bus) => (
                  <BusRow key={bus.trip_id} bus={bus} last={false} onPress={() => openBus(bus, group)} />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function BusRow({ bus, last, onPress }: { bus: TerminalBus; last: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const soldOut = bus.available_seats <= 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.busRow, !last && styles.busRowDivider, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.timeBadge, soldOut && styles.timeBadgeMuted]}>
        <Text style={[styles.busDepTime, soldOut && styles.busDepTimeMuted]}>{bus.departure_time || '—'}</Text>
        <Text style={styles.busDepDate}>{formatDate(bus.departure_date)}</Text>
      </View>

      <View style={styles.busRoute}>
        <View style={styles.busRouteCities}>
          <Text style={styles.busCity} numberOfLines={1}>{bus.origin_city || '—'}</Text>
          <View style={styles.busLineWrap}>
            {!soldOut && <View style={styles.busLine} />}
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </View>
          <Text style={[styles.busCity, styles.busDest]} numberOfLines={1}>{bus.destination_city || '—'}</Text>
        </View>
        <View style={styles.busMeta}>
          <Text style={styles.busMetaText} numberOfLines={1}>
            {[bus.bus_name, bus.bus_type].filter(Boolean).join(' · ')}
          </Text>
          {bus.arrival_time ? (
            <View style={styles.busDur}>
              <Ionicons name="time-outline" size={11} color={colors.mutedLight} />
              <Text style={styles.busDurText}>{durationMinutes(bus.departure_time, bus.arrival_time)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.busAside}>
        <Text style={styles.busPrice}>₦{formatPrice(bus.price)}</Text>
        <Text style={[styles.busSeats, soldOut && styles.busSeatsMuted]}>
          {soldOut ? 'Sold out' : `${bus.available_seats} seats`}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={14} color={colors.mutedLight} />
    </Pressable>
  );
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  return h > 0 ? `${h}h` : `${m}m`;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: 20,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  heroDark: {
    backgroundColor: '#0A3C36',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 28, 26, 0.45)',
  },
  heroOverlayDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -12,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: font.semibold,
    color: colors.white,
    textAlign: 'center',
    marginRight: 48,
    opacity: 0.95,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: font.bold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: 'rgba(255,255,255,0.9)',
  },
  address: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
    lineHeight: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statText: {
    fontSize: 14,
    fontWeight: font.semibold,
    color: colors.ink,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: font.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.mutedLight,
    marginBottom: 12,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  amenityText: {
    fontSize: 14,
    fontWeight: font.medium,
    color: colors.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  filterScroll: {
    flexGrow: 0,
    marginTop: 14,
    marginBottom: 6,
  },
  priceFilters: {
    paddingRight: 16,
    gap: 18,
  },
  priceChip: {
    fontSize: 14,
    color: colors.muted,
    paddingVertical: 4,
  },
  priceChipActive: {
    color: colors.primary,
    fontWeight: font.bold,
  },
  emptyBox: {
    paddingVertical: 44,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.text,
  },
  emptySub: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  group: {
    marginBottom: 28,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.text,
  },
  groupCount: {
    fontSize: 13,
    color: colors.muted,
  },
  busRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  busRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timeBadge: {
    width: 62,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingVertical: 6,
  },
  timeBadgeMuted: {
    backgroundColor: colors.surfaceAlt,
  },
  busDepTime: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.primary,
  },
  busDepTimeMuted: {
    color: colors.mutedLight,
  },
  busDepDate: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  busRoute: {
    flex: 1,
  },
  busRouteCities: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  busCity: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
    maxWidth: 96,
  },
  busDest: {
    color: colors.text,
  },
  busLineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  busLine: {
    width: 18,
    height: 1,
    backgroundColor: colors.border,
  },
  busMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  busMetaText: {
    fontSize: 13,
    color: colors.muted,
    flexShrink: 1,
  },
  busDur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  busDurText: {
    fontSize: 12,
    color: colors.mutedLight,
  },
  busAside: {
    alignItems: 'flex-end',
    gap: 2,
  },
  busPrice: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  busSeats: {
    fontSize: 12,
    color: colors.success,
  },
  busSeatsMuted: {
    color: colors.mutedLight,
  },
  skeletonList: {
    marginTop: 28,
  },
  skeletonPills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: 32,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.surface,
    fontWeight: font.bold,
    fontSize: 16,
  },
});
