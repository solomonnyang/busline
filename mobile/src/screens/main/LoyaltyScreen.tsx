import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
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
import type { LoyaltyOverview } from '../../api/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { OfferHeroIcon } from '../../components/OfferHeroIcon';
import { Skeleton } from '../../components/Skeleton';
import { SuccessPopup } from '../../components/SuccessPopup';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { formatDateTime, formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<MainStackParamList, 'Loyalty'>;

export function LoyaltyScreen({}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');
  const [redeemPopup, setRedeemPopup] = useState('');

  const balance = Number(overview?.balance ?? 0);
  const rules = overview?.rules;
  const minPoints = Number(rules?.loyalty?.min_points_redeem ?? 10);
  const pointsValue = Number(rules?.loyalty?.points_value_ngn ?? 1);

  const selected = Number(redeemPoints) || 0;
  const redeemable = selected >= minPoints && selected <= balance;
  const redeemAmount = redeemable ? Math.round(selected * pointsValue * 100) / 100 : 0;

  const presets = Array.from(
    new Set([minPoints, minPoints * 2, minPoints * 5, minPoints * 10].filter((p) => p <= balance))
  ).slice(0, 4);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.fetchLoyaltyOverview();
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load loyalty points.');
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

  async function onRedeem() {
    setRedeemError('');
    setRedeemSuccess('');
    if (!redeemable) return;
    setRedeeming(true);
    try {
      const result = await api.redeemPoints(selected);
      const msg = `Redeemed ${result.redeemed_points} points for ₦${formatPrice(result.amount)}.`;
      setRedeemSuccess(msg);
      setRedeemPopup(msg);
      setRedeemPoints('');
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              balance: result.balance,
              history: [
                {
                  id: Date.now(),
                  customer_id: 0,
                  points: -result.redeemed_points,
                  type: 'redeem',
                  source: 'redeem',
                  description: `Redeemed ${result.redeemed_points} points for ₦${formatPrice(result.amount)}`,
                  reference: '',
                  created_at: new Date().toISOString(),
                },
                ...prev.history,
              ],
            }
          : prev
      );
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : 'Could not redeem points.');
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.skeletonWrap}>
          <View style={styles.skeletonBalanceCard}>
            <Skeleton width={120} height={16} style={{ alignSelf: 'center' }} />
            <Skeleton width={180} height={38} style={{ alignSelf: 'center', marginTop: 12 }} />
            <Skeleton width="70%" height={14} style={{ alignSelf: 'center', marginTop: 10 }} />
          </View>
          <View style={styles.skeletonSectionHead}>
            <Skeleton width={110} height={15} />
            <Skeleton width={70} height={15} />
          </View>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonTxn}>
              <Skeleton width={40} height={40} radius={13} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={12} />
              </View>
              <Skeleton width={56} height={15} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error && !overview) {
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
        <View style={styles.balanceCard}>
          <View style={styles.heroIconWrap}>
            <OfferHeroIcon variant="loyalty" />
          </View>
          <View style={styles.eyebrowRow}>
            <Ionicons name="star" size={12} color={colors.primary} />
            <Text style={styles.eyebrow}>Loyalty balance</Text>
          </View>
          <Text style={styles.balanceNum}>
            {formatPrice(balance)} <Text style={styles.balanceUnit}>pts</Text>
          </Text>
          <Text style={styles.muted}>
            Worth ₦{formatPrice(balance * pointsValue)} today. Redeem in multiples of {minPoints} points.
          </Text>

          <View style={styles.redeemPanel}>
            <View style={styles.presetsRow}>
              {presets.map((value) => (
                <PresetChip
                  key={value}
                  label={`${value} pts`}
                  active={selected === value}
                  onPress={() => {
                    setRedeemPoints(String(value));
                    setRedeemError('');
                    setRedeemSuccess('');
                  }}
                />
              ))}
            </View>
            <View style={styles.customRow}>
              <Ionicons name="star" size={16} color={colors.muted} />
              <TextInput
                style={styles.customInput}
                placeholder={`${minPoints} or more`}
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={redeemPoints}
                onChangeText={(t) => {
                  setRedeemPoints(t.replace(/[^0-9]/g, ''));
                  setRedeemError('');
                  setRedeemSuccess('');
                }}
              />
            </View>
            {redeemAmount > 0 ? (
              <Text style={styles.redeemHint}>
                You'll receive ₦{formatPrice(redeemAmount)} in your wallet.
              </Text>
            ) : null}
            {redeemError ? <Text style={styles.error}>{redeemError}</Text> : null}
            {redeemSuccess ? <Text style={styles.success}>{redeemSuccess}</Text> : null}
            <PrimaryButton
              label="Redeem to wallet"
              icon="arrow-down-circle-outline"
              onPress={onRedeem}
              loading={redeeming}
              disabled={!redeemable}
              variant="teal"
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="information-circle" size={12} color={colors.primary} />
            <Text style={styles.eyebrow}>How it works</Text>
          </View>
            <View style={styles.ruleRow}>
              <View style={[styles.ruleIco, { backgroundColor: colors.goldSoft }]}>
                <Ionicons name="star" size={17} color={colors.gold} />
              </View>
            <View style={styles.ruleBody}>
              <Text style={styles.ruleTitle}>Earn points, redeem for cash</Text>
              <Text style={styles.muted}>
                Earn {rules?.loyalty?.points_per_booking ?? 10} points for every paid seat booking. Each
                point is worth ₦{formatPrice(rules?.loyalty?.points_value_ngn ?? 1)}. Once you reach {minPoints}{' '}
                points you can redeem them straight into your wallet.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="time" size={12} color={colors.primary} />
            <Text style={styles.eyebrow}>Points history</Text>
          </View>
          {!overview || overview.history.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="star-outline" size={30} color={colors.teal} />
              <Text style={styles.muted}>No points yet — book a trip to start earning.</Text>
            </View>
          ) : (
            <View style={styles.history}>
              {overview.history.map((h) => {
                const earn = h.type === 'earn';
                return (
                  <View key={h.id} style={styles.historyRow}>
                    <View
                      style={[
                        styles.historyIco,
                        { backgroundColor: earn ? colors.successSoft : colors.primarySoft },
                      ]}
                    >
                      <Ionicons
                        name={earn ? 'add' : 'remove'}
                        size={14}
                        color={earn ? colors.success : colors.primary}
                      />
                    </View>
                    <View style={styles.historyBody}>
                      <Text style={styles.historyDesc} numberOfLines={1}>
                        {h.description}
                      </Text>
                      <Text style={styles.historyDate}>{formatDateTime(h.created_at)}</Text>
                    </View>
                    <Text style={[styles.historyPts, { color: earn ? colors.success : colors.primary }]}>
                      {h.points > 0 ? '+' : ''}
                      {h.points}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <SuccessPopup
        visible={redeemPopup !== ''}
        title="Points redeemed!"
        message={redeemPopup}
        onClose={() => setRedeemPopup('')}
      />
    </SafeAreaView>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  skeletonWrap: {
    padding: 16,
    gap: 12,
  },
  skeletonBalanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
  },
  skeletonSectionHead: {
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.sm,
  },
  heroIconWrap: {
    alignItems: 'center',
    marginBottom: 14,
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
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: font.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceNum: {
    fontSize: 42,
    fontWeight: font.bold,
    color: colors.text,
    lineHeight: 46,
  },
  balanceUnit: {
    fontSize: 20,
    fontWeight: font.semibold,
    color: colors.muted,
  },
  muted: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 21,
  },
  redeemPanel: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  presetText: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.muted,
  },
  presetTextActive: {
    color: colors.primary,
    fontWeight: font.bold,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  customInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 17,
    color: colors.text,
  },
  redeemHint: {
    fontSize: 14,
    fontWeight: font.semibold,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow.sm,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  ruleIco: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleBody: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
    marginBottom: 2,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  history: {
    gap: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyIco: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
  },
  historyDesc: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
  },
  historyDate: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
  historyPts: {
    fontSize: 17,
    fontWeight: font.bold,
  },
  error: {
    color: colors.danger,
    fontSize: 15,
  },
  success: {
    color: colors.success,
    fontSize: 15,
    fontWeight: font.semibold,
  },
});
