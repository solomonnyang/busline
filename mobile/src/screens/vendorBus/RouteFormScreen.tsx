import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  createRoute,
  fetchRoutes,
  fetchVendorCities,
  updateRoute,
  type VendorCity,
} from '../../api/vendorBus';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'RouteForm'>;

export function RouteFormScreen({ navigation, route }: Props) {
  const { routeId } = route.params ?? {};
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [originId, setOriginId] = useState<number | null>(null);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState('');
  const [duration, setDuration] = useState('');
  const [status, setStatus] = useState('active');
  const [cities, setCities] = useState<VendorCity[]>([]);
  const [loading, setLoading] = useState(routeId != null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchVendorCities()
      .then((c) => {
        if (!active) return;
        setCities(c);
      })
      .catch(() => undefined);
    if (routeId != null) {
      fetchRoutes()
        .then((list) => {
          const r = list.find((x) => x.id === routeId);
          if (!r || !active) return;
          setOriginId(r.origin_city_id);
          setDestinationId(r.destination_city_id);
          setDistanceKm(String(r.distance_km));
          setDuration(r.estimated_duration ? String(r.estimated_duration) : '');
          setStatus(r.status);
        })
        .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load this route.'))
        .finally(() => active && setLoading(false));
    }
    return () => {
      active = false;
    };
  }, [routeId]);

  function toggleOrigin(id: number) {
    setOriginId(id);
    if (id === destinationId) setDestinationId(null);
  }

  function toggleDestination(id: number) {
    setDestinationId(id);
    if (id === originId) setOriginId(null);
  }

  async function save() {
    setError('');
    if (!originId || !destinationId) {
      setError('Please select both an origin and a destination city.');
      return;
    }
    if (originId === destinationId) {
      setError('Origin and destination must be different.');
      return;
    }
    if (!distanceKm || Number(distanceKm) <= 0) {
      setError('Please enter a valid distance.');
      return;
    }
    const payload: Record<string, unknown> = {
      origin_city_id: originId,
      destination_city_id: destinationId,
      distance_km: Number(distanceKm),
      estimated_duration: duration ? Number(duration) : undefined,
      status,
    };
    setSaving(true);
    try {
      if (routeId != null) {
        await updateRoute(routeId, payload);
      } else {
        await createRoute(payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this route.');
    } finally {
      setSaving(false);
    }
  }

  function CityPicker({
    title,
    selected,
    onSelect,
  }: {
    title: string;
    selected: number | null;
    onSelect: (id: number) => void;
  }) {
    return (
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.chipRow}>
          {cities.map((c) => {
            const active = c.id === selected;
            return (
              <Pressable key={c.id} onPress={() => onSelect(c.id)} style={[styles.chip, active && styles.chipActive]}>
                <Ionicons name="location-outline" size={14} color={active ? '#fff' : colors.primary} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <CityPicker title="Origin city" selected={originId} onSelect={toggleOrigin} />
        <CityPicker title="Destination city" selected={destinationId} onSelect={toggleDestination} />

        <FormTextInput label="Distance (km)" value={distanceKm} onChangeText={setDistanceKm} placeholder="e.g. 250" keyboardType="decimal-pad" icon="resize-outline" />
        <FormTextInput label="Estimated duration (minutes, optional)" value={duration} onChangeText={setDuration} placeholder="e.g. 240" keyboardType="number-pad" icon="time-outline" />

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.chipRow}>
          {(['active', 'inactive'] as const).map((s) => {
            const active = s === status;
            return (
              <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label={routeId != null ? 'Save changes' : 'Add route'} onPress={save} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
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
    sectionTitle: { fontSize: 16, fontWeight: font.bold, color: colors.text, marginTop: 16, marginBottom: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: font.semibold, color: colors.primary },
    chipTextActive: { color: '#fff' },
    footer: { marginTop: 20 },
  });
