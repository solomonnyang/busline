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
import { deleteBus, fetchBuses, type Bus } from '../../api/vendorBus';
import { StatusBadge } from '../../components/MarketplaceBits';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'BusList'>;

export function BusListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setBuses(await fetchBuses());
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => void load());
    return unsub;
  }, [navigation, load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDelete(bus: Bus) {
    Alert.alert('Delete bus', `Delete "${bus.bus_name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBus(bus.id);
            await load();
          } catch {
            Alert.alert('Delete failed', 'Could not delete this bus. It may have upcoming trips.');
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
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Manage the buses in your fleet. Each bus must be assigned to one of your registered terminals.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : buses.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="bus-outline" size={46} color={colors.mutedLight} />
            <Text style={styles.emptyText}>No buses yet.</Text>
            <Text style={styles.emptySub}>Add your first bus to start scheduling trips.</Text>
          </View>
        ) : (
          buses.map((b) => (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.thumb, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="bus" size={22} color={colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>{b.bus_name}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {b.registration_number} · {b.bus_type || 'Standard'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <StatusBadge status={b.status} />
                  </View>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>{b.total_seats} seats</Text>
                <Text style={styles.metaText}>{b.terminal_name || 'No terminal'}</Text>
              </View>
              <View style={styles.cardActions}>
                <Pressable style={styles.ghost} onPress={() => navigation.navigate('BusForm', { busId: b.id })}>
                  <Ionicons name="create-outline" size={14} color={colors.primary} />
                  <Text style={styles.ghostText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.ghost} onPress={() => confirmDelete(b)}>
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text style={[styles.ghostText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.footer}>
          <PrimaryButton label="Add bus" icon="add" onPress={() => navigation.navigate('BusForm', {})} />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
    intro: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 14,
    },
    introText: { fontSize: 14, lineHeight: 21, color: colors.muted },
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
    thumb: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: font.bold, color: colors.text },
    cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
    badgeRow: { marginTop: 8 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    metaText: { fontSize: 13, color: colors.muted },
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
