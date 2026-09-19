import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import { resolveApiUrl } from '../../api/client';
import type { City, Suggestion, Terminal } from '../../api/types';
import { LeafletMapWebView, type LeafletMarker, type MapPoint, type MapRegion } from '../../components/LeafletMapWebView';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useDeviceLocation } from '../../hooks/useDeviceLocation';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { formatPrice } from '../../utils/format';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Results'>;

const RECENT_ROUTES_KEY = 'recentRoutes';

interface RecentRoute {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
}

interface PopularRoute {
  origin: City;
  dest: City;
  price?: number | null;
}

const DEFAULT_REGION: MapRegion = {
  latitude: 9.082,
  longitude: 8.6753,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

function terminalCoord(t: Terminal): { latitude: number; longitude: number } | null {
  if (t.lat == null || t.lng == null) return null;
  const latitude = Number(t.lat);
  const longitude = Number(t.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function useAutoSuggest() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function onQuery(text: string) {
    setQuery(text);
    const seq = ++seqRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.fetchSuggestions(text.trim());
        if (seq === seqRef.current) setSuggestions(data);
      } catch {
        if (seq === seqRef.current) setSuggestions([]);
      }
    }, 250);
  }

  function clearSuggestions() {
    seqRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuggestions([]);
  }

  return { query, suggestions, onQuery, setQuery, clearSuggestions };
}

export function SearchScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const stackNav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [from, setFrom] = useState<City | null>(null);
  const [to, setTo] = useState<City | null>(null);
  const [allTerminals, setAllTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const terminalAnim = useRef(new Animated.Value(0)).current;
  const terminalPress = useRef(new Animated.Value(1)).current;
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const [focusPoint, setFocusPoint] = useState<MapRegion | null>(null);
  const { coords: userLocation, locate } = useDeviceLocation();
  const { user } = useAuth();
  const userAvatar = resolveApiUrl(user?.avatar);
  const scrollRef = useRef<ScrollView>(null);
  const fromInputRef = useRef<TextInput>(null);
  const fromField = useAutoSuggest();
  const toField = useAutoSuggest();
  const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<PopularRoute[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setPopularLoading(true);
    (async () => {
      try {
        if (from) {
          const hints = await api.fetchPriceHints(from.id);
          if (!active) return;
          const originCity: City = { id: Number(from.id), name: from.name };
          const routes: PopularRoute[] = hints
            .slice(0, 4)
            .filter((h) => Number(h.destination_city_id) !== Number(from.id))
            .map((h) => ({
              origin: originCity,
              dest: { id: Number(h.destination_city_id), name: h.destination_city ?? 'Destination' },
              price: h.min_price,
            }));
          setPopularRoutes(routes);
        } else {
          const trips = await api.fetchUpcomingTrips();
          if (!active) return;
          const seen = new Set<string>();
          const routes: PopularRoute[] = [];
          for (const t of trips) {
            const oid = Number(t.origin_city_id);
            const did = Number(t.destination_city_id);
            const key = `${oid}-${did}`;
            if (oid === did || seen.has(key)) continue;
            seen.add(key);
            routes.push({
              origin: { id: oid, name: t.origin_city },
              dest: { id: did, name: t.destination_city },
            });
            if (routes.length >= 4) break;
          }
          setPopularRoutes(routes);
        }
      } catch {
        if (active) setPopularRoutes([]);
      } finally {
        if (active) setPopularLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [from]);

  const sheetH = windowHeight;
  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [-sheetH, 0] });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.fetchTerminals();
        if (active) setAllTerminals(data);
      } catch {
        // the map markers are a progressive enhancement; ignore failures
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(RECENT_ROUTES_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = (JSON.parse(raw) as RecentRoute[]).map((r) => ({
          fromId: Number(r.fromId),
          fromName: r.fromName,
          toId: Number(r.toId),
          toName: r.toName,
        }));
        const seen = new Set<string>();
        const deduped = parsed.filter((r) => {
          const key = `${r.fromId}-${r.toId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setRecentRoutes(deduped);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function saveRecentRoute(origin: City, dest: City) {
    setRecentRoutes((prev) => {
      const fromId = Number(origin.id);
      const toId = Number(dest.id);
      const next: RecentRoute[] = [
        { fromId, fromName: origin.name, toId, toName: dest.name },
        ...prev.filter((r) => !(Number(r.fromId) === fromId && Number(r.toId) === toId)),
      ].slice(0, 6);
      AsyncStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  function removeRecentRoute(route: RecentRoute) {
    setRecentRoutes((prev) => {
      const next = prev.filter(
        (r) => !(Number(r.fromId) === Number(route.fromId) && Number(r.toId) === Number(route.toId))
      );
      AsyncStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  useEffect(() => {
    if (selectedTerminal) {
      terminalAnim.setValue(0);
      Animated.spring(terminalAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 9,
        speed: 16,
      }).start();
    }
  }, [selectedTerminal, terminalAnim]);

  const mapMarkers = useMemo(
    () =>
      allTerminals
        .map((t): LeafletMarker | null => {
          const c = terminalCoord(t);
          if (!c) return null;
          return {
            id: String(t.id),
            latitude: c.latitude,
            longitude: c.longitude,
            label: t.name,
            kind: 'terminal',
            count: t.available_buses ?? 0,
            selected: selectedTerminal ? String(selectedTerminal.id) === String(t.id) : false,
          };
        })
        .filter((m): m is LeafletMarker => m !== null),
    [allTerminals, selectedTerminal],
  );

  function openSheet() {
    setSheetOpen(true);
    sheetAnim.setValue(0);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
    setTimeout(() => fromInputRef.current?.focus(), 260);
  }

  function closeSheet() {
    Keyboard.dismiss();
    Animated.timing(sheetAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setSheetOpen(false);
    });
  }

  function handleFocus(field: 'from' | 'to') {
    if (field === 'from') fromField.onQuery(fromField.query);
    else toField.onQuery(toField.query);
    scrollRef.current?.scrollTo({ y: field === 'from' ? 0 : 160, animated: true });
  }

  function focusSelection(s: Suggestion) {
    setFocusPoint({ latitude: s.lat, longitude: s.lng, latitudeDelta: 0.8, longitudeDelta: 0.8 });
  }

  function handleLocate() {
    void locate().then((c) =>
      c && setFocusPoint({ latitude: c.latitude, longitude: c.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 }),
    );
  }

  useFocusEffect(
    useCallback(() => {
      const focusOnMe = (c: MapPoint | null) => {
        if (!c) return;
        setFocusPoint({
          latitude: c.latitude,
          longitude: c.longitude,
          latitudeDelta: 0.35,
          longitudeDelta: 0.35,
        });
      };
      if (userLocation) focusOnMe(userLocation);
      else void locate().then(focusOnMe);
    }, [userLocation, locate]),
  );

  function pickFrom(s: Suggestion) {
    setFrom({ id: s.type === 'city' ? s.id : (s.city_id ?? s.id), name: s.label, lat: s.lat, lng: s.lng });
    fromField.setQuery(s.label);
    fromField.clearSuggestions();
    Keyboard.dismiss();
    focusSelection(s);
  }

  function pickTo(s: Suggestion) {
    const id = s.type === 'city' ? s.id : (s.city_id ?? s.id);
    const next: City = { id, name: s.label, lat: s.lat, lng: s.lng };
    setTo(next);
    toField.setQuery(s.label);
    toField.clearSuggestions();
    Keyboard.dismiss();
    focusSelection(s);
    if (from && from.id !== id) {
      goSearch(from, next);
    }
  }

  function clearFrom() {
    setFrom(null);
    fromField.setQuery('');
    fromField.clearSuggestions();
  }

  function clearTo() {
    setTo(null);
    toField.setQuery('');
    toField.clearSuggestions();
  }

  function goSearch(origin: City, dest: City) {
    saveRecentRoute(origin, dest);
    closeSheet();
    stackNav.navigate('Results', {
      originId: origin.id,
      destinationId: dest.id,
      originName: origin.name,
      destinationName: dest.name,
    });
  }

  function openTerminal(terminal: Terminal) {
    stackNav.navigate('TerminalDetail', { id: terminal.id, name: terminal.name });
  }

  function pressTerminalIn() {
    Animated.spring(terminalPress, { toValue: 0.97, useNativeDriver: true, bounciness: 6, speed: 24 }).start();
  }

  function pressTerminalOut() {
    Animated.spring(terminalPress, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 24 }).start();
  }

  const routeSummary = from && to && from.name !== to.name ? `${from.name} → ${to.name}` : null;

  return (
    <View style={styles.safe}>
      <View style={styles.area}>
        <LeafletMapWebView
          style={StyleSheet.absoluteFillObject}
          markers={mapMarkers}
          initialRegion={DEFAULT_REGION}
          animateTo={focusPoint}
          userLocation={userLocation}
          userAvatar={userAvatar}
          autoFit={false}
          onLocateRequest={handleLocate}
          onMapPress={() => setSelectedTerminal(null)}
          onMarkerPress={(id) => {
            const t = allTerminals.find((x) => String(x.id) === id);
            if (t) {
              setSelectedTerminal(t);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        />

        <Pressable style={[styles.floatingPill, { top: insets.top + 8 }]} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openSheet(); }}>
          <View style={styles.searchBarIcon}>
            <Ionicons name="search" size={18} color={colors.primary} />
          </View>
          <View style={styles.searchBarBody}>
            <Text style={styles.searchBarText} numberOfLines={1}>
              {routeSummary ?? 'Where to?'}
            </Text>
            <Text style={styles.searchBarSub} numberOfLines={1}>
              {routeSummary ? 'Tap to change your trip' : 'Find a bus trip'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>

        {selectedTerminal ? (
          <Animated.View
            style={[
              styles.terminalCard,
              {
                top: insets.top + 72,
                opacity: terminalAnim,
                transform: [
                  {
                    translateY: terminalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-24, 0],
                    }),
                  },
                  {
                    scale: Animated.multiply(
                      terminalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.94, 1],
                      }),
                      terminalPress
                    ),
                  },
                ],
              },
            ]}
          >
            <Pressable
              onPressIn={pressTerminalIn}
              onPressOut={pressTerminalOut}
              onPress={() => {
                const t = selectedTerminal;
                setSelectedTerminal(null);
                openTerminal(t);
              }}
              style={({ pressed }) => [styles.terminalCardContent, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.terminalCardHead}>
                <View style={styles.terminalCardIcon}>
                  <Ionicons name="business" size={18} color={colors.primary} />
                </View>
                <View style={styles.terminalCardBody}>
                  <Text style={styles.terminalCardName} numberOfLines={1}>
                    {selectedTerminal.name}
                  </Text>
                  {selectedTerminal.city_name ? (
                    <Text style={styles.terminalCardSub} numberOfLines={1}>
                      {selectedTerminal.city_name}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.terminalCardAction}>
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedTerminal(null);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    hitSlop={10}
                  >
                    <Ionicons name="close" size={20} color={colors.muted} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.terminalCardStats}>
                {selectedTerminal.available_buses != null ? (
                  <View style={styles.terminalStat}>
                    <Ionicons name="bus" size={15} color={colors.primary} />
                    <Text style={styles.terminalStatText}>{selectedTerminal.available_buses} buses</Text>
                  </View>
                ) : null}
                {selectedTerminal.min_price != null ? (
                  <View style={styles.terminalStat}>
                    <Ionicons name="pricetag" size={15} color={colors.primary} />
                    <Text style={styles.terminalStatText}>from ₦{formatPrice(selectedTerminal.min_price)}</Text>
                  </View>
                ) : null}
                {selectedTerminal.next_departure ? (
                  <View style={styles.terminalStat}>
                    <Ionicons name="time" size={15} color={colors.primary} />
                    <Text style={styles.terminalStatText}>{selectedTerminal.next_departure}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        ) : null}

        <BlurView
          intensity={60}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.quickCard,
            { bottom: 82, backgroundColor: isDark ? 'rgba(22, 25, 24, 0.85)' : 'rgba(255, 255, 255, 0.9)' },
          ]}
        >
          <View style={styles.quickHeader}>
            <Text style={styles.quickTitle}>
              {from ? `Popular from ${from.name}` : 'Popular routes'}
            </Text>
            <Ionicons name="trending-up" size={16} color={colors.muted} />
          </View>
          {popularLoading ? (
            <View style={styles.popularGrid}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width={150} height={44} radius={14} />
              ))}
            </View>
          ) : popularRoutes.length === 0 ? (
            <Text style={styles.popularEmpty}>No popular routes right now.</Text>
          ) : (
            <View style={styles.popularGrid}>
              {popularRoutes.map((r) => (
                <Pressable
                  key={`${r.origin.id}-${r.dest.id}`}
                  style={({ pressed }) => [styles.popularChip, pressed && { opacity: 0.7 }]}
                  onPress={() => goSearch(r.origin, r.dest)}
                >
                  <Text style={styles.popularChipRoute} numberOfLines={1}>
                    {r.origin.name} → {r.dest.name}
                  </Text>
                  {r.price != null ? (
                    <Text style={styles.popularChipPrice}>from ₦{formatPrice(r.price)}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </BlurView>
      </View>

      {/* Top sheet: Google-Maps-style search panel that drops from the top */}
      <Modal visible={sheetOpen} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
        <View style={styles.topSheetRoot}>
          <Pressable style={styles.topSheetBackdrop} onPress={closeSheet} />
          <Animated.View
            style={[
              styles.topSheet,
              { height: sheetH, transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={[styles.sheetHeader, { paddingTop: insets.top + 8 }]}>
              <View style={styles.sheetHeaderRow}>
                <View style={styles.sheetHeaderSide} />
                <Text style={styles.headerTitle}>Route</Text>
                <Pressable style={styles.sheetHeaderSide} onPress={closeSheet} hitSlop={10}>
                  <Ionicons name="close" size={26} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.topSearchCard}>
              <View style={styles.topSearchRow}>
                <View style={styles.fieldBody}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="location" size={14} color={colors.primary} />
                    <Text style={styles.fieldHint}>From</Text>
                  </View>
                  <TextInput
                    ref={fromInputRef}
                    value={fromField.query}
                    onChangeText={fromField.onQuery}
                    onFocus={() => handleFocus('from')}
                    placeholder="Where from?"
                    placeholderTextColor={colors.mutedLight}
                    style={styles.input}
                    autoCorrect={false}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </View>
                {from ? (
                  <Pressable onPress={clearFrom} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.mutedLight} />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.topDivider}>
                <View style={styles.topDividerLine} />
              </View>

              <View style={styles.topSearchRow}>
                <View style={styles.fieldBody}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="flag" size={14} color={isDark ? colors.white : colors.ink} />
                    <Text style={styles.fieldHint}>To</Text>
                  </View>
                  <TextInput
                    value={toField.query}
                    onChangeText={toField.onQuery}
                    onFocus={() => handleFocus('to')}
                    placeholder="Where to?"
                    placeholderTextColor={colors.mutedLight}
                    style={styles.input}
                    autoCorrect={false}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </View>
                {to ? (
                  <Pressable onPress={clearTo} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.mutedLight} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.topSheetScroll, { paddingBottom: insets.bottom + 24 }]}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {fromField.suggestions.length === 0 && toField.suggestions.length === 0 && recentRoutes.length > 0 ? (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Recent searches</Text>
                  {recentRoutes.map((r) => (
                    <Pressable
                      key={`${r.fromId}-${r.toId}`}
                      style={styles.recentRow}
                      onPress={() =>
                        goSearch(
                          { id: r.fromId, name: r.fromName },
                          { id: r.toId, name: r.toName },
                        )
                      }
                    >
                      <View style={styles.recentIcon}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                      </View>
                      <View style={styles.recentBody}>
                        <Text style={styles.recentLabel} numberOfLines={1}>
                          {r.fromName} → {r.toName}
                        </Text>
                      </View>
                      <Pressable onPress={() => removeRecentRoute(r)} hitSlop={10}>
                        <Ionicons name="close" size={18} color={colors.mutedLight} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {fromField.suggestions.length > 0 ? (
                <View style={styles.suggestList}>
                  {fromField.suggestions.map((s) => (
                    <Pressable key={`${s.type}-${s.id}`} style={styles.suggestRow} onPress={() => pickFrom(s)}>
                      <View style={styles.suggestIcon}>
                        <Ionicons
                          name={s.type === 'city' ? 'location' : 'business'}
                          size={15}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.suggestBody}>
                        <Text style={styles.suggestLabel} numberOfLines={1}>
                          {s.label}
                        </Text>
                        {s.sub ? (
                          <Text style={styles.suggestSub} numberOfLines={1}>
                            {s.sub}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="arrow-up-circle-outline" size={16} color={colors.primary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {toField.suggestions.length > 0 ? (
                <View style={styles.suggestList}>
                  {toField.suggestions.map((s) => (
                    <Pressable key={`${s.type}-${s.id}`} style={styles.suggestRow} onPress={() => pickTo(s)}>
                      <View style={styles.suggestIcon}>
                        <Ionicons
                          name={s.type === 'city' ? 'location' : 'business'}
                          size={15}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.suggestBody}>
                        <Text style={styles.suggestLabel} numberOfLines={1}>
                          {s.label}
                        </Text>
                        {s.sub ? (
                          <Text style={styles.suggestSub} numberOfLines={1}>
                            {s.sub}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="arrow-up-circle-outline" size={16} color={colors.primary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {from && to && from.id === to.id ? (
                <Text style={styles.hint}>Departure and destination must be different.</Text>
              ) : null}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  sheetHeader: {
    backgroundColor: colors.surface,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetHeaderSide: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 26,
    fontWeight: font.bold,
    color: colors.text,
    textAlign: 'center',
  },
  area: {
    flex: 1,
    overflow: 'hidden',
  },
  floatingPill: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadow.md,
  },
  searchBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarBody: {
    flex: 1,
  },
  searchBarText: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  searchBarSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
  topSheetRoot: {
    flex: 1,
  },
  topSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  topSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
  },
  topSearchCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  topSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  topDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  topDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  topSheetScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  fieldBody: {
    flex: 1,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldHint: {
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 18,
    fontWeight: font.semibold,
    color: colors.text,
    padding: 0,
    paddingTop: 2,
  },
  suggestList: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestBody: {
    flex: 1,
  },
  suggestLabel: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  suggestSub: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 1,
  },
  hint: {
    color: colors.warning,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  recentSection: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: font.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  recentIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentBody: {
    flex: 1,
  },
  recentLabel: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  terminalCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadow.md,
  },
  terminalCardContent: {
    padding: 16,
    gap: 12,
  },
  terminalCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  terminalCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalCardBody: {
    flex: 1,
  },
  terminalCardName: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  terminalCardSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
  terminalCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  terminalCardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  terminalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  terminalStatText: {
    fontSize: 13,
    fontWeight: font.semibold,
    color: colors.text,
  },
  terminalCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  terminalCardBtnText: {
    color: '#fff',
    fontWeight: font.bold,
    fontSize: 14,
  },
  quickCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    ...shadow.md,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  quickTitle: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popularGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  popularChipRoute: {
    flex: 1,
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
  },
  popularChipPrice: {
    fontSize: 13,
    fontWeight: font.bold,
    color: colors.muted,
    marginLeft: 10,
  },
  popularEmpty: {
    fontSize: 14,
    color: colors.muted,
    paddingBottom: 4,
  },
});
