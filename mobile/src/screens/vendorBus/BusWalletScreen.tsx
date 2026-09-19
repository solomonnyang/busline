import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  createWithdrawal,
  fetchBusVendorWallet,
  type BusVendorWallet,
} from '../../api/vendorBus';
import { FormTextInput } from '../../components/FormTextInput';
import { StatusBadge } from '../../components/MarketplaceBits';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'BusWallet'>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function ngn(value: number | string | null | undefined): string {
  return `₦${Number(value ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function BusWalletScreen(_props: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [data, setData] = useState<BusVendorWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await fetchBusVendorWallet());
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

  async function requestWithdrawal() {
    setFormError('');
    const value = Number(amount);
    if (!amount || !value || value <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      setFormError('Please fill in the bank details.');
      return;
    }
    if (data && value > data.available) {
      setFormError('Amount exceeds your available balance.');
      return;
    }
    setSaving(true);
    try {
      await createWithdrawal({
        amount: value,
        bank_name: bankName.trim(),
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
      });
      setShowForm(false);
      setAmount('');
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      await load();
      Alert.alert('Withdrawal requested', 'Your payout request has been submitted.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not request this withdrawal.');
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
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>{ngn(data?.available)}</Text>
          <Text style={styles.balanceSub}>Ready for withdrawal</Text>
        </View>

        <View style={styles.statGrid}>
          <StatCard label="Earned" value={ngn(data?.earned)} icon="trending-up-outline" tint={colors.success} />
          <StatCard label="Pending" value={ngn(data?.pending)} icon="time-outline" tint={colors.warning} />
          <StatCard label="Withdrawn" value={ngn(data?.withdrawn)} icon="paper-plane-outline" tint={colors.accentPurple} />
        </View>

        <View style={styles.actionsRow}>
          <PrimaryButton
            label={showForm ? 'Cancel' : 'Request withdrawal'}
            variant={showForm ? 'outline' : 'primary'}
            onPress={() => setShowForm((v) => !v)}
            icon="cash-outline"
          />
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Withdraw to your bank</Text>
            {formError ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}
            <FormTextInput label="Amount (₦)" value={amount} onChangeText={setAmount} placeholder="e.g. 25000" keyboardType="decimal-pad" icon="pricetag-outline" />
            <FormTextInput label="Bank name" value={bankName} onChangeText={setBankName} placeholder="e.g. GTBank" autoCapitalize="words" icon="business-outline" />
            <FormTextInput label="Account name" value={accountName} onChangeText={setAccountName} placeholder="Full account name" autoCapitalize="words" icon="person-outline" />
            <FormTextInput label="Account number" value={accountNumber} onChangeText={setAccountNumber} placeholder="e.g. 0123456789" keyboardType="number-pad" icon="keypad-outline" />
            <View style={styles.formActions}>
              <PrimaryButton label="Submit request" onPress={requestWithdrawal} loading={saving} icon="checkmark-done-outline" />
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Withdrawal history</Text>
        {(data?.withdrawals ?? []).length === 0 ? (
          <View style={styles.centeredBox}>
            <Ionicons name="paper-plane-outline" size={40} color={colors.mutedLight} />
            <Text style={styles.emptyText}>No withdrawals yet.</Text>
          </View>
        ) : (
          (data?.withdrawals ?? []).map((w) => (
            <View key={w.id} style={styles.wdCard}>
              <View style={styles.wdHead}>
                <Text style={styles.wdAmount}>{ngn(w.amount)}</Text>
                <StatusBadge status={w.status} />
              </View>
              <Text style={styles.wdRef}>{w.reference}</Text>
              <Text style={styles.wdMeta}>
                {w.bank_name} · {w.account_name} · {w.account_number}
              </Text>
              <Text style={styles.wdMeta}>{w.created_at || '—'}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatCard({ label, value, icon, tint }: { label: string; value: string; icon: IconName; tint: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surfaceAlt },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    balanceCard: {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      padding: 18,
      marginBottom: 12,
      ...shadow.md,
    },
    balanceLabel: { fontSize: 13, fontWeight: font.bold, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5 },
    balanceValue: { fontSize: 30, fontWeight: font.bold, color: '#fff', marginTop: 4 },
    balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statCard: {
      width: '31%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      ...shadow.sm,
    },
    statIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statValue: { fontSize: 15, fontWeight: font.bold, color: colors.text },
    statLabel: { fontSize: 11, color: colors.muted, marginTop: 1 },
    actionsRow: { marginBottom: 12 },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
      ...shadow.sm,
    },
    formTitle: { fontSize: 16, fontWeight: font.bold, color: colors.text, marginBottom: 12 },
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
    formActions: { marginTop: 4 },
    sectionTitle: { fontSize: 17, fontWeight: font.bold, color: colors.text, marginTop: 20, marginBottom: 10 },
    centeredBox: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
    emptyText: { fontSize: 14, color: colors.muted },
    wdCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    wdHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    wdAmount: { fontSize: 17, fontWeight: font.bold, color: colors.text },
    wdRef: { fontSize: 13, color: colors.primary, fontWeight: font.semibold, marginTop: 6 },
    wdMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  });
