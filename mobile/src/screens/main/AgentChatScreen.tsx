import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { ComponentProps } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import type { AgentCard, AgentMessage } from '../../api/types';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'AgentChat'>;

type IconName = ComponentProps<typeof Ionicons>['name'];

const GEMINI_GRADIENT: [string, string, string] = ['#F97316', '#F59E0B', '#FBBF24'];

const ASSISTANT_BUBBLE_PATH =
  'M44 18 L156 18 C172 18 186 32 186 48 L186 96 C186 112 172 126 156 126 L92 126 L56 168 L56 126 L44 126 C28 126 14 112 14 96 L14 48 C14 32 28 18 44 18 Z';

const ASSISTANT_SPARK_PATH =
  'M100 44 C104 62 112 70 130 74 C112 78 104 86 100 104 C96 86 88 78 70 74 C88 70 96 62 100 44 Z';

export function AssistantMark({ size }: { size: number }) {
  return (
    <Svg key="assistant-mark" width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <SvgLinearGradient id="assistant-mark" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#F97316" />
          <Stop offset="100%" stopColor="#F59E0B" />
        </SvgLinearGradient>
      </Defs>
      <Path d={ASSISTANT_BUBBLE_PATH} fill="url(#assistant-mark)" />
      <Path d={ASSISTANT_SPARK_PATH} fill="#FFFFFF" />
    </Svg>
  );
}

let glowBlobUid = 0;

function GlowBlob({
  color,
  x,
  y,
  radius,
  duration,
  dx,
  dy,
  baseOpacity,
  opacityAmp,
}: {
  color: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  dx: number;
  dy: number;
  baseOpacity: number;
  opacityAmp: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const gradientId = useRef(`glow-${++glowBlobUid}`).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [progress, duration]);

  const translateX = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dx, 0] });
  const translateY = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dy, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.3, 1] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [baseOpacity, baseOpacity + opacityAmp, baseOpacity],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x - radius,
          top: y - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <Stop offset="60%" stopColor={color} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

function GlowBackground() {
  const { isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  const blobs: Array<{
    color: string;
    x: number;
    y: number;
    radius: number;
    duration: number;
    dx: number;
    dy: number;
    baseOpacity: number;
    opacityAmp: number;
  }> = [
    { color: '#F97316', x: width * 0.2, y: height * 0.1, radius: 150, duration: 9000, dx: 70, dy: 40, baseOpacity: isDark ? 0.24 : 0.3, opacityAmp: 0.2 },
    { color: '#F59E0B', x: width * 0.8, y: height * 0.24, radius: 140, duration: 11000, dx: -60, dy: 55, baseOpacity: isDark ? 0.2 : 0.26, opacityAmp: 0.18 },
    { color: '#b45309', x: width * 0.5, y: height * 0.85, radius: 150, duration: 10000, dx: 55, dy: -45, baseOpacity: isDark ? 0.18 : 0.24, opacityAmp: 0.18 },
    { color: '#FBBF24', x: width * 0.7, y: height * 0.72, radius: 120, duration: 12000, dx: -45, dy: -35, baseOpacity: isDark ? 0.14 : 0.2, opacityAmp: 0.16 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {blobs.map((blob, i) => (
        <GlowBlob key={i} {...blob} />
      ))}
    </View>
  );
}

type Entry =
  | {
      id: string;
      kind: 'user' | 'assistant';
      text: string;
      cards: AgentCard[];
      streaming: boolean;
      error?: boolean;
    }
  | { id: string; kind: 'typing' };

const QUICK_PROMPTS = [
  'Show my bookings',
  'What is my wallet balance?',
  'Find trips from Lagos to Abuja',
  'My support tickets',
];

const CHIP_COLORS = ['#F97316', '#F59E0B', '#D97706', '#b45309'];

const CARD_ICON: Record<AgentCard['type'], IconName> = {
  booking: 'ticket-outline',
  ticket: 'qr-code-outline',
  trip: 'bus-outline',
  wallet: 'wallet-outline',
  offers: 'gift-outline',
  support: 'headset-outline',
  terminal: 'location-outline',
  bus: 'bus-outline',
  seatmap: 'grid-outline',
  confirm: 'checkmark-circle-outline',
  payment: 'cash-outline',
  paystack: 'card-outline',
};

export function AgentChatScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [kbInset, setKbInset] = useState(0);
  const [kbOpen, setKbOpen] = useState(false);
  const historyRef = useRef<AgentMessage[]>([]);
  const sendingRef = useRef(false);
  const listRef = useRef<FlatList<Entry>>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKbOpen(true);
      if (Platform.OS === 'android') setKbInset(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKbOpen(false);
      setKbInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const reveal = useCallback((id: string, full: string, cards: AgentCard[]) => {
    const words = full.split(' ');
    if (words.length === 0) {
      setEntries((e) =>
        e.map((x) => (x.id === id && x.kind === 'assistant' ? { ...x, text: '', cards, streaming: false } : x))
      );
      return;
    }

    let i = 0;
    const timer = setInterval(() => {
      i += 3;
      const text = words.slice(0, i).join(' ');
      setEntries((e) =>
        e.map((x) => (x.id === id && x.kind === 'assistant' ? { ...x, text, cards } : x))
      );
      if (i >= words.length) {
        clearInterval(timer);
        setEntries((e) =>
          e.map((x) =>
            x.id === id && x.kind === 'assistant' ? { ...x, text: full, cards, streaming: false } : x
          )
        );
      }
    }, 24);
  }, []);

  async function sendMessage(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sendingRef.current) return;
    sendingRef.current = true;
    setInput('');
    Keyboard.dismiss();

    const history = historyRef.current;
    const userEntry: Entry = {
      id: `u-${Date.now()}`,
      kind: 'user',
      text: message,
      cards: [],
      streaming: false,
    };
    setEntries((e) => [...e, userEntry, { id: `typing-${Date.now()}`, kind: 'typing' }]);
    setSending(true);

    const nextHistory: AgentMessage[] = [...history, { role: 'user', content: message }];
    const sentAt = Date.now();
    try {
      const res = await api.agentChat(nextHistory);
      const assistantMessage: AgentMessage = { role: 'assistant', content: res.reply };
      historyRef.current = [...nextHistory, assistantMessage];
      const elapsed = Date.now() - sentAt;
      const minTyping = 1600 + Math.min(1200, res.reply.length / 4);
      if (elapsed < minTyping) {
        await new Promise((r) => setTimeout(r, minTyping - elapsed));
      }
      const aid = `a-${Date.now()}`;
      setEntries((e) => [
        ...e.filter((x) => x.kind !== 'typing'),
        { id: aid, kind: 'assistant', text: '', cards: res.cards, streaming: true },
      ]);
      reveal(aid, res.reply, res.cards);
    } catch (err) {
      historyRef.current = nextHistory;
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setEntries((e) => [
        ...e.filter((x) => x.kind !== 'typing'),
        {
          id: `a-${Date.now()}`,
          kind: 'assistant',
          text: msg,
          cards: [],
          streaming: false,
          error: true,
        },
      ]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const clearChat = useCallback(() => {
    historyRef.current = [];
    setEntries([]);
    setInput('');
  }, []);

  function openCard(card: AgentCard) {
    switch (card.type) {
      case 'booking':
        if (card.id) navigation.navigate('BookingDetail', { id: card.id });
        break;
      case 'ticket':
        if (card.id) navigation.navigate('Ticket', { id: card.id });
        break;
      case 'trip':
        if (card.originId && card.destinationId && card.originName && card.destinationName) {
          navigation.navigate('Results', {
            originId: card.originId,
            destinationId: card.destinationId,
            originName: card.originName,
            destinationName: card.destinationName,
          });
        }
        break;
      case 'wallet':
        navigation.navigate('Payment');
        break;
      case 'offers':
        navigation.navigate('Offers');
        break;
      case 'support':
        if (card.id) navigation.navigate('TicketThread', { id: card.id });
        break;
    }
  }

  const renderItem = useCallback(
    ({ item }: { item: Entry }) => {
      if (item.kind === 'typing') {
        return <TypingBubble />;
      }
      if (item.kind === 'user') {
        return (
          <View style={[styles.row, styles.rowUser]}>
            <View style={styles.bubbleUser}>
              <Text style={styles.bubbleUserText}>{item.text}</Text>
            </View>
          </View>
        );
      }
      return (
        <View style={[styles.row, styles.rowAssistant]}>
          <View style={styles.assistantBody}>
            {item.error ? (
              <View style={styles.bubbleAssistantError}>
                <Text style={styles.bubbleAssistantErrorText}>{item.text}</Text>
              </View>
            ) : (
              <View style={styles.bubbleAssistant}>
                <Text style={styles.bubbleAssistantText}>
                  {item.text}
                  {item.streaming ? ' ▍' : ''}
                </Text>
              </View>
            )}
            {item.cards.length > 0 ? (
              <View style={styles.cards}>
                {item.cards.map((card) => (
                  <AgentCardRow
                    key={`${card.type}-${card.id ?? card.title}`}
                    card={card}
                    onPress={openCard}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      );
    },
    [styles]
  );

  const bottomPadding = useMemo(
    () => Math.max(insets.bottom, 12),
    [insets.bottom]
  );

  return (
    <View style={styles.safe}>
      <GlowBackground />
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerLeft}>
          <AssistantMark size={24} />
          <Text style={styles.headerTitle}>BusLine AI</Text>
        </View>
        {entries.length > 0 ? (
          <Pressable
            onPress={clearChat}
            hitSlop={8}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <LinearGradient
        colors={GEMINI_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.hairline}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={entries}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          contentContainerStyle={[styles.list, entries.length === 0 && styles.listEmpty]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (entries.length > 0) scrollToBottom(false);
          }}
          ListHeaderComponent={
            entries.length === 0 ? <Welcome onPrompt={(p) => void sendMessage(p)} /> : null
          }
          renderItem={renderItem}
        />

        {entries.length > 0 ? (
          <View style={[styles.composerWrap, { paddingBottom: kbOpen ? (kbInset || 12) : bottomPadding }]}>
            <View style={styles.composer}>
              <View style={styles.composerBox}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  style={styles.composerInput}
                  multiline
                  maxLength={1000}
                  onSubmitEditing={() => void sendMessage()}
                  returnKeyType="send"
                />
                {input.trim() && !sending ? (
                  <Pressable onPress={() => void sendMessage()} style={styles.sendBtnWrap}>
                    <LinearGradient
                      colors={GEMINI_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sendBtn}
                    >
                      <Ionicons name="arrow-up" size={20} color="#fff" />
                    </LinearGradient>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

function Welcome({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [q, setQ] = useState('');

  const submit = () => {
    const value = q.trim();
    if (!value) return;
    setQ('');
    onPrompt(value);
  };

  return (
    <View style={styles.welcome}>
      <View
        style={[
          styles.welcomeAvatar,
          { backgroundColor: isDark ? '#14312D' : colors.primarySoft },
        ]}
      >
        <AssistantMark size={56} />
      </View>
      <Text style={styles.welcomeTitle}>BusLine AI</Text>
      <Text style={styles.welcomeSub}>Ask about your bookings, wallet or trips.</Text>
      <View style={styles.chips}>
        {QUICK_PROMPTS.map((p, i) => {
          const color = CHIP_COLORS[i % CHIP_COLORS.length];
          return (
            <Pressable
              key={p}
              onPress={() => onPrompt(p)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isDark ? `${color}33` : `${color}1A`,
                },
                pressed && { backgroundColor: isDark ? `${color}55` : `${color}33` },
              ]}
            >
              <Text style={[styles.chipText, { color }]}>{p}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.welcomeSearch}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="What are you up to…"
          placeholderTextColor={colors.mutedLight}
          style={styles.welcomeSearchInput}
          multiline
          onSubmitEditing={submit}
          returnKeyType="send"
        />
        {q.trim() ? (
          <Pressable onPress={submit} style={styles.welcomeSearchBtn}>
            <LinearGradient
              colors={GEMINI_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeSearchSend}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function TypingBubble() {
  const styles = useThemedStyles(createStyles);
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={styles.typingRow}>
      <View style={styles.bubbleTyping}>
        {[0, 1, 2].map((i) => (
          <Animated.View key={i} style={[styles.typingDot, { opacity }]} />
        ))}
      </View>
    </View>
  );
}

function AgentCardRow({ card, onPress }: { card: AgentCard; onPress: (card: AgentCard) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const icon = CARD_ICON[card.type];

  return (
    <Pressable
      onPress={() => onPress(card)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {card.title}
        </Text>
        {card.subtitle ? (
          <Text style={styles.cardSub} numberOfLines={1}>
            {card.subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedLight} />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'transparent',
      paddingHorizontal: 18,
      paddingBottom: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    clearBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearBtnPressed: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
    },
    hairline: {
      height: 3,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: font.bold,
      color: colors.text,
    },
    flex: {
      flex: 1,
    },
    list: {
      padding: 18,
      paddingBottom: 24,
    },
    listEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    welcome: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 12,
    },
    welcomeAvatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    welcomeTitle: {
      fontSize: 32,
      fontWeight: font.bold,
      color: colors.text,
      textAlign: 'center',
    },
    welcomeSub: {
      fontSize: 17,
      lineHeight: 25,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 320,
    },
    welcomeSearch: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 360,
      marginTop: 10,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      ...shadow.sm,
    },
    welcomeSearchInput: {
      flex: 1,
      fontSize: 18,
      color: colors.text,
      paddingVertical: 2,
    },
    welcomeSearchBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeSearchSend: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignSelf: 'stretch',
      justifyContent: 'flex-start',
      gap: 8,
      marginTop: 20,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    chipText: {
      fontSize: 16,
      fontWeight: font.semibold,
    },
    row: {
      marginBottom: 10,
    },
    rowUser: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    rowAssistant: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    bubbleUser: {
      maxWidth: '80%',
      backgroundColor: colors.teal,
      borderRadius: 18,
      borderBottomRightRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      ...shadow.sm,
    },
    bubbleUserText: {
      fontSize: 18,
      lineHeight: 24,
      color: colors.white,
    },
    assistantBody: {
      flex: 1,
      alignItems: 'flex-start',
    },
    bubbleAssistant: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      borderBottomLeftRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      ...shadow.sm,
    },
    bubbleAssistantError: {
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    bubbleAssistantErrorText: {
      fontSize: 17,
      lineHeight: 24,
      color: colors.danger,
    },
    bubbleAssistantText: {
      fontSize: 18,
      lineHeight: 27,
      color: colors.text,
    },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 2,
    },
    bubbleTyping: {
      flexDirection: 'row',
      gap: 5,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      borderBottomLeftRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      ...shadow.sm,
    },
    typingDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.teal,
    },
    cards: {
      marginTop: 10,
      width: '100%',
      gap: 8,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    cardPressed: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    cardIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: font.bold,
      color: colors.text,
    },
    cardSub: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 1,
    },
    composerWrap: {
      backgroundColor: 'transparent',
    },
    composer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
    },
    composerBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 6,
      paddingHorizontal: 8,
      ...shadow.sm,
    },
    composerInput: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 18,
      color: colors.text,
    },
    composerSideBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
