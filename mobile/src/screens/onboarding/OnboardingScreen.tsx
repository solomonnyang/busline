import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingIllustration } from '../../components/OnboardingIllustration';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

const ONBOARDING_KEY = 'busline.onboarded';

const SLIDES: {
  variant: 'map' | 'booking' | 'travel';
  title: string;
  subtitle: string;
}[] = [
  {
    variant: 'map',
    title: 'Travel Smarter with Busline',
    subtitle: 'Discover bus routes, compare schedules, and plan your journey with ease.',
  },
  {
    variant: 'booking',
    title: 'Book Your Bus in Seconds',
    subtitle: 'Find available buses, choose your seat, and secure your ticket quickly and conveniently.',
  },
  {
    variant: 'travel',
    title: 'Your Journey Starts Here',
    subtitle: 'Create your Busline account and enjoy a simpler, safer way to travel.',
  },
];

type Props = { onDone: () => void };

export function OnboardingScreen({ onDone }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<Animated.FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(0)).current;
  const isLast = index === SLIDES.length - 1;
  const illuSize = Math.min(width * 0.92, 430, screenHeight * 0.5);

  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const i = Math.round(value / width);
      setIndex((prev) => (i !== prev ? i : prev));
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, width]);

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [intro]);

  const finish = useCallback(() => {
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {
      // ignore storage failures
    });
    onDone();
  }, [onDone]);

  const next = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
  }, [index, isLast, finish]);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
  });

  const introStyle = (out: number[]) => ({
    opacity: intro,
    transform: [
      {
        translateY: intro.interpolate({ inputRange: [0, 1], outputRange: out }),
      },
    ],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="dark" />
      <View style={styles.pager}>
        <Animated.FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item, index: i }) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.86, 1, 0.86],
            extrapolate: 'clamp',
          });
          const iconY = scrollX.interpolate({
            inputRange,
            outputRange: [26, 0, -26],
            extrapolate: 'clamp',
          });
          const textOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          const titleY = scrollX.interpolate({
            inputRange,
            outputRange: [22, 0, -22],
            extrapolate: 'clamp',
          });
          const subY = scrollX.interpolate({
            inputRange,
            outputRange: [16, 0, -16],
            extrapolate: 'clamp',
          });
          return (
            <View style={[styles.slide, { width }]}>
              <View style={styles.tealPanel}>
                <View style={styles.panelFade} />
                <Animated.View
                  style={[styles.illuWrap, { opacity: textOpacity, transform: [{ translateY: iconY }, { scale }] }]}
                >
                  <OnboardingIllustration variant={item.variant} size={illuSize} />
                </Animated.View>
              </View>
              <View style={styles.textBlock}>
                <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: titleY }] }}>
                  <Text style={styles.title}>{item.title}</Text>
                </Animated.View>
                <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: subY }] }}>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                </Animated.View>
              </View>
            </View>
          );
        }}
      />
        <Animated.View style={[styles.topRow, { paddingTop: insets.top + 8 }, introStyle([-10, 0])]}>
          {!isLast ? (
            <Pressable onPress={finish} hitSlop={12}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, introStyle([16, 0])]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const dotScale = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [1, 3, 1],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? colors.teal : colors.border,
                    transform: [{ scaleX: dotScale }],
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.ctaWrap}>
          <Pressable onPress={next} hitSlop={12} style={styles.nextLink}>
            <Text style={styles.nextLabel}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text} />
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    pager: {
      flex: 1,
    },
    topRow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingHorizontal: 24,
      alignItems: 'flex-end',
    },
    skip: {
      fontSize: 16,
      fontWeight: font.semibold,
      color: colors.text,
    },
    slide: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    tealPanel: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
      overflow: 'hidden',
      paddingHorizontal: 0,
    },
    panelFade: {
      position: 'absolute',
      top: -60,
      left: -40,
      width: 220,
      height: 220,
      borderRadius: radius.pill,
      backgroundColor: colors.tealSoft,
      opacity: 0.5,
    },
    illuWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    textBlock: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: 28,
      marginTop: -14,
      paddingBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: font.bold,
      color: colors.text,
      textAlign: 'left',
      lineHeight: 36,
      maxWidth: 340,
    },
    subtitle: {
      fontSize: 17,
      color: colors.muted,
      textAlign: 'left',
      marginTop: 12,
      lineHeight: 26,
      maxWidth: 340,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingBottom: 12,
    },
    ctaWrap: {
      width: 'auto',
      maxWidth: 240,
    },
    nextLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nextLabel: {
      fontSize: 17,
      fontWeight: font.semibold,
      color: colors.text,
    },
    dots: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
    },
  });