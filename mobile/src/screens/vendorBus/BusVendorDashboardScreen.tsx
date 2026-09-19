import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBadge } from '../../components/MarketplaceBits';
import type { MainStackParamList } from '../../navigation/types';
import {
  fetchBusVendorDashboard,
  type BusVendorDashboard,
} from '../../api/vendorBus';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'BusVendorDashboard'>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const QUICK_ACTIONS: { key: string; label: string; icon: IconName; route: string; color: string }[] = [
  { key: 'buses', label: 'Buses', icon: 'bus-outline', route: 'BusList', color: '#000000' },
  { key: 'routes', label: 'Routes', icon: 'git-branch-outline', route: 'RouteList', color: '#3B82F6' },
  { key: 'trips', label: 'Trips', icon: 'time-outline', route: 'TripList', color: '#C7792B' },
  { key: 'bookings', label: 'Bookings', icon: 'ticket-outline', route: 'BusBookings', color: '#7C6BE0' },
  { key: 'revenue', label: 'Revenue', icon: 'trending-up-outline', route: 'BusRevenue', color: '#2E9E5B' },
  { key: 'wallet', label: 'Wallet', icon: 'wallet-outline', route: 'BusWallet', color: '#E89A2B' },
  { key: 'profile', label: 'Profile', icon: 'business-outline', route: 'BusProfile', color: '#E8598C' },
];

export function BusVendorDashboardScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [data, setData] = useState<BusVendorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await fetchBusVendorDashboard());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your dashboard.');
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

  function go(route: string, params?: Record<string, unknown>) {
    (navigation.navigate as (name: string, args?: Record<string, unknown>) => void)(route, params);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const vendor = data?.vendor as Record<string, unknown> | undefined;
  const company = (vendor?.company_name as string) || 'Vendor dashboard';
  const widgets = data?.widgets;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerBody}>
            <Text style={styles.eyebrow}>Transport hub</Text>
            <Text style={styles.title} numberOfLines={1}>{company}</Text>
          </View>
          <View style={styles.headerChip}>
            <Ionicons name="bus" size={16} color={colors.primary} />
            <Text style={styles.headerChipText}>Bus booking</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {widgets ? (
          <View style={styles.widgetGrid}>
            <WidgetCard label="Today's trips" value={widgets.today_trips} icon="time-outline" tint={colors.accentBlue} currency={false} />
            <WidgetCard label="Total bookings" value={widgets.total_bookings} icon="ticket-outline" tint={colors.accentPurple} currency={false} />
            <WidgetCard label="Revenue" value={widgets.revenue} icon="trending-up-outline" tint={colors.success} currency />
            <WidgetCard label="Available buses" value={widgets.available_buses} icon="bus-outline" tint={colors.warning} currency={false} />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage</Text>
          <View style={styles.actionGrid}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable key={a.key} style={styles.actionCard} onPress={() => go(a.route)}>
                <View style={[styles.actionIcon, { backgroundColor: `${a.color}1A` }]}>
                  <Ionicons name={a.icon} size={20} color={a.color} />
                </View>
                <Text style={styles.actionLabel} numberOfLines={1}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {(data?.recent_bookings ?? []).length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent bookings</Text>
              <Pressable onPress={() => go('BusBookings')}>
                <Text style={styles.sectionLink}>View all</Text>
              </Pressable>
            </View>
            {(data?.recent_bookings ?? []).slice(0, 4).map((b) => (
              <Pressable key={b.id} style={styles.rowCard} onPress={() => go('BusBookingDetail', { id: b.id })}>
                <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="ticket" size={16} color={colors.primary} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {b.origin_city || ''} → {b.destination_city || ''}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {b.booking_number} · {b.customer_name || 'Passenger'} · ₦{Number(b.total_amount).toLocaleString()}
                  </Text>
                </View>
                <StatusBadge status={b.status} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {(data?.upcoming_trips ?? []).length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Upcoming trips</Text>
              <Pressable onPress={() => go('TripList')}>
                <Text style={styles.sectionLink}>View all</Text>
              </Pressable>
            </View>
            {(data?.upcoming_trips ?? []).slice(0, 4).map((t) => (
              <Pressable key={t.id} style={styles.rowCard} onPress={() => go('TripList')}>
                <View style={[styles.rowIcon, { backgroundColor: colors.warningSoft }]}>
                  <Ionicons name="time" size={16} color={colors.warning} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {t.departure_date} · {t.departure_time}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {t.bus_name || 'Bus'} · {t.origin_city || ''} → {t.destination_city || ''}
                  </Text>
                </View>
                <StatusBadge status={t.status} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function WidgetCard({
  label,
  value,
  icon,
  tint,
  currency,
}: {
  label: string;
  value: number;
  icon: IconName;
  tint: string;
  currency: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.widgetCard}>
      <View style={[styles.widgetIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.widgetValue}>
        {currency ? '₦' : ''}
        {value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
      </Text>
      <Text style={styles.widgetLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    headerBody: { flex: 1 },
    eyebrow: { fontSize: 12, fontWeight: font.bold, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
    title: { fontSize: 24, fontWeight: font.bold, color: colors.text, marginTop: 2 },
    headerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    headerChipText: { fontSize: 12, fontWeight: font.bold, color: colors.primary },
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
    widgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    widgetCard: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      ...shadow.sm,
    },
    widgetIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    widgetValue: { fontSize: 19, fontWeight: font.bold, color: colors.text },
    widgetLabel: { fontSize: 13, color: colors.muted, marginTop: 2 },
    section: { marginTop: 20 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 17, fontWeight: font.bold, color: colors.text, marginBottom: 10 },
    sectionLink: { fontSize: 13, fontWeight: font.bold, color: colors.primary },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionCard: {
      width: '23%',
      flexGrow: 1,
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      ...shadow.sm,
    },
    actionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 12, fontWeight: font.semibold, color: colors.text },
    rowCard: {
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
    rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1 },
    rowName: { fontSize: 14, fontWeight: font.bold, color: colors.text },
    rowSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  });
