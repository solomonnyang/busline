import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import type { Booking } from '../../api/types';
import { BookingCard } from '../../components/BookingCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Skeleton } from '../../components/Skeleton';
import type { MainStackParamList, MainTabsParamList } from '../../navigation/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = BottomTabScreenProps<MainTabsParamList, 'Bookings'> & {
  navigation: CompositeNavigationProp<
    BottomTabScreenProps<MainTabsParamList, 'Bookings'>['navigation'],
    NativeStackNavigationProp<MainStackParamList>
  >;
};

type TabKey = 'upcoming' | 'completed';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

const ACTIVE_STATUSES = ['pending', 'confirmed'];
const COMPLETED_STATUS = 'completed';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayDiff(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((day.getTime() - base.getTime()) / 86400000);
}

function headerLabel(dateStr: string): string {
  const diff = dayDiff(dateStr);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  const base = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

function buildSections(bookings: Booking[], tab: TabKey) {
  const map = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = (b.departure_date || '').slice(0, 10);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  const keys = [...map.keys()].sort();
  if (tab === 'completed') keys.reverse();
  return keys.map((k) => ({
    title: headerLabel(k),
    data: map
      .get(k)!
      .slice()
      .sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || '')),
  }));
}

export function MyBookingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [tabsWidth, setTabsWidth] = useState(0);
  const underlineX = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === tab);
    const per = tabsWidth / TABS.length;
    Animated.timing(underlineX, {
      toValue: idx * per,
      duration: 240,
      useNativeDriver: true,
    }).start();

    contentOpacity.setValue(0);
    contentShift.setValue(8);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(contentShift, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [tab, tabsWidth, underlineX, contentOpacity, contentShift]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.fetchBookings();
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const tabBookings = useMemo(
    () =>
      tab === 'upcoming'
        ? bookings.filter((b) => ACTIVE_STATUSES.includes(b.status))
        : bookings.filter((b) => b.status === COMPLETED_STATUS),
    [bookings, tab]
  );

  const sections = useMemo(() => buildSections(tabBookings, tab), [tabBookings, tab]);

  function openBooking(booking: Booking) {
    navigation.navigate('BookingDetail', { id: booking.id });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      <View
        style={styles.tabs}
        onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={styles.seg}
            >
              <Text style={[styles.segText, active && styles.segTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
        <Animated.View
          style={[
            styles.indicator,
            { width: tabsWidth / TABS.length, transform: [{ translateX: underlineX }] },
          ]}
        />
      </View>

      <Animated.View style={[styles.content, { opacity: contentOpacity, transform: [{ translateY: contentShift }] }]}>
      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width={44} height={44} style={styles.skeletonThumb} />
              <View style={styles.skeletonBody}>
                <Skeleton width={150} height={16} />
                <Skeleton width={120} height={13} style={{ marginTop: 8 }} />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="ticket-outline" size={40} color={colors.teal} />
          </View>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySub}>Search for a trip and book your first seat.</Text>
          <View style={styles.emptyCta}>
            <PrimaryButton
              label="Book a trip"
              icon="search"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
            />
          </View>
        </View>
      ) : tabBookings.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-clear-outline" size={40} color={colors.teal} />
          </View>
          <Text style={styles.emptyTitle}>
            {tab === 'upcoming' ? 'No upcoming trips' : 'No completed trips'}
          </Text>
          <Text style={styles.emptySub}>
            {tab === 'upcoming'
              ? 'Book a trip and it will show up here before your departure.'
              : 'Trips you have travelled on will appear here.'}
          </Text>
          {tab === 'upcoming' && (
            <View style={styles.emptyCta}>
              <PrimaryButton
                label="Book a trip"
                icon="search"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
              />
            </View>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          style={styles.listScroll}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          renderSectionHeader={({ section }) => (
            <Text style={styles.groupHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => <BookingCard booking={item} onPress={openBooking} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.muted} />
          }
        />
      )}
      </Animated.View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: font.bold,
    color: colors.text,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: -1,
    height: 2,
    backgroundColor: colors.teal,
  },
  segText: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.muted,
  },
  segTextActive: {
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  segCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  segCountText: {
    fontSize: 12,
    fontWeight: font.bold,
    color: colors.muted,
  },
  list: {
    paddingBottom: 40,
  },
  listScroll: {
    flex: 1,
  },
  groupHeader: {
    fontSize: 15,
    fontWeight: font.bold,
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
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
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: font.semibold,
    color: colors.text,
  },
  emptySub: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 21,
  },
  emptyCta: {
    marginTop: 24,
    width: 240,
    alignItems: 'center',
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  skeletonThumb: {
    borderRadius: radius.md,
    marginRight: 14,
  },
  skeletonBody: {
    flex: 1,
  },
});