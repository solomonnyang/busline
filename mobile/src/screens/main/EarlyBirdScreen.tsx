import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import type { LoyaltyRules } from '../../api/types';
import { OfferHeroIcon } from '../../components/OfferHeroIcon';
import { Skeleton, SkeletonCircle } from '../../components/Skeleton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'EarlyBird'>;

const DEFAULT_RULES: LoyaltyRules = {
  loyalty: { points_per_booking: 10, points_value_ngn: 1, min_points_redeem: 10 },
  early_bird: { days: 3, discount_percent: 15 },
  referral: { commission_percent: 10, signup_url: '' },
};

export function EarlyBirdScreen({}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [rules, setRules] = useState<LoyaltyRules>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api
        .fetchOfferRules()
        .then((data) => {
          if (active) setRules(data);
        })
        .catch(() => {
          // keep defaults when rules are unavailable
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.skeletonWrap}>
          <View style={styles.skeletonCard}>
            <SkeletonCircle size={52} style={{ alignSelf: 'center' }} />
            <Skeleton width={150} height={18} style={{ alignSelf: 'center', marginTop: 12 }} />
            <Skeleton width="75%" height={13} style={{ alignSelf: 'center', marginTop: 8 }} />
          </View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={40} height={40} radius={13} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="45%" height={12} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  const days = rules.early_bird.days;
  const percent = rules.early_bird.discount_percent;

  const stepTints: { tint: string; soft: string }[] = [
    { tint: colors.warning, soft: colors.warningSoft },
    { tint: colors.gold, soft: colors.goldSoft },
    { tint: colors.success, soft: colors.successSoft },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <OfferHeroIcon variant="earlybird" />
          </View>
          <Text style={styles.heroTitle}>Early bird discount</Text>
          <Text style={styles.heroSub}>
            Book {days} or more days before departure and save automatically.
          </Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{percent}% off</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="information-circle" size={12} color={colors.warning} />
            <Text style={styles.eyebrow}>How it works</Text>
          </View>
          <View style={styles.steps}>
            <StepRow
              n={1}
              icon="calendar"
              tint={stepTints[0].tint}
              soft={stepTints[0].soft}
              title={`Book ${days}+ days ahead`}
              text={`Pick a trip whose departure is at least ${days} days away.`}
            />
            <StepRow
              n={2}
              icon="sunny"
              tint={stepTints[1].tint}
              soft={stepTints[1].soft}
              title="Discount applied automatically"
              text={`Your fare is reduced by ${percent}% — no promo code needed.`}
            />
            <StepRow
              n={3}
              icon="wallet"
              tint={stepTints[2].tint}
              soft={stepTints[2].soft}
              title="Pay less either way"
              text="The discount works with wallet and online payment, so you always pay the lower price."
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="bulb" size={12} color={colors.warning} />
            <Text style={styles.eyebrow}>Good to know</Text>
          </View>
          <Text style={styles.muted}>
            Planning ahead pays off. When you book early, the {percent}% discount is shown on your
            booking and taken off the total before you pay.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepRow({
  n,
  icon,
  tint,
  soft,
  title,
  text,
}: {
  n: number;
  icon: 'calendar' | 'sunny' | 'wallet';
  tint: string;
  soft: string;
  title: string;
  text: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepNum, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={17} color={tint} />
        <Text style={[styles.stepN, { color: tint }]}>0{n}</Text>
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
  skeletonRow: {
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
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  heroBadgeText: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.warning,
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
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: font.bold,
    color: colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  muted: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 21,
  },
  steps: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepN: {
    fontSize: 9,
    fontWeight: font.bold,
    color: colors.warning,
    marginTop: 1,
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
});
