import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  fetchBusVendorDashboard,
  updateBusVendorProfile,
} from '../../api/vendorBus';
import { FormTextInput } from '../../components/FormTextInput';
import { StatusBadge } from '../../components/MarketplaceBits';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'BusProfile'>;

export function BusProfileScreen(_props: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [approval, setApproval] = useState<string>('pending');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchBusVendorDashboard();
      const v = (data.vendor ?? {}) as Record<string, unknown>;
      setCompanyName(String(v.company_name ?? ''));
      setCompanyEmail(String(v.company_email ?? ''));
      setCompanyPhone(String(v.company_phone ?? ''));
      setAddress(String(v.address ?? ''));
      setCity(String(v.city ?? ''));
      setCountry(String(v.country ?? ''));
      setDescription(String(v.description ?? ''));
      setApproval(String(v.approval_status ?? 'pending'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setError('');
    setSaved(false);
    if (!companyName.trim() || companyName.trim().length < 2) {
      setError('Company name is required.');
      return;
    }
    const payload: Record<string, unknown> = {
      company_name: companyName.trim(),
      company_email: companyEmail.trim() || undefined,
      company_phone: companyPhone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      description: description.trim() || undefined,
    };
    setSaving(true);
    try {
      await updateBusVendorProfile(payload);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
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
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerChip}>
              <Ionicons name="bus" size={14} color={colors.primary} />
              <Text style={styles.headerChipText}>Bus booking</Text>
            </View>
            <StatusBadge status={approval} />
          </View>
          <Text style={styles.companyName} numberOfLines={2}>{companyName || 'Your company'}</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {saved ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <Text style={styles.successText}>Profile updated successfully.</Text>
          </View>
        ) : null}

        <FormTextInput label="Company name" value={companyName} onChangeText={setCompanyName} placeholder="e.g. ABC Transport" icon="business-outline" />
        <FormTextInput label="Company email" value={companyEmail} onChangeText={setCompanyEmail} placeholder="accounts@company.com" autoCapitalize="none" keyboardType="email-address" icon="mail-outline" />
        <FormTextInput label="Company phone" value={companyPhone} onChangeText={setCompanyPhone} placeholder="e.g. 08012345678" keyboardType="phone-pad" icon="call-outline" />
        <FormTextInput label="Address" value={address} onChangeText={setAddress} placeholder="Office address" autoCapitalize="words" icon="location-outline" />
        <View style={styles.twoCol}>
          <View style={styles.twoColItem}>
            <FormTextInput label="City" value={city} onChangeText={setCity} placeholder="e.g. Lagos" autoCapitalize="words" icon="business-outline" />
          </View>
          <View style={styles.twoColItem}>
            <FormTextInput label="Country" value={country} onChangeText={setCountry} placeholder="e.g. Nigeria" autoCapitalize="words" icon="earth-outline" />
          </View>
        </View>
        <FormTextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Tell passengers about your service"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          icon="create-outline"
        />

        <View style={styles.footer}>
          <PrimaryButton label="Save profile" onPress={save} loading={saving} icon="save-outline" />
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
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
      ...shadow.sm,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
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
    companyName: { fontSize: 20, fontWeight: font.bold, color: colors.text, marginTop: 12 },
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
    successCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.successSoft,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 12,
    },
    successText: { flex: 1, fontSize: 13, color: colors.success, fontWeight: font.semibold },
    twoCol: { flexDirection: 'row', gap: 10 },
    twoColItem: { flex: 1 },
    footer: { marginTop: 20 },
  });
