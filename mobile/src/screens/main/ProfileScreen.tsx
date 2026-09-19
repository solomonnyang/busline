import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateAvatar, updateProfile, uploadAvatar } from '../../api/endpoints';
import { resolveApiUrl } from '../../api/client';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';import type { MainStackParamList } from '../../navigation/types';
import { font, radius, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'Profile'>;

export function ProfileScreen({}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState((profile?.address as string | undefined) ?? '');
  const [city, setCity] = useState((profile?.city as string | undefined) ?? '');

  const avatarUri = resolveApiUrl(user?.avatar);

  async function onChangePhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploading(true);
      const mime = asset.mimeType || 'image/jpeg';
      const { url } = await uploadAvatar(asset.uri, mime);
      await updateAvatar(url);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Could not update photo', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
      });
      await refreshProfile();
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarHeader}>
          <Pressable
            onPress={onChangePhoto}
            disabled={uploading}
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.85 }]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[colors.primary, colors.primaryDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Ionicons name="person" size={40} color={isDark ? colors.ink : colors.white} />
              </LinearGradient>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color={colors.ink} />
            </View>
          </Pressable>
          <View style={styles.avatarInfo}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.role}>Customer</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Your details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedLight}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.input, styles.inputReadonly]}>
              <Text style={styles.readonlyText}>{user?.email || '—'}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+234 800 000 0000"
              placeholderTextColor={colors.mutedLight}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Street address"
              placeholderTextColor={colors.mutedLight}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Lagos"
              placeholderTextColor={colors.mutedLight}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.saveWrap}>
            <PrimaryButton label="Save changes" onPress={onSave} loading={saving} icon="checkmark" variant="teal" />
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
    scrollContent: {
      paddingBottom: 48,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: font.bold,
      color: colors.text,
    },
    avatarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 16,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInfo: {
      flex: 1,
    },
    cameraBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      fontSize: 22,
      fontWeight: font.bold,
      color: colors.text,
    },
    role: {
      fontSize: 15,
      color: colors.muted,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    form: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: font.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.muted,
      marginBottom: 12,
    },
    field: {
      marginBottom: 14,
    },
    label: {
      fontSize: 14,
      fontWeight: font.semibold,
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    inputReadonly: {
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    readonlyText: {
      fontSize: 15,
      color: colors.muted,
    },
    saveWrap: {
      marginTop: 8,
    },
  });
