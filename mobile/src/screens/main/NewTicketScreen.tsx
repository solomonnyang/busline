import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as api from '../../api/endpoints';
import type { ApiError } from '../../api/client';
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from '../../api/types';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { MainStackParamList } from '../../navigation/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'NewTicket'>;

export function NewTicketScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    if (subject.trim().length < 3) {
      setError('Please give your issue a short subject.');
      return;
    }
    if (message.trim().length < 5) {
      setError('Please describe the issue so we can help faster.');
      return;
    }
    setLoading(true);
    try {
      const ticket = await api.createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
      });
      navigation.replace('TicketThread', { id: ticket.id });
    } catch (e) {
      const err = e as ApiError;
      if (err.errors) {
        setError(Object.values(err.errors)[0] || err.message || 'Could not create ticket.');
      } else {
        setError(err.message || 'Could not create ticket.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FormTextInput
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholder="Brief summary of your issue"
          icon="document-text-outline"
          autoCapitalize="sentences"
          maxLength={150}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {SUPPORT_CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <Pressable
                key={c.value}
                onPress={() => setCategory(c.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Priority</Text>
        <View style={styles.chipRow}>
          {SUPPORT_PRIORITIES.map((p) => {
            const active = priority === p.value;
            return (
              <Pressable
                key={p.value}
                onPress={() => setPriority(p.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Message</Text>
        <View style={styles.msgWrap}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Give us the details so we can help faster"
            placeholderTextColor={colors.mutedLight}
            style={styles.msgInput}
            multiline
            textAlignVertical="top"
            maxLength={5000}
          />
        </View>

        <PrimaryButton
          label="Submit ticket"
          onPress={onSubmit}
          loading={loading}
          icon="send"
        />

        <Text style={styles.hint}>
          The AI assistant usually answers instantly. Issues it can't handle are forwarded to a human agent.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    error: {
      color: colors.danger,
      fontSize: 15,
      marginBottom: 12,
    },
    label: {
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.text,
      marginTop: 4,
      marginBottom: 8,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    chip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipText: {
      fontSize: 15,
      fontWeight: font.semibold,
      color: colors.muted,
    },
    chipTextActive: {
      color: colors.primary,
    },
    msgWrap: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      marginBottom: 18,
    },
    msgInput: {
      minHeight: 130,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
    hint: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 18,
    },
  });
