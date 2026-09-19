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
  createBus,
  fetchBusCategories,
  fetchBuses,
  fetchVendorTerminals,
  updateBus,
  type Bus,
  type BusCategory,
  type VendorTerminal,
} from '../../api/vendorBus';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'BusForm'>;

export function BusFormScreen({ navigation, route }: Props) {
  const { busId } = route.params ?? {};
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [busName, setBusName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [busType, setBusType] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [terminalId, setTerminalId] = useState<number | null>(null);
  const [status, setStatus] = useState('active');

  const [categories, setCategories] = useState<BusCategory[]>([]);
  const [terminals, setTerminals] = useState<VendorTerminal[]>([]);
  const [loading, setLoading] = useState(busId != null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchBusCategories(), fetchVendorTerminals()])
      .then(([cats, terms]) => {
        if (!active) return;
        setCategories(cats);
        setTerminals(terms);
        if (terms.length === 1 && busId == null) setTerminalId(terms[0].id);
      })
      .catch(() => undefined);
    if (busId != null) {
      fetchBuses()
        .then((list) => {
          const b = list.find((x) => x.id === busId);
          if (!b || !active) return;
          setBusName(b.bus_name);
          setRegNumber(b.registration_number);
          setBusType(b.bus_type ?? '');
          setTotalSeats(String(b.total_seats));
          setTerminalId(b.terminal_id ?? null);
          setStatus(b.status);
        })
        .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load this bus.'))
        .finally(() => active && setLoading(false));
    }
    return () => {
      active = false;
    };
  }, [busId]);

  async function save() {
    setError('');
    if (busName.trim().length < 2) {
      setError('Please enter a bus name.');
      return;
    }
    if (regNumber.trim().length < 2) {
      setError('Please enter the registration number.');
      return;
    }
    if (!terminalId) {
      setError('Please choose a terminal.');
      return;
    }
    const payload: Record<string, unknown> = {
      bus_name: busName.trim(),
      registration_number: regNumber.trim(),
      bus_type: busType.trim() || undefined,
      total_seats: totalSeats ? Number(totalSeats) : undefined,
      terminal_id: terminalId,
      status,
    };
    setSaving(true);
    try {
      if (busId != null) {
        await updateBus(busId, payload);
      } else {
        await createBus(payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this bus.');
    } finally {
      setSaving(false);
    }
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

        <FormTextInput label="Bus name" value={busName} onChangeText={setBusName} placeholder="e.g. Lux Coach 12" icon="bus-outline" />
        <FormTextInput label="Registration number" value={regNumber} onChangeText={setRegNumber} placeholder="e.g. LSR 123 XD" autoCapitalize="characters" icon="card-outline" />
        <FormTextInput label="Total seats" value={totalSeats} onChangeText={setTotalSeats} placeholder="e.g. 40" keyboardType="number-pad" icon="people-outline" />

        <Text style={styles.sectionTitle}>Bus type</Text>
        <View style={styles.chipRow}>
          {categories.length > 0 ? (
            categories.map((c) => {
              const active = c.name === busType || (busType === '' && c.name === 'Standard');
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setBusType(c.name)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                </Pressable>
              );
            })
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Terminal</Text>
        <View style={styles.chipRow}>
          {terminals.map((t) => {
            const active = t.id === terminalId;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTerminalId(t.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons name="location-outline" size={14} color={active ? '#fff' : colors.primary} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t.name}{t.city_name ? ` · ${t.city_name}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.chipRow}>
          {(['active', 'inactive', 'maintenance'] as const).map((s) => {
            const active = s === status;
            return (
              <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label={busId != null ? 'Save changes' : 'Add bus'} onPress={save} loading={saving} />
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
