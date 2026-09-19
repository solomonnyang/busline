import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainStackParamList } from '../navigation/types';
import { AssistantMark } from '../screens/main/AgentChatScreen';
import { shadow, useTheme, useThemedStyles, type ThemeColors } from '../theme';

export const WIDGET_SIZE = 56;
const WIDGET_EDGE = 16;

export function AiWidget({ tabBarHeight }: { tabBarHeight: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const minY = insets.top + WIDGET_EDGE;
  const maxY = height - WIDGET_SIZE - insets.bottom - WIDGET_EDGE;
  const startX = width - WIDGET_SIZE - WIDGET_EDGE;
  const startY = Math.min(height - tabBarHeight - WIDGET_SIZE - WIDGET_EDGE, maxY);

  const position = useRef(new Animated.ValueXY({ x: startX, y: startY })).current;
  const offset = useRef({ x: startX, y: startY });
  const current = useRef({ x: startX, y: startY });
  const moved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        offset.current = { ...current.current };
        moved.current = false;
      },
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dx) + Math.abs(g.dy) > 6) moved.current = true;
        const x = offset.current.x + g.dx;
        const y = offset.current.y + g.dy;
        current.current = { x, y };
        position.setValue({ x, y });
      },
      onPanResponderRelease: () => {
        if (!moved.current) {
          navigation.navigate('AgentChat');
          return;
        }
        const sx = current.current.x < width / 2 ? WIDGET_EDGE : width - WIDGET_SIZE - WIDGET_EDGE;
        const sy = Math.min(Math.max(current.current.y, minY), maxY);
        Animated.spring(position, {
          toValue: { x: sx, y: sy },
          friction: 7,
          tension: 60,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.widget,
          { transform: [{ translateX: position.x }, { translateY: position.y }] },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { borderColor: colors.primary, opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
        <View style={[styles.bubble, { backgroundColor: colors.surfaceElevated }]}>
          <AssistantMark size={30} />
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    widget: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: WIDGET_SIZE,
      height: WIDGET_SIZE,
    },
    ring: {
      position: 'absolute',
      width: WIDGET_SIZE,
      height: WIDGET_SIZE,
      borderRadius: WIDGET_SIZE / 2,
      borderWidth: 2,
    },
    bubble: {
      width: WIDGET_SIZE,
      height: WIDGET_SIZE,
      borderRadius: WIDGET_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.md,
    },
  });