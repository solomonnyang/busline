import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WalletTransaction } from '../api/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../theme';
import { formatPrice } from '../utils/format';
import { PrimaryButton } from './PrimaryButton';

function paymentMethodLabel(value: string | null | undefined): string {
  switch (value) {
    case 'paystack':
      return 'Card (Paystack)';
    case 'wallet':
      return 'Wallet';
    case 'cash':
      return 'Cash';
    default:
      return value || '—';
  }
}

function formatFullDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return value;
  return (
    d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable>
        {value}
      </Text>
    </View>
  );
}

interface Props {
  tx: WalletTransaction | null;
  onClose: () => void;
}

export function WalletTransactionDetailModal({ tx, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const STATUS_META: Record<string, { label: string; color: string; soft: string }> = {
    success: { label: 'Successful', color: colors.success, soft: colors.successSoft },
    pending: { label: 'Pending', color: colors.warning, soft: colors.warningSoft },
    failed: { label: 'Failed', color: colors.danger, soft: colors.dangerSoft },
  };
  const meta = STATUS_META[tx?.status ?? ''] ?? {
    label: tx?.status ?? '—',
    color: colors.muted,
    soft: colors.primarySoft,
  };
  const isCredit = tx?.type === 'credit';
  const amount = Number(tx?.amount ?? 0);

  return (
    <Modal visible={tx !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: isCredit ? colors.successSoft : colors.dangerSoft }]}>
                <Ionicons
                  name={isCredit ? 'arrow-down' : 'arrow-up'}
                  size={28}
                  color={isCredit ? colors.success : colors.danger}
                />
              </View>
              <Text style={styles.heroTitle}>{isCredit ? 'Credit' : 'Debit'}</Text>
              <Text style={[styles.heroAmount, { color: isCredit ? colors.success : colors.danger }]}>
                {isCredit ? '+' : '−'}₦{formatPrice(amount)}
              </Text>
              <View style={[styles.statusChip, { backgroundColor: meta.soft }]}>
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            <View style={styles.details}>
              <DetailRow label="Description" value={tx?.description || 'Wallet transaction'} />
              <DetailRow label="Type" value={isCredit ? 'Credit' : 'Debit'} />
              <DetailRow label="Amount" value={`₦${formatPrice(amount)}`} />
              <DetailRow label="Status" value={meta.label} />
              <DetailRow label="Payment method" value={paymentMethodLabel(tx?.payment_method)} />
              <DetailRow label="Reference" value={tx?.reference || '—'} />
              {tx?.paystack_ref ? <DetailRow label="Paystack reference" value={tx.paystack_ref} /> : null}
              <DetailRow label="Date" value={formatFullDateTime(tx?.paid_at ?? tx?.created_at)} />
              <DetailRow label="Transaction ID" value={tx ? String(tx.id) : '—'} />
            </View>

            <PrimaryButton label="Done" onPress={onClose} icon="close" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 14, 11, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: font.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: font.bold,
    marginTop: 2,
  },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: font.bold,
    textTransform: 'capitalize',
  },
  details: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 15,
    color: colors.muted,
    flexShrink: 0,
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
    textAlign: 'right',
  },
});
