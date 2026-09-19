import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchBusVendorRevenue, type BusVendorRevenue } from '../../api/vendorBus';
import { StatusBadge } from '../../components/MarketplaceBits';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function ngn(value: number | string | null | undefined): string {
  return `₦${Number(value ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function BusRevenueScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [data, setData] = useState<BusVendorRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fetchBusVendorRevenue());
    } catch {
      // keep current data
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Revenue</Text>
          <Text style={styles.summaryValue}>{ngn(data?.total_revenue)}</Text>
          <Text style={styles.summarySub}>
            {data?.from || '—'} → {data?.to || '—'}
          </Text>
        </View>

        <View style={styles.statGrid}>
          <StatCard label="Bookings" value={String(data?.total_bookings ?? 0)} icon="ticket-outline" tint={colors.accentPurple} prefix="" />
          <StatCard label="Avg per booking" value={ngn(data?.avg_per_booking)} icon="pricetag-outline" tint={colors.accentBlue} prefix="" />
        </View>

        {data?.best_day ? (
          <View style={styles.bestCard}>
            <View style={[styles.bestIcon, { backgroundColor: colors.goldSoft }]}>
              <Ionicons name="trophy" size={18} color={colors.gold} />
            </View>
            <View style={styles.bestBody}>
              <Text style={styles.bestLabel}>Best day</Text>
              <Text style={styles.bestDay}>{data.best_day.day}</Text>
            </View>
            <View style={styles.bestRight}>
              <Text style={styles.bestValue}>{ngn(data.best_day.revenue)}</Text>
              <Text style={styles.bestMeta}>{data.best_day.bookings} booking(s)</Text>
            </View>
          </View>
        ) : null}

        {(data?.route_breakdown ?? []).length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Revenue by route</Text>
            {(data?.route_breakdown ?? []).map((r, i) => (
              <View key={`${r.route_id ?? 'unknown'}-${i}`} style={styles.routeCard}>
                <View style={styles.routeHead}>
                  <Text style={styles.routeName} numberOfLines={1}>
                    {r.origin_city || '?'} → {r.destination_city || '?'}
                  </Text>
                  <Text style={styles.routeValue}>{ngn(r.revenue)}</Text>
                </View>
                <View style={styles.routeFoot}>
                  <Text style={styles.routeMeta}>{r.bookings} booking(s)</Text>
                  <View style={[styles.bar, { backgroundColor: colors.primarySoft }]}>
                    <View style={[styles.barFill, { width: `${barWidth(r.bookings)}%` }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Recent paid bookings</Text>
        {(data?.recent_bookings ?? []).length === 0 ? (
          <View style={styles.centeredBox}>
            <Ionicons name="wallet-outline" size={40} color={colors.mutedLight} />
            <Text style={styles.emptyText}>No paid bookings in this period.</Text>
          </View>
        ) : (
          (data?.recent_bookings ?? []).map((t) => (
            <View key={t.id} style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="ticket" size={16} color={colors.success} />
              </View>
              <View style={styles.txBody}>
                <View style={styles.txHead}>
                  <Text style={styles.txName} numberOfLines={1}>
                    {t.origin_city || ''} → {t.destination_city || ''}
                  </Text>
                  <Text style={styles.txAmount}>{ngn(t.total_amount)}</Text>
                </View>
                <Text style={styles.txRef} numberOfLines={1}>
                  {t.booking_number} · {t.customer_name || 'Passenger'}
                </Text>
                <View style={styles.txFoot}>
                  <Text style={styles.txMeta}>{t.bus_name || 'Bus'} · {t.seat_count ?? 0} seat(s)</Text>
                  <StatusBadge status="paid" />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function barWidth(bookings: number): number {
  return Math.min(100, Math.max(4, bookings * 8));
}

function StatCard({ label, value, icon, tint, prefix }: { label: string; value: string; icon: IconName; tint: string; prefix?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={styles.statValue}>
        {prefix ?? ''}
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    summaryCard: {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      padding: 18,
      marginBottom: 12,
      ...shadow.md,
    },
    summaryLabel: { fontSize: 13, fontWeight: font.bold, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { fontSize: 30, fontWeight: font.bold, color: '#fff', marginTop: 4 },
    summarySub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statCard: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      ...shadow.sm,
    },
    statIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statValue: { fontSize: 17, fontWeight: font.bold, color: colors.text },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 1 },
    bestCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
      ...shadow.sm,
    },
    bestIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    bestBody: { flex: 1 },
    bestLabel: { fontSize: 12, color: colors.muted },
    bestDay: { fontSize: 15, fontWeight: font.bold, color: colors.text },
    bestRight: { alignItems: 'flex-end' },
    bestValue: { fontSize: 15, fontWeight: font.bold, color: colors.success },
    bestMeta: { fontSize: 12, color: colors.muted, marginTop: 1 },
    sectionTitle: { fontSize: 17, fontWeight: font.bold, color: colors.text, marginTop: 20, marginBottom: 10 },
    routeCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 8,
    },
    routeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    routeName: { flex: 1, fontSize: 14, fontWeight: font.bold, color: colors.text },
    routeValue: { fontSize: 14, fontWeight: font.bold, color: colors.success },
    routeFoot: { marginTop: 8 },
    routeMeta: { fontSize: 12, color: colors.muted, marginBottom: 4 },
    bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
    centeredBox: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
    emptyText: { fontSize: 14, color: colors.muted },
    txCard: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      ...shadow.sm,
    },
    txIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    txBody: { flex: 1 },
    txHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    txName: { flex: 1, fontSize: 14, fontWeight: font.bold, color: colors.text },
    txAmount: { fontSize: 15, fontWeight: font.bold, color: colors.success },
    txRef: { fontSize: 12, color: colors.muted, marginTop: 2 },
    txFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
    txMeta: { fontSize: 11, color: colors.muted },
  });
