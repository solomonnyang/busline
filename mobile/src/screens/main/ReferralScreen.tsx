import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import type { LoyaltyOverview } from '../../api/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { OfferHeroIcon } from '../../components/OfferHeroIcon';
import { Skeleton, SkeletonCircle } from '../../components/Skeleton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';
import { formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<MainStackParamList, 'Referral'>;

export function ReferralScreen({}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const referralCode = overview?.referral_code ?? '';
  const referralLink = overview?.referral_link ?? '';
  const commissionEarned = Number(overview?.commission_earned ?? 0);
  const percent = Number(overview?.rules?.referral?.commission_percent ?? 10);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.fetchLoyaltyOverview();
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load referrals.');
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

  async function shareReferral(codeOnly: boolean) {
    const message = codeOnly
      ? `My BusLine referral code is ${referralCode}`
      : `Travel with me on BusLine and get rewarded! Use my referral code ${referralCode}.`;
    try {
      await Share.share(
        codeOnly
          ? { title: 'My BusLine referral code', message }
          : { title: 'Join me on BusLine', message, url: referralLink }
      );
    } catch {
      // user dismissed the share sheet or sharing is unavailable
    }
  }

  function copyCode() {
    shareReferral(true);
    setActionMsg('Share your code with friends so they can use it at sign up.');
    setTimeout(() => setActionMsg(''), 3000);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.skeletonWrap}>
          <View style={styles.skeletonCard}>
            <SkeletonCircle size={52} style={{ alignSelf: 'center' }} />
            <Skeleton width={140} height={18} style={{ alignSelf: 'center', marginTop: 12 }} />
            <Skeleton width="70%" height={13} style={{ alignSelf: 'center', marginTop: 8 }} />
            <Skeleton width="80%" height={46} radius={12} style={{ alignSelf: 'center', marginTop: 18 }} />
          </View>
          <View style={styles.skeletonSectionHead}>
            <Skeleton width={120} height={15} />
            <Skeleton width={70} height={15} />
          </View>
          {[0, 1, 2].map((i) => (
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
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <OfferHeroIcon variant="referral" />
          </View>
          <Text style={styles.heroTitle}>Refer &amp; earn</Text>
          <Text style={styles.heroSub}>
            Share your link — when a friend makes their first paid booking, you earn {percent}% of
            their fare.
          </Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Earn {percent}% of their first fare</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="link" size={12} color={colors.primary} />
            <Text style={[styles.eyebrow, { color: colors.primary }]}>Your referral code</Text>
          </View>
          <View style={styles.codeRow}>
            <Text style={styles.code} selectable>
              {referralCode}
            </Text>
            <Pressable
              onPress={copyCode}
              style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Ionicons name="copy-outline" size={16} color={colors.text} />
            </Pressable>
          </View>
          {actionMsg ? <Text style={styles.actionMsg}>{actionMsg}</Text> : null}
          <PrimaryButton
            label="Share referral link"
            icon="share-outline"
            variant="outline"
            onPress={() => void shareReferral(false)}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="people" size={12} color={colors.gold} />
            <Text style={[styles.eyebrow, { color: colors.gold }]}>Your referrals</Text>
          </View>
          {!overview || overview.referrals.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={30} color={colors.teal} />
              <Text style={styles.muted}>
                No referrals yet. Share your link to start earning.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.referralsHead}>
                <Text style={styles.referralsTitle}>Total earned</Text>
                <Text style={styles.referralsEarned}>₦{formatPrice(commissionEarned)}</Text>
              </View>
              <View style={styles.referrals}>
                {overview.referrals.map((r) => (
                  <View key={r.id} style={styles.referralRow}>
                    <Text style={styles.referralName} numberOfLines={1}>
                      {r.referred_name || 'A friend'}
                    </Text>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: r.status === 'qualified' ? colors.successSoft : colors.surfaceAlt },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: r.status === 'qualified' ? colors.success : colors.muted },
                        ]}
                      >
                        {r.status === 'qualified'
                          ? `Qualified · ₦${formatPrice(r.commission_amount)}`
                          : 'Registered'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="information-circle" size={12} color={colors.muted} />
            <Text style={styles.eyebrow}>How it works</Text>
          </View>
          <View style={styles.steps}>
            <StepRow icon="share-social" tint={colors.gold} soft={colors.goldSoft} title="Share your code" text="Send your referral code or link to friends." />
            <StepRow icon="person-add" tint={colors.primary} soft={colors.primarySoft} title="They sign up" text="Your friend registers with your code." />
            <StepRow icon="cash" tint={colors.success} soft={colors.successSoft} title="You earn" text="Once they pay for their first trip, you earn a commission." />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepRow({
  icon,
  tint,
  soft,
  title,
  text,
}: {
  icon: 'share-social' | 'person-add' | 'cash';
  tint: string;
  soft: string;
  title: string;
  text: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepIco, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.muted}>{text}</Text>
      </View>
    </View>
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
  skeletonCard: {
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
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 22,
    alignItems: 'center',
    ...shadow.sm,
  },
  heroIconWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: font.bold,
    color: colors.text,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 21,
  },
  heroBadge: {
    marginTop: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  heroBadgeText: {
    fontSize: 15,
    fontWeight: font.bold,
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
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: font.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  muted: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 21,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  code: {
    flex: 1,
    fontSize: 18,
    fontWeight: font.bold,
    letterSpacing: 2,
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMsg: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 10,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  referralsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  referralsTitle: {
    fontSize: 15,
    fontWeight: font.bold,
    color: colors.text,
  },
  referralsEarned: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.success,
  },
  referrals: {
    gap: 10,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  referralName: {
    flex: 1,
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
  },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: font.bold,
  },
  steps: {
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepIco: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
    marginBottom: 2,
  },
  error: {
    color: colors.danger,
    fontSize: 15,
  },
});
