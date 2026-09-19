import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Rect } from 'react-native-svg';
import { radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../theme';

export type OfferHeroVariant = 'loyalty' | 'earlybird' | 'referral';

interface Props {
  variant: OfferHeroVariant;
  size?: number;
  neutral?: boolean;
}

const ACCENT: Record<OfferHeroVariant, keyof ThemeColors> = {
  loyalty: 'primary',
  earlybird: 'warning',
  referral: 'gold',
};

const SOFT: Record<OfferHeroVariant, keyof ThemeColors> = {
  loyalty: 'primarySoft',
  earlybird: 'warningSoft',
  referral: 'goldSoft',
};

export function OfferHeroIcon({ variant, size = 104, neutral = false }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const accent = neutral ? colors.text : colors[ACCENT[variant]];
  const soft = neutral ? colors.surfaceAlt : colors[SOFT[variant]];

  return (
    <LinearGradient
      colors={[soft, colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 96 96">
        {variant === 'loyalty' && <LoyaltyArt color={accent} white={colors.white} />}
        {variant === 'earlybird' && <EarlyBirdArt color={accent} white={colors.white} />}
        {variant === 'referral' && <ReferralArt colors={colors} accent={accent} white={colors.white} />}
      </Svg>
    </LinearGradient>
  );
}

function LoyaltyArt({ color, white }: { color: string; white: string }) {
  return (
    <>
      <Circle cx="48" cy="52" r="30" fill={color} opacity="0.12" />
      <Polygon
        points="48,24 54.9,42.2 74.3,43.1 59,55.6 64.4,74.5 48,63.2 31.6,74.5 37,55.6 21.7,43.1 41.1,42.2"
        fill={color}
      />
      <Polygon points="48,40 50,44.6 54.9,45 51,48 52.2,52.9 48,50.3 43.8,52.9 45,48 41.1,45 46,44.6" fill={white} opacity="0.6" />
      <Polygon
        points="20,21 22.1,26.2 27.7,26.5 23.4,29.6 24.8,35 20,31.8 15.2,35 16.6,29.6 12.3,26.5 17.9,26.2"
        fill={color}
        opacity="0.75"
      />
      <Polygon
        points="72,69 73.6,72.6 77.5,72.8 74.6,75 75.5,78.8 72,76.7 68.5,78.8 69.4,75 66.5,72.8 70.4,72.6"
        fill={color}
        opacity="0.55"
      />
      <Path d="M78 21 v10 M73 26 h10" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </>
  );
}

function EarlyBirdArt({ color, white }: { color: string; white: string }) {
  const rays: [number, number][] = [
    [48, 19],
    [68.5, 27.5],
    [77, 48],
    [68.5, 68.5],
    [48, 77],
    [27.5, 68.5],
    [19, 48],
    [27.5, 27.5],
  ];
  return (
    <>
      <Circle cx="48" cy="48" r="30" fill={color} opacity="0.12" />
      {rays.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r="4.5" fill={color} opacity="0.55" />
      ))}
      <Circle cx="48" cy="48" r="19" fill={color} />
      <Circle cx="48" cy="48" r="11" fill={white} opacity="0.28" />
      <Circle cx="43" cy="42" r="4" fill={white} opacity="0.6" />
      <G fill={white} opacity="0.5">
        <Rect x="16" y="67" width="30" height="12" rx="6" />
        <Circle cx="27" cy="65" r="7" />
        <Circle cx="37" cy="67" r="8" />
      </G>
    </>
  );
}

function ReferralArt({ colors, accent, white }: { colors: ThemeColors; accent: string; white: string }) {
  return (
    <>
      <Circle cx="48" cy="48" r="30" fill={accent} opacity="0.12" />
      <Rect x="24" y="45" width="48" height="30" rx="6" fill={accent} />
      <Rect x="44" y="45" width="8" height="30" fill={white} opacity="0.85" />
      <Rect x="20" y="34" width="56" height="11" rx="5" fill={accent} />
      <Rect x="44" y="34" width="8" height="11" fill={white} opacity="0.85" />
      <Circle cx="36" cy="28" r="6" fill={white} />
      <Circle cx="52" cy="28" r="6" fill={white} />
      <Circle cx="44" cy="30" r="4" fill={white} />
      <Circle cx="20" cy="24" r="2.5" fill={colors.accentBlue} />
      <Circle cx="76" cy="26" r="2.5" fill={colors.accentPink} />
      <Circle cx="74" cy="72" r="2.5" fill={colors.success} />
      <Circle cx="22" cy="70" r="2" fill={colors.accentPurple} />
      <Circle cx="70" cy="58" r="2" fill={colors.accentBlue} opacity="0.6" />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tile: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      ...shadow.sm,
    },
  });
