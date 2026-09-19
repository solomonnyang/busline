import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../theme';
import { formatPrice } from '../utils/format';

interface Props {
  visible: boolean;
  amount: number;
  seatCount: number;
  walletBalance: number | null;
  busy: boolean;
  onWallet: () => void;
  onPaystack: () => void;
  onClose: () => void;
}

export function PaymentMethodSheet({
  visible,
  amount,
  seatCount,
  walletBalance,
  busy,
  onWallet,
  onPaystack,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insufficient = walletBalance !== null && walletBalance < amount;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdropWrap}>
        <BlurView
          tint="dark"
          intensity={32}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
        </BlurView>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title}>Choose payment method</Text>
            <Text style={styles.subtitle}>
              Pay ₦{formatPrice(amount)} for {seatCount} seat{seatCount === 1 ? '' : 's'}
            </Text>
          </View>

          <Pressable
            onPress={onWallet}
            disabled={busy}
            style={({ pressed }) => [
              styles.option,
              styles.optionWallet,
              pressed && !busy && { opacity: 0.85 },
            ]}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="wallet-outline" size={22} color={colors.ink} />
            </View>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>Pay with wallet</Text>
              <Text style={styles.optionSub}>
                {walletBalance !== null
                  ? `₦${formatPrice(walletBalance)} available`
                  : 'Pay from your wallet balance'}
              </Text>
            </View>
            {insufficient ? (
              <View style={styles.lowBadge}>
                <Text style={styles.lowBadgeText}>Low balance</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={20} color={colors.mutedLight} />
          </Pressable>

          <Pressable
            onPress={onPaystack}
            disabled={busy}
            style={({ pressed }) => [
              styles.option,
              styles.optionPaystack,
              pressed && !busy && { opacity: 0.85 },
            ]}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="card-outline" size={22} color={colors.ink} />
            </View>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>Pay with Paystack</Text>
              <Text style={styles.optionSub}>Card, bank transfer or USSD via Paystack</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedLight} />
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={busy}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdropWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  head: {
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: font.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  optionWallet: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionPaystack: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.text,
  },
  optionSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
  lowBadge: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  lowBadgeText: {
    fontSize: 11,
    fontWeight: font.bold,
    color: colors.ink,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.muted,
  },
});
