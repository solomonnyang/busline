import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  type MessageReaction,
  type SupportTicketDetail,
  type SupportTicketMessage,
} from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { Skeleton, SkeletonCircle } from '../../components/Skeleton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'TicketThread'>;

const POLL_MS = 5000;

const KEYBOARD_TOOLBAR_BUFFER = 20;

const WA_LIGHT = {
  bg: '#F7F7F7',
  bubbleIn: '#7C6BE0',
  bubbleOut: '#FFFFFF',
  textIn: '#FFFFFF',
  textOut: '#111111',
  timeIn: 'rgba(255, 255, 255, 0.75)',
  timeOut: 'rgba(17, 27, 33, 0.5)',
  tick: '#FFFFFF',
  dateBg: 'rgba(255, 255, 255, 0.9)',
  dateText: '#6B6B6B',
};

const WA_DARK = {
  bg: '#141414',
  bubbleIn: '#7C6BE0',
  bubbleOut: '#222222',
  textIn: '#FFFFFF',
  textOut: '#F2F2F2',
  timeIn: 'rgba(255, 255, 255, 0.7)',
  timeOut: 'rgba(242, 242, 242, 0.6)',
  tick: '#FFFFFF',
  dateBg: '#222222',
  dateText: '#9A9A9A',
};

type WaColors = typeof WA_LIGHT;

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

type ThreadItem =
  | { kind: 'date'; key: string; value: string }
  | { kind: 'msg'; key: string; value: SupportTicketMessage };

function isAdminMessage(m: SupportTicketMessage): boolean {
  return Number(m.is_admin) === 1;
}

function isTyping(data: SupportTicketDetail): boolean {
  if (data.status === 'closed' || data.messages.length === 0) return false;
  const last = data.messages[data.messages.length - 1];
  return !isAdminMessage(last);
}

function sameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const da = new Date(String(a).replace(' ', 'T') + 'Z');
  const db = new Date(String(b).replace(' ', 'T') + 'Z');
  return !isNaN(da.getTime()) && !isNaN(db.getTime()) && da.toDateString() === db.toDateString();
}

function formatDay(value?: string | null): string {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return value;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMessageTime(value: string): string {
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return value || '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function groupReactions(reactions: MessageReaction[] | undefined, currentUserId: number) {
  if (!reactions || reactions.length === 0) return [];
  const map = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { count: 0, mine: false };
    entry.count += 1;
    if (Number(r.user_id) === currentUserId) entry.mine = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v }));
}

export function TicketThreadScreen({ route }: Props) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const wa = isDark ? WA_DARK : WA_LIGHT;
  const styles = useMemo(() => createStyles(colors, wa), [colors, wa]);
  const currentUserId = user?.id ?? -1;
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [online, setOnline] = useState(true);
  const [quote, setQuote] = useState<SupportTicketMessage | null>(null);
  const [reactionModal, setReactionModal] = useState<SupportTicketMessage | null>(null);
  const [typing, setTyping] = useState(false);
  const [kbInset, setKbInset] = useState(0);
  const listRef = useRef<FlatList<ThreadItem>>(null);
  const nearBottomRef = useRef(true);
  const previousCount = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKbInset(e.endCoordinates.height + KEYBOARD_TOOLBAR_BUFFER);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
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

  const apply = useCallback(
    (data: SupportTicketDetail, forceScroll = false) => {
      const hasNew = data.messages.length > previousCount.current;
      const shouldScroll = forceScroll || (hasNew && nearBottomRef.current);
      previousCount.current = data.messages.length;
      setTicket(data);
      setTyping(isTyping(data));
      if (shouldScroll) scrollToBottom();
    },
    [scrollToBottom]
  );

  const replaceThread = useCallback((data: SupportTicketDetail) => {
    previousCount.current = data.messages.length;
    setTicket(data);
    setTyping(isTyping(data));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchSupportTicket(route.params.id);
      previousCount.current = data.messages.length;
      setTicket(data);
      setTyping(isTyping(data));
      setOnline(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket.');
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  const refresh = useCallback(async () => {
    try {
      const data = await api.fetchSupportTicket(route.params.id);
      setOnline(true);
      apply(data, true);
    } catch {
      setOnline(false);
    }
  }, [route.params.id, apply]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const interval = setInterval(() => {
        void refresh();
      }, POLL_MS);
      return () => clearInterval(interval);
    }, [load, refresh])
  );

  useEffect(() => {
    if (ticket && ticket.messages.length > 0) scrollToBottom(false);
  }, [ticket, scrollToBottom]);

  const items = useMemo<ThreadItem[]>(() => {
    if (!ticket) return [];
    const out: ThreadItem[] = [];
    ticket.messages.forEach((m, i) => {
      const prev = ticket.messages[i - 1];
      if (i === 0 || !sameDay(m.created_at, prev?.created_at)) {
        out.push({ kind: 'date', key: `date-${i}-${m.id}`, value: formatDay(m.created_at) });
      }
      out.push({ kind: 'msg', key: `msg-${m.id}`, value: m });
    });
    return out;
  }, [ticket]);

  async function sendReply() {
    const message = reply.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      const data = await api.replySupportTicket(route.params.id, message, quote?.id ?? null);
      apply(data, true);
      setReply('');
      setQuote(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reply.');
    } finally {
      setSending(false);
    }
  }

  const quoteMessage = useCallback(
    (m: SupportTicketMessage) => {
      if (ticket?.status === 'closed') return;
      setQuote(m);
    },
    [ticket?.status]
  );

  const openReactionPicker = useCallback(
    (m: SupportTicketMessage) => {
      if (ticket?.status === 'closed') return;
      setReactionModal(m);
    },
    [ticket?.status]
  );

  const applyReaction = useCallback(
    async (ticketId: number, messageId: number, emoji: string) => {
      if (reacting) return;
      setReacting(true);
      try {
        const data = await api.reactToSupportMessage(ticketId, messageId, emoji);
        replaceThread(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not react.');
      } finally {
        setReacting(false);
        setReactionModal(null);
      }
    },
    [reacting, replaceThread]
  );

  if (loading) {
    return <ThreadSkeleton />;
  }

  if (error || !ticket) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedLight} />
        <Text style={styles.error}>{error || 'Ticket not found.'}</Text>
        <Pressable onPress={() => void load()} style={styles.retryBtn}>
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const cat = SUPPORT_CATEGORIES.find((c) => c.value === ticket.category);
  const prio = SUPPORT_PRIORITIES.find((p) => p.value === ticket.priority);
  const live = ticket.status !== 'closed';
  const canReply = live;

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderInfo}>
          <View style={[styles.onlineDot, !live && styles.offlineDot]} />
          <View style={styles.chatHeaderText}>
            <Text style={styles.chatHeaderTitle}>Live support chat</Text>
            <Text style={styles.chatHeaderSub}>
              {live
                ? ticket.needs_human
                  ? 'Forwarded to a human agent · replies shortly'
                  : online
                    ? 'Support online · replies within minutes'
                    : 'Connecting…'
                : 'Support offline'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusSoft(colors, ticket.status) }]}>
          <Text style={[styles.statusText, { color: statusColor(ticket.status) }]}>
            {ticket.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.key}
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          nearBottomRef.current =
            contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
        }}
        onContentSizeChange={() => {
          if (ticket && ticket.messages.length > 0) scrollToBottom(false);
        }}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.number}>{ticket.ticket_number}</Text>
            <Text style={styles.subject}>{ticket.subject}</Text>
            <View style={styles.chips}>
              <View style={styles.chip}>
                <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
                <Text style={styles.chipText}>{cat?.label ?? ticket.category}</Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="flag-outline" size={13} color={colors.primary} />
                <Text style={styles.chipText}>{prio?.label ?? ticket.priority} priority</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'date' ? (
            <View style={styles.dateChip}>
              <Text style={styles.dateChipText}>{item.value}</Text>
            </View>
          ) : (
            <MessageBubble
              message={item.value}
              isAdmin={isAdminMessage(item.value)}
              currentUserId={currentUserId}
              colors={colors}
              styles={styles}
              wa={wa}
              canReply={canReply}
              onReply={quoteMessage}
              onLongPress={openReactionPicker}
              onReact={(emoji) => void applyReaction(ticket.id, item.value.id, emoji)}
            />
          )
        }
        ListFooterComponent={
          <>
            {typing ? <TypingBubble styles={styles} wa={wa} /> : null}
            {ticket.status === 'closed' ? (
              <View style={styles.closedNote}>
                <Ionicons name="lock-closed-outline" size={15} color={colors.muted} />
                <Text style={styles.closedText}>This ticket is closed. Contact us directly for further help.</Text>
              </View>
            ) : null}
          </>
        }
      />

      {canReply ? (
        <View style={[styles.composerWrap, { paddingBottom: kbInset || Math.max(insets.bottom, 12) }]}>
          {quote ? (
            <View style={styles.quoteBar}>
              <Ionicons name="arrow-undo" size={16} color={colors.primary} />
              <View style={styles.quoteBarText}>
                <Text style={styles.quoteBarTitle}>
                  Replying to {isAdminMessage(quote) ? 'support' : 'you'}
                </Text>
                <Text style={styles.quoteBarBody} numberOfLines={1}>
                  {quote.body}
                </Text>
              </View>
              <Pressable onPress={() => setQuote(null)} hitSlop={10}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composer}>
            <View style={styles.composerBox}>
              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Type a message…"
                placeholderTextColor={colors.mutedLight}
                style={styles.composerInput}
                multiline
                maxLength={5000}
              />
              <Pressable
                onPress={() => void sendReply()}
                disabled={!reply.trim() || sending}
                style={[styles.sendBtn, (!reply.trim() || sending) && styles.sendBtnDisabled]}
              >
                {sending ? <Skeleton width={18} height={18} radius={9} /> : (
                  <Ionicons name="send" size={18} color={isDark ? colors.ink : colors.white} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <Modal
        visible={!!reactionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setReactionModal(null)}>
          <View style={styles.reactionSheet}>
            {REACTION_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={styles.reactionBtn}
                disabled={reacting}
                onPress={() => {
                  if (reactionModal) void applyReaction(ticket.id, reactionModal.id, emoji);
                }}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({
  message,
  isAdmin,
  currentUserId,
  colors,
  styles,
  wa,
  canReply,
  onReply,
  onLongPress,
  onReact,
}: {
  message: SupportTicketMessage;
  isAdmin: boolean;
  currentUserId: number;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  wa: WaColors;
  canReply: boolean;
  onReply: (m: SupportTicketMessage) => void;
  onLongPress: (m: SupportTicketMessage) => void;
  onReact: (emoji: string) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isAdminMsg = isAdmin;
  const bg = isAdminMsg ? wa.bubbleOut : wa.bubbleIn;
  const textColor = isAdminMsg ? wa.textOut : wa.textIn;
  const timeColor = isAdminMsg ? wa.timeOut : wa.timeIn;

  const panResponder = useMemo(() => {
    if (!canReply) return null;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) => g.dx > 8 && g.dx > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_evt, g) => {
        translateX.setValue(Math.min(g.dx, 90));
      },
      onPanResponderRelease: (_evt, g) => {
        if (g.dx > 70) onReply(message);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    });
  }, [canReply, message, onReply, translateX]);

  const reactionGroups = groupReactions(message.reactions, currentUserId);

  return (
    <View style={[styles.msgRow, isAdminMsg ? styles.msgRowAdmin : styles.msgRowCustomer]}>
      <Animated.View
        {...(panResponder ? panResponder.panHandlers : {})}
        style={[styles.msgBubbleWrap, { transform: [{ translateX }] }]}
      >
        <Pressable
          onLongPress={() => onLongPress(message)}
          delayLongPress={350}
          style={[
            styles.msgBubble,
            isAdminMsg ? styles.msgBubbleAdmin : styles.msgBubbleCustomer,
            { backgroundColor: bg },
          ]}
        >
          {message.reply_to_id && message.reply_to_body != null ? (
            <View style={[styles.quoteBlock, isAdminMsg ? null : styles.quoteBlockOnColor]}>
              <Text
                style={[styles.quoteBlockLabel, { color: isAdminMsg ? colors.primary : textColor }]}
                numberOfLines={1}
              >
                {isAdminMsg ? 'Support replied to' : 'You replied to'} a message
              </Text>
              <Text style={[styles.quoteBlockBody, { color: textColor }]} numberOfLines={2}>
                {message.reply_to_body}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.msgBody, { color: textColor }]}>{message.body}</Text>
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, { color: timeColor }]}>{formatMessageTime(message.created_at)}</Text>
            {isAdminMsg ? <Ionicons name="checkmark-done" size={15} color={wa.tick} /> : null}
          </View>
          {reactionGroups.length > 0 ? (
            <View style={styles.reactionRow}>
              {reactionGroups.map((g) => (
                <Pressable
                  key={g.emoji}
                  disabled={!canReply}
                  onPress={() => canReply && onReact(g.emoji)}
                  style={[styles.reactionChip, g.mine && styles.reactionChipMine]}
                >
                  <Text style={styles.reactionChipText}>
                    {g.emoji} {g.count}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
        <View
          style={[
            styles.msgTail,
            isAdminMsg ? styles.msgTailAdmin : styles.msgTailCustomer,
            { backgroundColor: bg },
          ]}
        />
      </Animated.View>
    </View>
  );
}

function ThreadSkeleton() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonChatHeader}>
        <View style={styles.skeletonChatHeaderRow}>
          <SkeletonCircle size={10} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="75%" height={11} />
          </View>
        </View>
      </View>
      <View style={styles.skeletonCard}>
        <Skeleton width="40%" height={13} />
        <Skeleton width="90%" height={20} style={{ marginTop: 8 }} />
        <Skeleton width="60%" height={14} style={{ marginTop: 10 }} />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.skeletonMsg, i % 2 === 1 && styles.skeletonMsgRight]}>
          <Skeleton width={i % 2 === 1 ? '70%' : '60%'} height={54} radius={16} />
        </View>
      ))}
      <View style={styles.skeletonComposer}>
        <Skeleton width="78%" height={44} radius={14} />
        <Skeleton width={44} height={44} radius={22} />
      </View>
    </View>
  );
}

function TypingBubble({ styles, wa }: { styles: ReturnType<typeof createStyles>; wa: WaColors }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={styles.typingRow}>
      <View style={[styles.typingBubble, { backgroundColor: wa.bubbleIn }]}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { opacity, backgroundColor: wa.tick }]}
          />
        ))}
      </View>
      <View style={[styles.msgTail, styles.msgTailAdmin, { backgroundColor: wa.bubbleIn }]} />
    </View>
  );
}

function statusSoft(colors: ThemeColors, status: string): string {
  if (status === 'resolved') return colors.successSoft;
  if (status === 'closed') return colors.dangerSoft;
  if (status === 'in_progress') return colors.primarySoft;
  return colors.warningSoft;
}

function statusColor(status: string): string {
  if (status === 'resolved') return '#16a34a';
  if (status === 'closed') return '#dc2626';
  if (status === 'in_progress') return '#0E9384';
  return '#d97706';
}

const createStyles = (colors: ThemeColors, wa: WaColors = WA_LIGHT) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: wa.bg,
    },
    flex: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      padding: 24,
      gap: 10,
    },
    error: {
      color: colors.danger,
      fontSize: 16,
      textAlign: 'center',
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 4,
    },
    retryText: {
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.primary,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chatHeaderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    chatHeaderText: {
      flex: 1,
    },
    chatHeaderTitle: {
      fontSize: 16,
      fontWeight: font.bold,
      color: colors.text,
    },
    chatHeaderSub: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 1,
    },
    onlineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#16a34a',
    },
    offlineDot: {
      backgroundColor: colors.mutedLight,
    },
    statusChip: {
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: 14,
      fontWeight: font.bold,
      textTransform: 'capitalize',
    },
    list: {
      padding: 16,
      paddingBottom: 24,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
      ...shadow.sm,
    },
    number: {
      fontSize: 14,
      fontWeight: font.semibold,
      color: colors.muted,
      letterSpacing: 0.4,
    },
    subject: {
      fontSize: 19,
      fontWeight: font.bold,
      color: colors.text,
      marginTop: 6,
    },
    chips: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipText: {
      fontSize: 14,
      fontWeight: font.semibold,
      color: colors.primary,
      textTransform: 'capitalize',
    },
    msgRow: {
      marginBottom: 10,
      position: 'relative',
      justifyContent: 'center',
    },
    msgRowCustomer: {
      alignItems: 'flex-end',
    },
    msgRowAdmin: {
      alignItems: 'flex-start',
    },
    msgBubbleWrap: {
      maxWidth: '85%',
      position: 'relative',
    },
    msgBubble: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 7,
    },
    msgBubbleCustomer: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 3,
    },
    msgBubbleAdmin: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 3,
      borderBottomRightRadius: 16,
    },
    msgTail: {
      position: 'absolute',
      bottom: 0,
      width: 10,
      height: 10,
    },
    msgTailCustomer: {
      right: -3,
      transform: [{ rotate: '45deg' }],
    },
    msgTailAdmin: {
      left: -3,
      transform: [{ rotate: '45deg' }],
    },
    quoteBlock: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 5,
      marginBottom: 5,
    },
    quoteBlockOnColor: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    quoteBlockLabel: {
      fontSize: 11,
      fontWeight: font.bold,
      color: colors.primary,
      marginBottom: 1,
    },
    quoteBlockBody: {
      fontSize: 13,
      color: wa.textOut,
      opacity: 0.85,
      lineHeight: 17,
    },
    msgBody: {
      fontSize: 16,
      lineHeight: 22,
    },
    msgMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: 2,
    },
    msgTime: {
      fontSize: 12,
      lineHeight: 14,
    },
    reactionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 2,
    },
    reactionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reactionChipMine: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    reactionChipText: {
      fontSize: 13,
      fontWeight: font.semibold,
      color: colors.text,
    },
    dateChip: {
      alignSelf: 'center',
      backgroundColor: wa.dateBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginVertical: 6,
    },
    dateChipText: {
      fontSize: 13,
      fontWeight: font.semibold,
      color: wa.dateText,
    },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      position: 'relative',
      marginTop: 2,
      marginBottom: 4,
    },
    typingBubble: {
      flexDirection: 'row',
      gap: 5,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 3,
      borderBottomRightRadius: 16,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    closedNote: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 6,
    },
    closedText: {
      fontSize: 14,
      color: colors.muted,
      flexShrink: 1,
      textAlign: 'center',
    },
    composerWrap: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: 12,
    },
    quoteBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    quoteBarText: {
      flex: 1,
    },
    quoteBarTitle: {
      fontSize: 12,
      fontWeight: font.bold,
      color: colors.primary,
    },
    quoteBarBody: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 1,
    },
    composer: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    composerBox: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    composerInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 11,
      fontSize: 16,
      color: colors.text,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    reactionSheet: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      padding: 10,
      ...shadow.md,
    },
    reactionBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    reactionEmoji: {
      fontSize: 24,
    },
    skeletonWrap: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    skeletonChatHeader: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    skeletonChatHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    skeletonCard: {
      margin: 16,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    skeletonMsg: {
      marginHorizontal: 16,
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    skeletonMsgRight: {
      alignItems: 'flex-end',
    },
    skeletonComposer: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
  });
