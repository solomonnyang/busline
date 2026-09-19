import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import type { ComponentProps } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { resolveApiUrl } from '../../api/client';
import type { MainStackParamList, MainTabsParamList } from '../../navigation/types';
import { font, radius, shadow, useTheme, useThemedStyles, type ThemeColors } from '../../theme';

type Props = BottomTabScreenProps<MainTabsParamList, 'Account'> & {
  navigation: CompositeNavigationProp<
    BottomTabScreenProps<MainTabsParamList, 'Account'>['navigation'],
    NativeStackNavigationProp<MainStackParamList>
  >;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

const MENU: {
  key: 'Profile' | 'Payment' | 'Offers' | 'Support' | 'Settings' | 'TwoFactor';
  icon: IconName;
  label: string;
  sub: string;
}[] = [
  { key: 'Profile', icon: 'person-outline', label: 'Profile', sub: 'Your personal information' },
  { key: 'Payment', icon: 'card-outline', label: 'Payment', sub: 'Payment methods and history' },
  { key: 'Offers', icon: 'star-outline', label: 'Offers & Rewards', sub: 'Loyalty points and referrals' },
  { key: 'TwoFactor', icon: 'shield-checkmark-outline', label: 'Security', sub: 'Two-factor authentication' },
  { key: 'Support', icon: 'headset-outline', label: 'Support', sub: 'Help and contact us' },
  { key: 'Settings', icon: 'settings-outline', label: 'Settings', sub: 'App preferences' },
];

export function AccountScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, staff, logout } = useAuth();

  const itemColors: Record<string, { icon: string; bg: string }> = {
    Profile: { icon: colors.primary, bg: colors.primarySoft },
    Payment: { icon: colors.success, bg: colors.successSoft },
    Offers: { icon: colors.gold, bg: colors.goldSoft },
    TwoFactor: { icon: colors.accentBlue, bg: `${colors.accentBlue}1F` },
    Support: { icon: colors.warning, bg: colors.warningSoft },
    Settings: { icon: colors.accentPurple, bg: `${colors.accentPurple}1F` },
  };

  function go(key: 'Profile' | 'Payment' | 'Offers' | 'Support' | 'Settings' | 'TwoFactor') {
    navigation.navigate(key);
  }

  function onLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
        </View>

        <View style={styles.userCard}>
          {user?.avatar ? (
            <Image source={{ uri: resolveApiUrl(user.avatar) ?? undefined }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Ionicons name="person" size={30} color={isDark ? colors.ink : colors.white} />
            </LinearGradient>
          )}
          <View style={styles.userBody}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>

        {user?.role_slug === 'vendor' ? (
          <Pressable
            style={({ pressed }) => [styles.vendorCard, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('BusVendorDashboard')}
          >
            <View style={styles.vendorIcon}>
              <Ionicons name="bus" size={22} color="#fff" />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.vendorTitle}>Vendor dashboard</Text>
              <Text style={styles.vendorSub}>Manage buses, routes, trips & bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
        ) : null}

        {user?.role_slug === 'vendor_staff' && staff?.role === 'driver' ? (
          <Pressable
            style={({ pressed }) => [styles.vendorCard, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('DriverDashboard')}
          >
            <View style={styles.vendorIcon}>
              <Ionicons name="id-card" size={22} color="#fff" />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.vendorTitle}>Driver dashboard</Text>
              <Text style={styles.vendorSub}>Trips assigned to you</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
        ) : null}

        <View style={styles.menu}>
          {MENU.map((item, i) => (
            <Pressable
              key={item.key}
              onPress={() => go(item.key)}
              style={({ pressed }) => [
                styles.row,
                i === MENU.length - 1 && styles.rowLast,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: itemColors[item.key].bg }]}>
                <Ionicons name={item.icon} size={18} color={itemColors[item.key].icon} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.sub}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedLight} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.surface} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
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
    padding: 20,
    paddingBottom: 60,
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: font.bold,
    color: colors.text,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...shadow.sm,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBody: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: font.bold,
    color: colors.text,
  },
  email: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 2,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    backgroundColor: colors.primary,
    ...shadow.md,
  },
  vendorIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorTitle: {
    fontSize: 17,
    fontWeight: font.bold,
    color: '#fff',
  },
  vendorSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    backgroundColor: colors.primarySoft,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.text,
  },
  rowSub: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 1,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  logoutBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    marginTop: 16,
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 0,
    ...shadow.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: font.bold,
    color: colors.surface,
  },
});
