import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAccount } from '../../api/endpoints';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'DeleteAccountFlow'>;

const REASONS = [
  'I found another service',
  'It costs too much',
  'I no longer travel often',
  'Privacy concerns',
  'Technical issues',
  'Other',
];

const CONSEQUENCES = [
  'Your bookings and tickets history will be permanently removed.',
  'Any remaining wallet balance will be lost.',
  'Loyalty points and referral rewards will be cancelled.',
  'You will be signed out and will not be able to recover your account.',
];

const TOTAL_STEPS = 3;

export function DeleteAccountFlowScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { logout } = useAuth();

  const [step, setStep] = useState(0);
  const [reason, setReason] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canContinue =
    step === 0 ? reason != null : step === 1 ? acknowledged : confirmText.trim().toUpperCase() === 'DELETE';

  function back() {
    if (step === 0) {
      navigation.goBack();
      return;
    }
    setStep(step - 1);
  }

  function next() {
    if (!canContinue) return;
    if (step === TOTAL_STEPS - 1) {
      void confirmDelete();
      return;
    }
    setStep(step + 1);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      await logout();
    } catch (e) {
      Alert.alert('Could not delete account', e instanceof Error ? e.message : 'Please try again.');
      setDeleting(false);
    }
  }

  function renderStep() {
    if (step === 0) {
      return (
        <>
          <View style={styles.iconWrap}>
            <Ionicons name="help-circle-outline" size={34} color={colors.warning} />
          </View>
          <Text style={styles.question}>Why are you leaving BusLine?</Text>
          <Text style={styles.hint}>This helps us improve. Select one option to continue.</Text>
          <View style={styles.options}>
            {REASONS.map((r) => {
              const active = reason === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{r}</Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.danger} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={colors.mutedLight} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={34} color={colors.warning} />
          </View>
          <Text style={styles.question}>What happens next?</Text>
          <Text style={styles.hint}>Please read the following before continuing.</Text>
          <View style={styles.consequences}>
            {CONSEQUENCES.map((c, i) => (
              <View key={i} style={styles.consequence}>
                <View style={styles.consequenceIcon}>
                  <Ionicons name="close" size={14} color={colors.danger} />
                </View>
                <Text style={styles.consequenceText}>{c}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => setAcknowledged(!acknowledged)}
            style={({ pressed }) => [styles.ackRow, pressed && { opacity: 0.8 }]}
          >
            <View style={[styles.checkbox, acknowledged && styles.checkboxOn]}>
              {acknowledged ? <Ionicons name="checkmark" size={18} color={colors.surface} /> : null}
            </View>
            <Text style={styles.ackText}>I understand my account will be permanently deleted.</Text>
          </Pressable>
        </>
      );
    }

    return (
      <>
        <View style={styles.iconWrap}>
          <Ionicons name="trash-bin-outline" size={34} color={colors.danger} />
        </View>
        <Text style={styles.question}>Confirm deletion</Text>
        <Text style={styles.hint}>
          To confirm, type <Text style={styles.confirmToken}>DELETE</Text> below. This is permanent and cannot be
          undone.
        </Text>
        <TextInput
          style={styles.input}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder="Type DELETE"
          placeholderTextColor={colors.mutedLight}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.progress}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressBar, i <= step && styles.progressBarOn]} />
          ))}
        </View>

        <View style={styles.body}>{renderStep()}</View>

        <View style={styles.footer}>
          <Pressable onPress={back} hitSlop={10} style={styles.backLink}>
            <Ionicons name="arrow-back" size={17} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.action}>
            <PrimaryButton
              label={step === TOTAL_STEPS - 1 ? 'Delete my account' : 'Continue'}
              onPress={next}
              loading={deleting}
              disabled={!canContinue}
              variant="danger"
              block={false}
              icon={step === TOTAL_STEPS - 1 ? 'trash-bin-outline' : 'arrow-forward'}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    content: {
      flexGrow: 1,
      padding: 20,
      paddingBottom: 40,
    },
    progress: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 24,
    },
    progressBar: {
      flex: 1,
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
    },
    progressBarOn: {
      backgroundColor: colors.danger,
    },
    body: {
      flex: 1,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    question: {
      fontSize: 22,
      fontWeight: font.bold,
      color: colors.text,
      marginBottom: 6,
    },
    hint: {
      fontSize: 15,
      color: colors.muted,
      lineHeight: 22,
      marginBottom: 18,
    },
    options: {
      gap: 10,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    optionActive: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerSoft,
    },
    optionPressed: {
      opacity: 0.85,
    },
    optionText: {
      fontSize: 16,
      fontWeight: font.semibold,
      color: colors.text,
    },
    optionTextActive: {
      color: colors.danger,
    },
    consequences: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 16,
      gap: 14,
      marginBottom: 18,
    },
    consequence: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    consequenceIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    consequenceText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      lineHeight: 21,
    },
    ackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
    },
    ackText: {
      flex: 1,
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.text,
      lineHeight: 21,
    },
    confirmToken: {
      fontWeight: font.bold,
      color: colors.danger,
    },
    input: {
      minHeight: 52,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      fontSize: 17,
      fontWeight: font.bold,
      color: colors.danger,
      letterSpacing: 1,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 28,
    },
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingRight: 16,
    },
    backText: {
      fontSize: 16,
      fontWeight: font.semibold,
      color: colors.text,
    },
    action: {
      flex: 1,
      maxWidth: 240,
    },
  });