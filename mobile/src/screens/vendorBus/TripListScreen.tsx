import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { deleteTrip, fetchTrips, type Trip } from '../../api/vendorBus';
import { StatusBadge } from '../../components/MarketplaceBits';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'TripList'>;

const FILTERS = ['all', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const;

export function TripListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrips(await fetchTrips(filter === 'all' ? undefined : { status: filter }));
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => void load());
    return unsub;
  }, [navigation, load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDelete(trip: Trip) {
    Alert.alert('Delete trip', `Delete the ${trip.departure_date} trip?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTrip(trip.id);
            await load();
          } catch {
            Alert.alert('Delete failed', 'Could not delete this trip. It may have active bookings.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
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
        ) : trips.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="time-outline" size={46} color={colors.mutedLight} />
            <Text style={styles.emptyText}>No trips found.</Text>
            <Text style={styles.emptySub}>Schedule a trip to start selling seats.</Text>
          </View>
        ) : (
          trips.map((t) => (
            <View key={t.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.thumb, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="bus" size={20} color={colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {t.origin_city || ''} → {t.destination_city || ''}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {t.departure_date} · {t.departure_time}
                    {t.arrival_time ? ` – ${t.arrival_time}` : ''}
                  </Text>
                  <Text style={styles.cardMetaText} numberOfLines={1}>
                    {t.bus_name || 'Bus'} · ₦{Number(t.price).toLocaleString()}
                  </Text>
                  <View style={styles.badgeRow}>
                    <StatusBadge status={t.status} />
                    <Text style={styles.seatsText}>{t.available_seats} seats left</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable style={styles.ghost} onPress={() => navigation.navigate('TripForm', { tripId: t.id })}>
                  <Ionicons name="create-outline" size={14} color={colors.primary} />
                  <Text style={styles.ghostText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.ghost} onPress={() => confirmDelete(t)}>
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text style={[styles.ghostText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.footer}>
          <PrimaryButton label="Add trip" icon="add" onPress={() => navigation.navigate('TripForm', {})} />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
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
    centered: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
    emptyText: { fontSize: 16, fontWeight: font.bold, color: colors.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
      ...shadow.sm,
    },
    cardTop: { flexDirection: 'row', gap: 12 },
    thumb: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: font.bold, color: colors.text },
    cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
    cardMetaText: { fontSize: 13, color: colors.muted, marginTop: 2 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    seatsText: { fontSize: 12, color: colors.muted },
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    ghost: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.surfaceAlt,
    },
    ghostText: { fontSize: 13, fontWeight: font.bold, color: colors.primary },
    footer: { marginTop: 8 },
  });
