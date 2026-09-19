import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import type { WalletOverview, WalletTransaction } from '../../api/types';
import { PaystackCheckoutModal } from '../../components/PaystackCheckoutModal';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Skeleton } from '../../components/Skeleton';
import { WalletTransactionDetailModal } from '../../components/WalletTransactionDetailModal';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { formatDateTime, formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<MainStackParamList, 'Payment'>;

const TOPUP_PRESETS = [1000, 2000, 5000, 10000];

export function PaymentScreen({}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [wallet, setWallet] = useState<WalletOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupError, setTopupError] = useState('');

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const checkoutRefRef = useRef<string | null>(null);

  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.fetchWallet();
      setWallet(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet.');
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

  const selectedAmount = customAmount ? Number(customAmount) : (topupAmount ?? 0);

  async function startTopup() {
    setTopupError('');
    if (!selectedAmount || selectedAmount < 100) {
      setTopupError('Enter an amount of at least ₦100.');
      return;
    }
    setTopupBusy(true);
    try {
      const result = await api.topupWallet(selectedAmount, 'busline://payment/callback');
      if (result.authorization_url) {
        checkoutRefRef.current = result.transaction.reference ?? null;
        setCheckoutUrl(result.authorization_url);
      } else {
        setTopupError('Payment link unavailable. Please try again.');
      }
    } catch (e) {
      setTopupError(e instanceof Error ? e.message : 'Could not start your top-up.');
    } finally {
      setTopupBusy(false);
    }
  }

  function finishCheckout(data: WalletOverview) {
    checkoutRefRef.current = null;
    setWallet(data);
    setCheckoutUrl(null);
    setTopupOpen(false);
    setCustomAmount('');
    setTopupAmount(null);
  }

  function handleVerified(reference: string): Promise<void> {
    return api.verifyWalletTopup(reference).then(finishCheckout);
  }

  // While the checkout modal is open, poll the safe status endpoint so a
  // completed payment is reconciled to success even if Paystack never
  // redirects back to the app (e.g. stuck on its success page).
  useEffect(() => {
    if (!checkoutUrl) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const ref = checkoutRefRef.current;
      if (!ref) return;
      try {
        const status = await api.checkWalletTopupStatus(ref);
        if (cancelled) return;
        if (status.status === 'success') {
          clearInterval(timer);
          const data = await api.verifyWalletTopup(ref);
          if (!cancelled) finishCheckout(data);
        }
      } catch {
        // transient network error; keep polling
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutUrl]);

  async function handleCheckoutClose() {
    const ref = checkoutRefRef.current;
    checkoutRefRef.current = null;
    setCheckoutUrl(null);
    setTopupOpen(false);
    setCustomAmount('');
    setTopupAmount(null);
    // If the in-app redirect back was missed, the payment may still have
    // succeeded on Paystack's side. Poll the safe status endpoint so the
    // wallet is reconciled to success instead of staying pending.
    try {
      if (ref) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const status = await api.checkWalletTopupStatus(ref);
          if (status.status === 'success') {
            const data = await api.verifyWalletTopup(ref);
            setWallet(data);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    } catch {
      // fall through to a plain refresh
    }
    void load();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.skeletonWrap}>
          <View style={styles.skeletonBalance}>
            <Skeleton width={110} height={14} style={{ alignSelf: 'center' }} />
            <Skeleton width={160} height={34} style={{ alignSelf: 'center', marginTop: 10 }} />
            <Skeleton width={150} height={46} radius={12} style={{ alignSelf: 'center', marginTop: 18 }} />
          </View>
          <View style={styles.skeletonTxnHead}>
            <Skeleton width={120} height={15} />
            <Skeleton width={80} height={15} />
          </View>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonTxn}>
              <Skeleton width={40} height={40} radius={13} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={12} />
              </View>
              <Skeleton width={60} height={15} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error && !wallet) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.ink} />
        }
      >
        <WalletCard
          wallet={wallet}
          open={topupOpen}
          busy={topupBusy}
          error={topupError}
          selectedAmount={selectedAmount}
          customValue={customAmount}
          onToggle={() => {
            setTopupOpen((v) => !v);
            setTopupError('');
          }}
          onPreset={(value) => {
            setTopupAmount(value);
            setCustomAmount('');
          }}
          onCustomChange={(text) => {
            setCustomAmount(text.replace(/[^0-9]/g, ''));
            if (text) setTopupAmount(null);
          }}
          onStart={startTopup}
          onSelectTx={setSelectedTx}
        />
      </ScrollView>

      {checkoutUrl ? (
        <PaystackCheckoutModal
          url={checkoutUrl}
          onClose={handleCheckoutClose}
          onVerified={handleVerified}
        />
      ) : null}

      <WalletTransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </SafeAreaView>
  );
}

function WalletCard({
  wallet,
  open,
  busy,
  error,
  selectedAmount,
  customValue,
  onToggle,
  onPreset,
  onCustomChange,
  onStart,
  onSelectTx,
}: {
  wallet: WalletOverview | null;
  open: boolean;
  busy: boolean;
  error: string;
  selectedAmount: number;
  customValue: string;
  onToggle: () => void;
  onPreset: (value: number) => void;
  onCustomChange: (text: string) => void;
  onStart: () => void;
  onSelectTx: (tx: WalletTransaction) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <View style={styles.walletCard}>
        <View style={styles.walletTop}>
          <View style={styles.walletIcon}>
            <Ionicons name="wallet" size={22} color={colors.text} />
          </View>
          <View style={styles.walletBody}>
            <Text style={styles.walletLabel}>Wallet balance</Text>
            {wallet ? (
              <Text style={styles.walletValue}>₦{formatPrice(wallet.wallet.balance)}</Text>
            ) : (
              <Text style={styles.walletValue}>—</Text>
            )}
          </View>
          <Pressable
            onPress={onToggle}
            style={({ pressed }) => [styles.topupBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={open ? 'close' : 'add'} size={16} color="#fff" />
            <Text style={styles.topupBtnText}>{open ? 'Close' : 'Top up'}</Text>
          </Pressable>
        </View>
        <View style={styles.walletFoot}>
          <View style={styles.walletFootItem}>
            <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.walletFootText}>Secure & insured</Text>
          </View>
          <View style={styles.walletFootItem}>
            <Ionicons name="flash-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.walletFootText}>Instant top-up</Text>
          </View>
        </View>
      </View>

      {open ? (
        <View style={styles.topupCard}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="add-circle-outline" size={12} color={colors.primary} />
            <Text style={styles.eyebrow}>Top up wallet</Text>
          </View>
          <Text style={styles.topupTitle}>How much do you want to add?</Text>
          <View style={styles.presetsRow}>
            {TOPUP_PRESETS.map((value) => (
              <PresetChip
                key={value}
                label={`₦${formatPrice(value)}`}
                active={selectedAmount === value}
                onPress={() => onPreset(value)}
              />
            ))}
          </View>
          <View style={styles.customRow}>
            <Text style={styles.customPrefix}>₦</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Custom amount"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              value={customValue}
              onChangeText={onCustomChange}
            />
          </View>
          {error ? <Text style={styles.topupError}>{error}</Text> : null}
          <PrimaryButton
            label={`Pay ${selectedAmount ? `₦${formatPrice(selectedAmount)}` : ''}`}
            onPress={onStart}
            loading={busy}
            icon="lock-closed-outline"
            variant="teal"
          />
          <Text style={styles.topupHint}>Secure in-app payment via Paystack. Min ₦100.</Text>
        </View>
      ) : null}

      <View style={styles.activityCard}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="time" size={12} color={colors.primary} />
          <Text style={styles.eyebrow}>Wallet activity</Text>
        </View>
        {wallet && wallet.transactions.length > 0 ? (
          <View style={styles.activityList}>
            {wallet.transactions.map((tx) => (
              <WalletTxRow key={tx.id} tx={tx} onPress={() => onSelectTx(tx)} />
            ))}
          </View>
        ) : wallet ? (
          <View style={styles.activityEmptyWrap}>
            <View style={styles.activityEmptyIcon}>
              <Ionicons name="card-outline" size={26} color={colors.teal} />
            </View>
            <Text style={styles.activityEmpty}>No activity yet. Top up to get started.</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

function PresetChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={[styles.presetChip, active && styles.presetChipActive]}>
      <Text style={[styles.presetText, active && styles.presetTextActive]}>{label}</Text>
    </Pressable>
  );
}

function WalletTxRow({ tx, onPress }: { tx: WalletTransaction; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const STATUS_META: Record<string, { label: string; color: string; soft: string }> = {
    success: { label: 'Successful', color: colors.success, soft: colors.successSoft },
    pending: { label: 'Pending', color: colors.warning, soft: colors.warningSoft },
    failed: { label: 'Failed', color: colors.danger, soft: colors.dangerSoft },
  };
  const meta = STATUS_META[tx.status] ?? { label: tx.status, color: colors.muted, soft: colors.surfaceAlt };
  const isCredit = tx.type === 'credit';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.txRow, pressed && { opacity: 0.6 }]}
    >
      <View style={styles.txIcon}>
        <Ionicons
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size={15}
          color={isCredit ? colors.success : colors.danger}
        />
      </View>
      <View style={styles.txBody}>
        <Text style={styles.txDesc} numberOfLines={1}>
          {tx.description || 'Wallet transaction'}
        </Text>
        <Text style={styles.txDate}>{formatDateTime(tx.paid_at ?? tx.created_at)}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.danger }]}>
          {isCredit ? '+' : '−'}₦{formatPrice(tx.amount)}
        </Text>
        <View style={[styles.statusChip, { backgroundColor: meta.soft, paddingHorizontal: 8, paddingVertical: 2 }]}>
          <Text style={[styles.status, { color: meta.color, fontSize: 10 }]}>{meta.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  skeletonWrap: {
    padding: 16,
    gap: 12,
  },
  skeletonBalance: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  skeletonTxnHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  skeletonTxn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  walletCard: {
    borderRadius: radius.lg,
    padding: 18,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    ...shadow.md,
  },
  walletTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBody: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  walletValue: {
    fontSize: 30,
    fontWeight: font.bold,
    color: colors.white,
    marginTop: 2,
  },
  walletFoot: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  walletFootItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walletFootText: {
    fontSize: 12,
    fontWeight: font.semibold,
    color: 'rgba(255,255,255,0.85)',
  },
  topupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  topupBtnText: {
    fontSize: 14,
    fontWeight: font.bold,
    color: colors.ink,
  },
  topupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: font.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  topupTitle: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.text,
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  presetChipActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  presetText: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.muted,
  },
  presetTextActive: {
    color: colors.teal,
    fontWeight: font.bold,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  customPrefix: {
    fontSize: 18,
    fontWeight: font.bold,
    color: colors.muted,
    marginRight: 4,
  },
  customInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 17,
    color: colors.text,
  },
  topupError: {
    color: colors.danger,
    fontSize: 15,
    marginBottom: 10,
  },
  topupHint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow.sm,
  },
  activityList: {
    gap: 12,
  },
  activityEmptyWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  activityEmptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmpty: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: {
    flex: 1,
  },
  txDesc: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.text,
  },
  txDate: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  txAmount: {
    fontSize: 17,
    fontWeight: font.bold,
  },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: font.bold,
    textTransform: 'capitalize',
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
});
