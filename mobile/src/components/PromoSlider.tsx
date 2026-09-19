import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Clipboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { fetchOffers } from '../api/endpoints';
import type { MainStackParamList } from '../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../theme';

interface Promo {
  code: string;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  soft: string;
}

const FALLBACK_ICON: keyof typeof Ionicons.glyphMap = 'pricetag-outline';

type OfferPage = 'Loyalty' | 'EarlyBird' | 'Referral' | null;

function offerTarget(promo: Promo): OfferPage {
  const key = `${promo.title} ${promo.code} ${promo.icon}`.toLowerCase();
  if (/\bloyal/.test(key) || /school/.test(key)) return 'Loyalty';
  if (/early|bird|season|sunny/.test(key)) return 'EarlyBird';
  if (/refer|friend|gift/.test(key)) return 'Referral';
  return null;
}

const CARD_GAP = 12;

function hexToRgb(hex: string): [number, number, number] {
  let m = hex.replace('#', '');
  if (m.length === 3) m = m.split('').map((c) => c + c).join('');
  const v = parseInt(m, 16);
  if (Number.isNaN(v)) return [128, 128, 128];
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(Math.min(255, c * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c + (255 - c) * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export function PromoSlider({ compact = false }: { compact?: boolean } = {}) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(width * (compact ? 0.58 : 0.78));
  const snap = cardWidth + CARD_GAP;

  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Promo | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchOffers()
      .then((offers) => {
        if (!mounted) return;
        setPromos(
          offers.map((o) => ({
            code: o.code,
            title: o.title,
            text: o.description || '',
            icon:
              o.icon && o.icon in Ionicons.glyphMap
                ? (o.icon as keyof typeof Ionicons.glyphMap)
                : FALLBACK_ICON,
            color: o.color || '#3B82F6',
            soft: o.soft || '#E4EEFD',
          }))
        );
      })
      .catch(() => {
        if (mounted) setPromos([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.min(promos.length - 1, Math.round(x / snap)));
    setActive(index);
  }

  if (promos.length === 0) {
    return null;
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snap}
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.list, { paddingRight: width - cardWidth - (compact ? 12 : 20) }]}
      >
        {promos.map((promo) => {
          const target = offerTarget(promo);
          const accent = isDark ? tint(promo.color, 0.3) : promo.color;
          const cardBg = isDark ? shade(promo.soft, 0.22) : promo.soft;
          return (
            <Pressable
              key={promo.code}
              onPress={() => {
                if (target) navigation.navigate(target);
                else setSelected(promo);
              }}
              style={({ pressed }) => [
                styles.card,
                compact && styles.cardCompact,
                { width: cardWidth, backgroundColor: cardBg, borderColor: accent },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <PromoBackdrop color={accent} />
              <View style={[styles.cardIcon, compact && styles.cardIconCompact, { backgroundColor: colors.surface }]}>
                <Ionicons name={promo.icon} size={compact ? 18 : 22} color={accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]} numberOfLines={1}>
                  {promo.title}
                </Text>
                <Text style={[styles.cardText, compact && styles.cardTextCompact]} numberOfLines={compact ? 1 : 2}>
                  {promo.text}
                </Text>
                {!compact ? (
                  <View style={styles.cardFooter}>
                    <View style={styles.codeChip}>
                      <Text style={styles.codeText}>{promo.code}</Text>
                    </View>
                    <View style={styles.cta}>
                      <Text style={styles.ctaText}>{target ? 'View offer' : 'Use code'}</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.text} />
                    </View>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {!compact && promos.length > 1 ? (
        <View style={styles.dots}>
          {promos.map((promo, i) => (
            <View key={promo.code} style={[styles.dot, i === active && styles.dotActive]} />
          ))}
        </View>
      ) : null}

      <PromoDetail promo={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function PromoBackdrop({ color }: { color: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Svg
      style={styles.backdrop}
      viewBox="0 0 300 150"
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none"
    >
      <Circle cx="34" cy="26" r="12" fill="none" stroke={color} strokeWidth="3" opacity="0.28" />
      <Circle cx="34" cy="26" r="24" fill="none" stroke={color} strokeWidth="1.6" opacity="0.18" />
      <Circle cx="34" cy="26" r="36" fill="none" stroke={color} strokeWidth="1" opacity="0.1" />
      <Circle cx="270" cy="118" r="5" fill={color} opacity="0.18" />
      <Circle cx="255" cy="134" r="3" fill={color} opacity="0.14" />
      <G opacity="0.14">
        <Rect x="218" y="40" width="92" height="40" rx="10" fill={color} />
        <Rect x="226" y="43" width="76" height="5" rx="2.5" fill={color} />
        <Rect x="227" y="49" width="17" height="15" rx="3" fill={color} />
        <Rect x="249" y="49" width="14" height="15" rx="2.5" fill={color} />
        <Rect x="267" y="49" width="14" height="15" rx="2.5" fill={color} />
        <Rect x="284" y="49" width="13" height="15" rx="2.5" fill={color} />
        <Rect x="218" y="69" width="92" height="4" fill={color} />
        <Circle cx="238" cy="84" r="7" fill={color} />
        <Circle cx="290" cy="84" r="7" fill={color} />
      </G>
    </Svg>
  );
}

function PromoDetail({ promo, onClose }: { promo: Promo | null; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (!promo) return;
    Clipboard.setString(promo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Modal visible={promo != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {promo ? (
            <>
              <Pressable style={styles.modalClose} onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
              <View style={[styles.modalIcon, { backgroundColor: promo.soft }]}>
                <Ionicons name={promo.icon} size={30} color={promo.color} />
              </View>
              <Text style={styles.modalTitle}>{promo.title}</Text>
              <Text style={styles.modalText}>{promo.text}</Text>
              <View style={styles.modalCodeWrap}>
                <Text style={styles.modalCode}>{promo.code}</Text>
              </View>
              <Pressable
                onPress={copyCode}
                style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={18}
                  color={colors.white}
                />
                <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy code'}</Text>
              </Pressable>
              <Text style={styles.modalHint}>
                Enter this code at checkout to apply the offer.
              </Text>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  wrapCompact: {
    marginBottom: 0,
  },
  list: {
    gap: CARD_GAP,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardCompact: {
    gap: 10,
    borderRadius: radius.md,
    padding: 12,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconCompact: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.text,
  },
  cardTitleCompact: {
    fontSize: 15,
  },
  cardText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  cardTextCompact: {
    fontSize: 12,
    marginTop: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  codeChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  codeText: {
    fontSize: 12,
    fontWeight: font.bold,
    letterSpacing: 0.6,
    color: colors.text,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: font.semibold,
    color: colors.text,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.ink,
    width: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 22,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  modalIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: font.bold,
    color: colors.text,
  },
  modalText: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  modalCodeWrap: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  modalCode: {
    fontSize: 18,
    fontWeight: font.bold,
    letterSpacing: 1.4,
    color: colors.text,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: 26,
    paddingVertical: 12,
    marginTop: 14,
  },
  copyBtnText: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.white,
  },
  modalHint: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 10,
  },
});
