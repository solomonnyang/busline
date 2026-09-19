import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../api/endpoints';
import { SUPPORT_CATEGORIES, type SupportTicket } from '../../api/types';
import { Skeleton } from '../../components/Skeleton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'Support'>;

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I cancel a booking?',
    a: 'Open the booking from My Bookings and use the cancel option. Only pending or confirmed bookings can be cancelled. Refunds depend on the payment method used.',
  },
  {
    q: 'What happens if my payment fails?',
    a: 'Your booking is kept as pending so you can try again. You can reach out to us with your booking reference and we will help you complete or refund the payment.',
  },
  {
    q: 'How do I get my ticket?',
    a: 'Once your payment is confirmed, open the booking in My Bookings and tap to view your ticket. The QR code on the ticket is scanned by the bus operator at boarding.',
  },
  {
    q: 'Can I change my seat after booking?',
    a: 'Seat changes are handled by the bus operator before departure. Contact support with your booking reference and we will assist if seats are available.',
  },
  {
    q: 'What happens if I miss my bus?',
    a: 'Please contact support as soon as possible. Depending on the operator and how close the departure is, we may be able to transfer you to a later trip.',
  },
];

const CHANNELS: { icon: 'call-outline' | 'mail-outline' | 'chatbubbles-outline'; label: string; value: string; href: string }[] = [
  { icon: 'call-outline', label: 'Call us', value: '0800 BUSLINE (0800 287 5463)', href: 'tel:+2348002875463' },
  { icon: 'mail-outline', label: 'Email us', value: 'support@busline.ng', href: 'mailto:support@busline.ng' },
  { icon: 'chatbubbles-outline', label: 'WhatsApp', value: '+234 800 287 5463', href: 'https://wa.me/2348002875463' },
];

function catLabel(value: string): string {
  return SUPPORT_CATEGORIES.find((c) => c.value === value)?.label || value || '—';
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

function statusIconColor(colors: ThemeColors, status: string): string {
  if (status === 'resolved') return colors.success;
  if (status === 'closed') return colors.danger;
  if (status === 'in_progress') return colors.primary;
  return colors.warning;
}

export function SupportScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState<number | null>(0);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const channelTints: { icon: string; bg: string }[] = [
    { icon: colors.accentBlue, bg: `${colors.accentBlue}1F` },
    { icon: colors.primary, bg: colors.primarySoft },
    { icon: colors.success, bg: colors.successSoft },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchSupportTickets();
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset" size={26} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>
            Our AI assistant answers instantly, or forwards your issue to a human agent who replies within a few hours.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>My tickets</Text>
          <Pressable onPress={() => navigation.navigate('NewTicket')} style={styles.newBtn}>
            <Ionicons name="add" size={16} color={colors.surface} />
            <Text style={styles.newBtnText}>New ticket</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {loading ? (
            <View style={styles.skeletonList}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.skeletonRow, i === 2 && styles.rowLast]}>
                  <Skeleton width={40} height={40} radius={13} />
                  <View style={styles.skeletonBody}>
                    <Skeleton width="72%" height={15} />
                    <Skeleton width="55%" height={12} style={{ marginTop: 8 }} />
                  </View>
                </View>
              ))}
            </View>
          ) : error ? (
            <View style={styles.listState}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="mail-open-outline" size={30} color={colors.teal} />
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptySub}>Something on your mind? Open a ticket and our team will get back to you.</Text>
            </View>
          ) : (
            tickets.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => navigation.navigate('TicketThread', { id: t.id })}
                style={({ pressed }) => [
                  styles.ticketRow,
                  i === tickets.length - 1 && styles.rowLast,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={[styles.ticketIcon, { backgroundColor: statusSoft(colors, t.status) }]}>
                  <Ionicons name="help-buoy-outline" size={18} color={statusIconColor(colors, t.status)} />
                </View>
                <View style={styles.ticketBody}>
                  <View style={styles.ticketTop}>
                    <Text style={styles.ticketSubject} numberOfLines={1}>{t.subject}</Text>
                    <View style={[styles.statusChip, { backgroundColor: statusSoft(colors, t.status) }]}>
                      <Text style={[styles.statusText, { color: statusColor(t.status) }]}>
                        {t.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketMeta} numberOfLines={1}>
                    {t.ticket_number} · {catLabel(t.category)} · {t.priority} priority · {t.message_count} message{t.message_count === 1 ? '' : 's'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedLight} />
              </Pressable>
            ))
          )}
        </View>

        <Text style={styles.sectionLabel}>Contact us</Text>
        <View style={styles.card}>
          {CHANNELS.map((c, i) => (
            <Pressable
              key={c.label}
              onPress={() => void Linking.openURL(c.href)}
              style={({ pressed }) => [
                styles.channel,
                i === CHANNELS.length - 1 && styles.rowLast,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={[styles.channelIcon, { backgroundColor: channelTints[i].bg }]}>
                <Ionicons name={c.icon} size={18} color={channelTints[i].icon} />
              </View>
              <View style={styles.channelBody}>
                <Text style={styles.channelLabel}>{c.label}</Text>
                <Text style={styles.channelValue} numberOfLines={1}>
                  {c.value}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.mutedLight} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Frequently asked questions</Text>
        <View style={styles.card}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <View key={i} style={i === FAQS.length - 1 ? styles.rowLast : undefined}>
                <Pressable
                  onPress={() => setOpen(isOpen ? null : i)}
                  style={({ pressed }) => [styles.faqHeader, pressed && styles.rowPressed]}
                >
                  <Text style={styles.faqQuestion} numberOfLines={2}>
                    {f.q}
                  </Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={17} color={colors.muted} />
                </Pressable>
                {isOpen ? (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{f.a}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          Support available Monday – Saturday, 7am – 9pm. For emergencies on the road, call our dispatch line
          first.
        </Text>
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
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: font.bold,
    color: colors.text,
  },
  heroSub: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 300,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: font.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newBtnText: {
    fontSize: 14,
    fontWeight: font.bold,
    color: colors.surface,
  },
  listState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  skeletonList: {
    paddingVertical: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  skeletonBody: {
    flex: 1,
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ticketIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBody: {
    flex: 1,
    minWidth: 0,
  },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketSubject: {
    flex: 1,
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.text,
  },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: font.bold,
    textTransform: 'capitalize',
  },
  ticketMeta: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 3,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBody: {
    flex: 1,
  },
  channelLabel: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.text,
  },
  channelValue: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    backgroundColor: colors.primarySoft,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.text,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  faqAnswer: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 20,
  },
  footer: {
    fontSize: 14,
    color: colors.mutedLight,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
