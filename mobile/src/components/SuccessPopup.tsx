import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export function SuccessPopup({
  visible,
  title,
  message,
  onClose,
  autoCloseMs = 2400,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const backdrop = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const draw = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    backdrop.setValue(0);
    card.setValue(0);
    pop.setValue(0);
    draw.setValue(0);

    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(card, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(180),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      Animated.timing(draw, { toValue: 1, duration: 380, useNativeDriver: false }),
    ]).start();

    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [visible, autoCloseMs, onClose, backdrop, card, pop, draw]);

  if (!visible) return null;

  const drawOffset = draw.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={styles.backdropPress} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: card,
              transform: [
                {
                  scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
                },
              ],
            },
          ]}
        >
          <View style={styles.badgeWrap}>
            <Animated.View
              style={[
                styles.badge,
                {
                  transform: [
                    {
                      scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                    },
                  ],
                },
              ]}
            >
              <Svg width="56" height="56" viewBox="0 0 80 80">
                <Circle cx="40" cy="40" r="30" fill="none" stroke={colors.success} strokeWidth="5" />
                <AnimatedPath
                  d="M 26 42 L 36 52 L 55 31"
                  fill="none"
                  stroke={colors.success}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={100}
                  strokeDashoffset={drawOffset as unknown as number}
                />
              </Svg>
            </Animated.View>
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    backdropPress: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.45)',
    },
    card: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      ...shadow.md,
    },
    badgeWrap: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.successSoft,
      marginBottom: 16,
    },
    badge: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 19,
      fontWeight: font.bold,
      color: colors.text,
      textAlign: 'center',
    },
    message: {
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 21,
      marginTop: 6,
    },
    doneBtn: {
      marginTop: 20,
      width: '100%',
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.md,
      backgroundColor: colors.success,
    },
    doneText: {
      fontSize: 16,
      fontWeight: font.bold,
      color: colors.white,
    },
  });
