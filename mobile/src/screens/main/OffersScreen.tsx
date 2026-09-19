import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import type { LoyaltyRules } from '../../api/types';
import { RewardsHeroArt } from '../../components/RewardsHeroArt';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'Offers'>;

type IconName = ComponentProps<typeof Ionicons>['name'];

const DEFAULT_RULES: LoyaltyRules = {
  loyalty: { points_per_booking: 10, points_value_ngn: 1, min_points_redeem: 10 },
  early_bird: { days: 3, discount_percent: 15 },
  referral: { commission_percent: 10, signup_url: '' },
};

export function OffersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [rules, setRules] = useState<LoyaltyRules>(DEFAULT_RULES);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api
        .fetchOfferRules()
        .then((data) => {
          if (active) setRules(data);
        })
        .catch(() => {
          // keep the defaults when the rules endpoint is unavailable
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const offers: {
    key: 'Loyalty' | 'EarlyBird' | 'Referral';
    icon: IconName;
    title: string;
    sub: string;
    badge: string;
    tint: keyof ThemeColors;
    tintSoft: keyof ThemeColors;
  }[] = [
    {
      key: 'Loyalty',
      icon: 'star',
      title: 'Loyalty points',
      sub: 'Earn points on every paid trip and redeem them for wallet credit.',
      badge: `${rules.loyalty.points_per_booking} pts / paid booking`,
      tint: 'primary',
      tintSoft: 'primarySoft',
    },
    {
      key: 'EarlyBird',
      icon: 'sunny',
      title: 'Early bird discount',
      sub: 'Book ahead of time and save automatically on your fare.',
      badge: `Up to ${rules.early_bird.discount_percent}% off`,
      tint: 'warning',
      tintSoft: 'warningSoft',
    },
    {
      key: 'Referral',
      icon: 'gift',
      title: 'Refer & earn',
      sub: 'Invite friends to ride and earn cash when they book.',
      badge: `${rules.referral.commission_percent}% of their first fare`,
      tint: 'gold',
      tintSoft: 'goldSoft',
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.primarySoft, colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroInner}
          >
            <RewardsHeroArt />
          </LinearGradient>
        </View>

        <View style={styles.menu}>
          {offers.map((offer, i) => (
            <Pressable
              key={offer.key}
              onPress={() => navigation.navigate(offer.key)}
              style={({ pressed }) => [
                styles.row,
                i === offers.length - 1 && styles.rowLast,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors[offer.tintSoft] }]}>
                <Ionicons name={offer.icon} size={20} color={colors[offer.tint]} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{offer.title}</Text>
                <Text style={styles.rowSub} numberOfLines={2}>
                  {offer.sub}
                </Text>
                <View style={styles.rowBadge}>
                  <Text style={styles.rowBadgeText}>{offer.badge}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  hero: {
    marginBottom: 14,
  },
  heroInner: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    alignItems: 'center',
    ...shadow.sm,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    backgroundColor: colors.primarySoft,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.text,
  },
  rowSub: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 19,
  },
  rowBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 8,
  },
  rowBadgeText: {
    fontSize: 12,
    fontWeight: font.bold,
    color: colors.primary,
  },
});
