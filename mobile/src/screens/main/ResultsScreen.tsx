import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import { resolveApiUrl } from '../../api/client';
import type { City, Terminal, Trip } from '../../api/types';
import { BusVector } from '../../components/BusVector';
import { LeafletMapWebView, type LeafletMarker, type MapRegion } from '../../components/LeafletMapWebView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TripCard } from '../../components/TripCard';
import { useAuth } from '../../context/AuthContext';
import { useDeviceLocation } from '../../hooks/useDeviceLocation';
import type { MainStackParamList } from '../../navigation/types';
import { Skeleton } from '../../components/Skeleton';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { formatDate, formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<MainStackParamList, 'Results'>;

const DEFAULT_REGION: MapRegion = {
  latitude: 9.082,
  longitude: 8.6753,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// Bottom sheet: the sheet is anchored to the bottom of the map area and its
// height animates between collapsed (just the drag header, plus the selected
// trip card when one is chosen) and expanded (covers everything except a peek
// of the map on top). The Continue bar is a separate fixed overlay at the
// bottom, so it never scrolls or gets clipped.
const HEADER_H = 96;
const BAR_H = 96;
const CARD_H = 84; // compact selected-trip card pinned in the collapsed sheet
const EXPANDED_PEEK = 0.22; // fraction of the map area left visible on top when expanded

type RouteInfo = {
  coords: { latitude: number; longitude: number }[];
  durationSec: number;
  distanceM: number;
};

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(0)} km` : `${Math.round(m)} m`;
}

function coord(c?: City): { latitude: number; longitude: number } | null {
  if (!c || c.lat == null || c.lng == null) return null;
  const latitude = Number(c.lat);
  const longitude = Number(c.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function terminalCoord(t: Terminal): { latitude: number; longitude: number } | null {
  if (t.lat == null || t.lng == null) return null;
  const latitude = Number(t.lat);
  const longitude = Number(t.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function SelectedTripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={styles.pinnedCard}>
      <View style={styles.pinnedBus}>
        <BusVector size={30} color={colors.muted} />
      </View>
      <View style={styles.pinnedBody}>
        <Text style={styles.pinnedRoute} numberOfLines={1}>
          {trip.origin_city} → {trip.destination_city}
        </Text>
        <Text style={styles.pinnedMeta} numberOfLines={1}>
          {formatDate(trip.departure_date)} · {trip.departure_time} · {trip.vendor_name}
        </Text>
      </View>
      <View style={styles.pinnedPrice}>
        <Text style={styles.pinnedPriceText}>₦{formatPrice(trip.price)}</Text>
        <Text style={styles.pinnedSeats}>{trip.available_seats} seats</Text>
      </View>
    </Pressable>
  );
}

function TerminalHeader({ title, subtitle, count }: { title: string; subtitle: string; count: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.terminalHeader}>
      <View style={styles.terminalHeaderIcon}>
                    <Ionicons name="business" size={16} color={colors.primary} />
      </View>
      <View style={styles.terminalHeaderBody}>
        <Text style={styles.terminalHeaderTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.terminalHeaderSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.terminalHeaderCount}>
        <Text style={styles.terminalHeaderCountText}>
          {count} {count === 1 ? 'trip' : 'trips'}
        </Text>
      </View>
    </View>
  );
}

export function ResultsScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { originId, destinationId, originName, destinationName } = route.params;
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cityMap, setCityMap] = useState<Record<number, City>>({});
  const [originTerminals, setOriginTerminals] = useState<Terminal[]>([]);
  const [mapRoute, setMapRoute] = useState<RouteInfo | null>(null);
  const [selected, setSelected] = useState<Trip | null>(null);
  const [focusPoint, setFocusPoint] = useState<MapRegion | null>(null);
  const { coords: userLocation, locate } = useDeviceLocation();
  const { user } = useAuth();
  const userAvatar = resolveApiUrl(user?.avatar);

  // --- Draggable bottom sheet over the map ---
  const areaRef = useRef(0);
  const heightRef = useRef(0);
  const startHeightRef = useRef(0);
  const selectedRef = useRef(selected);
  const [collapsed, setCollapsed] = useState(false);
  const sheetHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  function barH() {
    return selectedRef.current ? BAR_H : 0;
  }
  function cardH() {
    return selectedRef.current ? CARD_H : 0;
  }
  function expandedHeight() {
    return Math.max(areaRef.current * (1 - EXPANDED_PEEK), HEADER_H);
  }
  function collapsedHeight() {
    return HEADER_H + cardH() + barH();
  }
  function clampHeight(h: number) {
    return Math.min(Math.max(h, collapsedHeight()), expandedHeight());
  }

  function snapSheet(target: number, animated = true) {
    const next = clampHeight(target);
    heightRef.current = next;
    setCollapsed(next <= (expandedHeight() + collapsedHeight()) / 2);
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
          snapSheet(collapsed ? expandedHeight() : collapsedHeight());
          return;
        }
        const current = startHeightRef.current - g.dy;
        const mid = (expandedHeight() + collapsedHeight()) / 2;
        let target: number;
        if (g.vy < -0.35) {
          target = expandedHeight();
        } else if (g.vy > 0.35) {
          target = collapsedHeight();
        } else {
          target = current < mid ? collapsedHeight() : expandedHeight();
        }
        snapSheet(target);
      },
    }),
  ).current;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      setSelected(null);
      try {
        const data = await api.searchTrips(originId, destinationId);
        if (active) setTrips(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load trips.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [originId, destinationId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cities = await api.fetchCities();
        if (!active) return;
        const map: Record<number, City> = {};
        cities.forEach((c) => (map[c.id] = c));
        setCityMap(map);
      } catch {
        // map is a progressive enhancement; ignore failures
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
        const data = await api.fetchTerminals(originId);
        if (active) setOriginTerminals(data);
      } catch {
        // terminal markers are a progressive enhancement; ignore failures
      }
    })();
    return () => {
      active = false;
    };
  }, [originId]);

  const origin = cityMap[originId];
  const destination = cityMap[destinationId];
  const originCoord = coord(origin);
  const destCoord = coord(destination);
  const hasMap = !!(originCoord && destCoord);

  const selectedTerminal = useMemo(() => {
    if (!selected) return null;
    const id = selected.bus_terminal_id ?? selected.vendor_terminal_id ?? 0;
    return originTerminals.find((t) => t.id === id) ?? null;
  }, [selected, originTerminals]);
  const routeOrigin = (selectedTerminal && terminalCoord(selectedTerminal)) || originCoord;

  useEffect(() => {
    let active = true;
    if (!routeOrigin || !destCoord) return;
    setMapRoute(null);
    (async () => {
      try {
        const url =
          `${OSRM_BASE}/${routeOrigin.longitude},${routeOrigin.latitude};` +
          `${destCoord.longitude},${destCoord.latitude}?overview=full&geometries=geojson&steps=false`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('route request failed');
        const json = await res.json();
        if (!active) return;
        const r = json.routes?.[0];
        if (!r?.geometry?.coordinates) throw new Error('no route found');
        const coords = r.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }),
        );
        setMapRoute({ coords, durationSec: r.duration, distanceM: r.distance });
      } catch {
        // fall back to straight-line polyline
      }
    })();
    return () => {
      active = false;
    };
  }, [routeOrigin?.latitude, routeOrigin?.longitude, destCoord?.latitude, destCoord?.longitude]);

  const region = useMemo<MapRegion>(() => {
    if (!originCoord || !destCoord) return DEFAULT_REGION;
    const latDelta = (Math.abs(originCoord.latitude - destCoord.latitude) + 0.4) * 1.5;
    const lngDelta = (Math.abs(originCoord.longitude - destCoord.longitude) + 0.4) * 1.5;
    return {
      latitude: (originCoord.latitude + destCoord.latitude) / 2,
      longitude: (originCoord.longitude + destCoord.longitude) / 2,
      latitudeDelta: Math.max(latDelta, 0.8),
      longitudeDelta: Math.max(lngDelta, 0.8),
    };
  }, [originCoord, destCoord]);

  const routeCoords = useMemo(
    () => (mapRoute ? mapRoute.coords : routeOrigin && destCoord ? [routeOrigin, destCoord] : null),
    [mapRoute, routeOrigin, destCoord],
  );

  const routeProp = useMemo(() => (routeCoords ? { coords: routeCoords } : null), [routeCoords]);

  const mapMarkers: LeafletMarker[] = useMemo(
    () => [
      ...originTerminals
        .map((t): LeafletMarker | null => {
          const c = terminalCoord(t);
          if (!c) return null;
          return {
            id: String(t.id),
            latitude: c.latitude,
            longitude: c.longitude,
            label: t.name,
            kind: 'terminal',
            selected: selectedTerminal?.id === t.id,
            count: trips.filter((tr) => (tr.bus_terminal_id ?? tr.vendor_terminal_id ?? 0) === t.id).length,
          };
        })
        .filter((m): m is LeafletMarker => m !== null),
      ...(origin && originCoord
        ? [{ id: 'from', latitude: originCoord.latitude, longitude: originCoord.longitude, label: origin.name, kind: 'from' as const }]
        : []),
      ...(destination && destCoord
        ? [{ id: 'to', latitude: destCoord.latitude, longitude: destCoord.longitude, label: destination.name, kind: 'to' as const }]
        : []),
    ],
    [originTerminals, trips, origin, originCoord, destination, destCoord, selectedTerminal],
  );

  const fitPadding = useMemo(
    () => ({ top: insets.top + 64, right: 48, bottom: collapsed ? 110 : 260, left: 48 }),
    [insets.top, collapsed],
  );

  function selectTrip(trip: Trip) {
    setSelected((prev) => (prev?.id === trip.id ? null : trip));
  }

  function handleLocate() {
    void locate().then((c) =>
      c && setFocusPoint({ latitude: c.latitude, longitude: c.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 }),
    );
  }

  function continueBooking() {
    if (!selected) return;
    navigation.navigate('SeatSelection', { trip: selected });
  }

  const sections = useMemo(() => {
    const map = new Map<number, { title: string; subtitle: string; count: number; data: Trip[] }>();
    trips.forEach((trip) => {
      const id = trip.bus_terminal_id ?? trip.vendor_terminal_id ?? 0;
      let section = map.get(id);
      if (!section) {
        section = {
          title: trip.bus_terminal_name ?? (id === 0 ? trip.vendor_name : 'Terminal'),
          subtitle: trip.bus_terminal_city ?? '',
          count: 0,
          data: [],
        };
        map.set(id, section);
      }
      section.count += 1;
      section.data.push(trip);
    });
    return [...map.values()]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((s) => ({
        ...s,
        data: [...s.data].sort(
          (x, y) => x.departure_date.localeCompare(y.departure_date) || x.departure_time.localeCompare(y.departure_time),
        ),
      }));
  }, [trips]);

  const listBody = loading ? (
    <View style={styles.list}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonRouteRow}>
            <View style={styles.skeletonRoute}>
              <Skeleton width={90} height={20} />
              <Skeleton width={20} height={14} />
              <Skeleton width={90} height={20} />
            </View>
            <Skeleton width={70} height={20} />
          </View>
          <Skeleton width={160} height={14} style={{ marginTop: 8 }} />
          <View style={styles.skeletonDivider} />
          <View style={styles.skeletonFooter}>
            <Skeleton width={56} height={56} radius={16} />
            <Skeleton width={110} height={16} />
            <Skeleton width={64} height={26} radius={13} />
          </View>
        </View>
      ))}
    </View>
  ) : error ? (
    <View style={styles.center}>
      <Text style={styles.error}>{error}</Text>
    </View>
  ) : trips.length === 0 ? (
    <View style={styles.center}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="bus-outline" size={40} color={colors.teal} />
      </View>
      <Text style={styles.emptyTitle}>No trips found</Text>
      <Text style={styles.emptySub}>
        No scheduled trips for {originName} → {destinationName} right now. Check back later.
      </Text>
    </View>
  ) : (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.list, selected && styles.listWithBar, !hasMap && { paddingTop: insets.top + 62 }]}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <TerminalHeader title={section.title} subtitle={section.subtitle} count={section.count} />
      )}
      renderItem={({ item }) => (
        <TripCard trip={item} selected={selected?.id === item.id} onPress={selectTrip} />
      )}
    />
  );

  const continueBar = selected ? (
    <View style={styles.continueBar}>
      <View style={styles.barInfo}>
        <Text style={styles.barRoute} numberOfLines={1}>
          {selected.origin_city} → {selected.destination_city}
        </Text>
        <Text style={styles.barMeta}>
          {formatDate(selected.departure_date)} · {selected.departure_time} · ₦
          {formatPrice(selected.price)} · {selected.available_seats} seats
        </Text>
      </View>
      <View style={styles.barBtn}>
        <PrimaryButton label="Continue" icon="arrow-forward" variant="teal" onPress={continueBooking} />
      </View>
    </View>
  ) : null;

  return (
    <View style={styles.safe}>
      {hasMap ? (
        <View
          style={styles.area}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.round(h) !== Math.round(areaRef.current)) {
              areaRef.current = h;
              snapSheet(expandedHeight(), false);
            }
          }}
        >
          <LeafletMapWebView
            style={StyleSheet.absoluteFillObject}
            markers={mapMarkers}
            route={routeProp}
            initialRegion={region}
            fitPadding={fitPadding}
            animateTo={focusPoint}
            userLocation={userLocation}
            userAvatar={userAvatar}
            onLocateRequest={handleLocate}
          />
          {mapRoute ? (
            <View style={[styles.timeBadge, { top: insets.top + 60 }]}>
              <Ionicons name="car" size={13} color={colors.primary} />
              <Text style={styles.timeBadgeText}>
                {formatDuration(mapRoute.durationSec)} · {formatDistance(mapRoute.distanceM)}
              </Text>
            </View>
          ) : null}

          <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.sheetHeader} {...panResponder.panHandlers}>
              <View style={styles.grabber} />
              {collapsed ? (
                <View style={styles.sheetHeaderRow}>
                  <View style={styles.sheetHeaderIcon}>
                    <Ionicons name="business" size={16} color={colors.muted} />
                  </View>
                  <View style={styles.sheetHeaderBody}>
                    <Text style={styles.sheetHeaderTitle} numberOfLines={1}>
                      {selected ? 'Your selected trip' : 'Browse trips'}
                    </Text>
                    <Text style={styles.sheetHeaderSub} numberOfLines={1}>
                      {trips.length} trip{trips.length === 1 ? '' : 's'} · {originName} → {destinationName}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
            {collapsed && selected ? (
              <View style={styles.pinnedWrap}>
                <SelectedTripCard
                  trip={selected}
                  onPress={() => snapSheet(expandedHeight())}
                />
              </View>
            ) : null}
            {collapsed ? null : <View style={styles.sheetBody}>{listBody}</View>}
          </Animated.View>
          {continueBar}
        </View>
      ) : (
        <>
          {listBody}
          {continueBar}
        </>
      )}

      <View style={[styles.floatHeader, { top: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.routePill}>
          <Ionicons name="bus" size={13} color={colors.primary} />
          <Text style={styles.routePillText} numberOfLines={1}>
            {originName} → {destinationName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  floatHeader: {
    position: 'absolute',
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  routePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  routePillText: {
    flex: 1,
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  area: {
    flex: 1,
    overflow: 'hidden',
  },
  timeBadge: {
    position: 'absolute',
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
    zIndex: 5,
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: font.bold,
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: colors.danger,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: font.bold,
    color: colors.text,
  },
  emptySub: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  skeletonRouteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listWithBar: {
    paddingBottom: 130,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  terminalHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalHeaderBody: {
    flex: 1,
  },
  terminalHeaderTitle: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.text,
  },
  terminalHeaderSub: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 1,
  },
  terminalHeaderCount: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  terminalHeaderCountText: {
    fontSize: 13,
    fontWeight: font.semibold,
    color: colors.primary,
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
    ...shadow.md,
  },
  sheetHeader: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 18,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderBody: {
    flex: 1,
  },
  sheetHeaderTitle: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  sheetHeaderSub: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 1,
  },
  sheetBody: {
    flex: 1,
  },
  pinnedWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pinnedBus: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedBody: {
    flex: 1,
  },
  pinnedRoute: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  pinnedMeta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  pinnedPrice: {
    alignItems: 'flex-end',
  },
  pinnedPriceText: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.text,
  },
  pinnedSeats: {
    fontSize: 13,
    fontWeight: font.semibold,
    color: colors.muted,
    marginTop: 1,
  },
  continueBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: '#2B1F19',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 12,
  },
  barInfo: {
    flex: 1,
  },
  barRoute: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.text,
  },
  barMeta: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 3,
  },
  barBtn: {
    minWidth: 150,
  },
});
