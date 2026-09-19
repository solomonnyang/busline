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
  createTrip,
  fetchBuses,
  fetchRoutes,
  fetchTripDetail,
  fetchVendorTerminals,
  updateTrip,
  type Bus,
  type Route,
  type VendorTerminal,
} from '../../api/vendorBus';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'TripForm'>;

export function TripFormScreen({ navigation, route }: Props) {
  const { tripId } = route.params ?? {};
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [busId, setBusId] = useState<number | null>(null);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [terminalId, setTerminalId] = useState<number | null>(null);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('scheduled');

  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [terminals, setTerminals] = useState<VendorTerminal[]>([]);
  const [loading, setLoading] = useState(tripId != null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchBuses(), fetchRoutes(), fetchVendorTerminals()])
      .then(([b, r, t]) => {
        if (!active) return;
        setBuses(b);
        setRoutes(r);
        setTerminals(t);
      })
      .catch(() => undefined);
    if (tripId != null) {
      fetchTripDetail(tripId)
        .then((d) => {
          if (!active) return;
          const t = d.trip;
          setBusId(t.bus_id);
          setRouteId(t.route_id);
          setTerminalId(t.terminal_id ?? null);
          setDepartureDate(t.departure_date);
          setDepartureTime(t.departure_time);
          setArrivalTime(t.arrival_time ?? '');
          setPrice(String(t.price));
          setStatus(t.status);
        })
        .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load this trip.'))
        .finally(() => active && setLoading(false));
    }
    return () => {
      active = false;
    };
  }, [tripId]);

  async function save() {
    setError('');
    if (!busId) {
      setError('Please choose a bus.');
      return;
    }
    if (!routeId) {
      setError('Please choose a route.');
      return;
    }
    if (!departureDate.trim() || !departureTime.trim()) {
      setError('Please enter the departure date and time.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Please enter a valid price.');
      return;
    }
    const payload: Record<string, unknown> = {
      bus_id: busId,
      route_id: routeId,
      terminal_id: terminalId ?? undefined,
      departure_date: departureDate.trim(),
      departure_time: departureTime.trim(),
      arrival_time: arrivalTime.trim() || undefined,
      price: Number(price),
      status,
    };
    setSaving(true);
    try {
      if (tripId != null) {
        await updateTrip(tripId, payload);
      } else {
        await createTrip(payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this trip.');
    } finally {
      setSaving(false);
    }
  }

  function Picker({
    title,
    options,
    selected,
    onSelect,
    format,
  }: {
    title: string;
    options: { id: number; label: string }[];
    selected: number | null;
    onSelect: (id: number) => void;
    format?: (o: { id: number; label: string }) => string;
  }) {
    return (
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.chipRow}>
          {options.map((o) => {
            const active = o.id === selected;
            return (
              <Pressable key={o.id} onPress={() => onSelect(o.id)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {format ? format(o) : o.label}
                </Text>
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

        <Picker
          title="Bus"
          options={buses.map((b) => ({ id: b.id, label: b.bus_name }))}
          selected={busId}
          onSelect={setBusId}
          format={(o) => {
            const b = buses.find((x) => x.id === o.id);
            return `${o.label}${b ? ` · ${b.registration_number}` : ''}`;
          }}
        />
        <Picker
          title="Route"
          options={routes.map((r) => ({ id: r.id, label: `${r.origin_city || '?'} → ${r.destination_city || '?'}` }))}
          selected={routeId}
          onSelect={setRouteId}
        />

        <Text style={styles.sectionTitle}>Schedule</Text>
        <FormTextInput label="Departure date (YYYY-MM-DD)" value={departureDate} onChangeText={setDepartureDate} placeholder="e.g. 2026-09-01" autoCapitalize="none" icon="calendar-outline" />
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <FormTextInput label="Departure time" value={departureTime} onChangeText={setDepartureTime} placeholder="e.g. 08:00" autoCapitalize="none" icon="time-outline" />
          </View>
          <View style={styles.timeField}>
            <FormTextInput label="Arrival time" value={arrivalTime} onChangeText={setArrivalTime} placeholder="e.g. 12:30" autoCapitalize="none" icon="time-outline" />
          </View>
        </View>
        <FormTextInput label="Price (₦)" value={price} onChangeText={setPrice} placeholder="e.g. 5000" keyboardType="decimal-pad" icon="pricetag-outline" />

        {terminals.length > 0 ? (
          <Picker
            title="Terminal (optional)"
            options={terminals.map((t) => ({ id: t.id, label: t.name }))}
            selected={terminalId}
            onSelect={setTerminalId}
          />
        ) : null}

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.chipRow}>
          {(['scheduled', 'cancelled'] as const).map((s) => {
            const active = s === status;
            return (
              <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label={tripId != null ? 'Save changes' : 'Add trip'} onPress={save} loading={saving} />
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
      maxWidth: '100%',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: font.semibold, color: colors.primary, maxWidth: 220 },
    chipTextActive: { color: '#fff' },
    timeRow: { flexDirection: 'row', gap: 10 },
    timeField: { flex: 1 },
    footer: { marginTop: 20 },
  });
