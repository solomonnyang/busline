import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';
import { AccountScreen } from '../screens/main/AccountScreen';
import { BookingDetailScreen } from '../screens/main/BookingDetailScreen';
import { EarlyBirdScreen } from '../screens/main/EarlyBirdScreen';
import { LoyaltyScreen } from '../screens/main/LoyaltyScreen';
import { MyBookingsScreen } from '../screens/main/MyBookingsScreen';
import { NewTicketScreen } from '../screens/main/NewTicketScreen';
import { OffersScreen } from '../screens/main/OffersScreen';
import { PaymentScreen } from '../screens/main/PaymentScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { ReferralScreen } from '../screens/main/ReferralScreen';
import { ResultsScreen } from '../screens/main/ResultsScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { SeatSelectionScreen } from '../screens/main/SeatSelectionScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { SupportScreen } from '../screens/main/SupportScreen';
import { TerminalDetailScreen } from '../screens/main/TerminalDetailScreen';
import { TicketScreen } from '../screens/main/TicketScreen';
import { TicketThreadScreen } from '../screens/main/TicketThreadScreen';
import { TwoFactorSetupScreen } from '../screens/main/TwoFactorSetupScreen';
import { DeleteAccountFlowScreen } from '../screens/main/DeleteAccountFlowScreen';
import { AgentChatScreen } from '../screens/main/AgentChatScreen';
import { DriverDashboardScreen } from '../screens/driver/DriverDashboardScreen';
import { BusBookingDetailScreen } from '../screens/vendorBus/BusBookingDetailScreen';
import { BusBookingsScreen } from '../screens/vendorBus/BusBookingsScreen';
import { BusFormScreen } from '../screens/vendorBus/BusFormScreen';
import { BusListScreen } from '../screens/vendorBus/BusListScreen';
import { BusProfileScreen } from '../screens/vendorBus/BusProfileScreen';
import { BusRevenueScreen } from '../screens/vendorBus/BusRevenueScreen';
import { BusVendorDashboardScreen } from '../screens/vendorBus/BusVendorDashboardScreen';
import { BusWalletScreen } from '../screens/vendorBus/BusWalletScreen';
import { RouteFormScreen } from '../screens/vendorBus/RouteFormScreen';
import { RouteListScreen } from '../screens/vendorBus/RouteListScreen';
import { TripFormScreen } from '../screens/vendorBus/TripFormScreen';
import { TripListScreen } from '../screens/vendorBus/TripListScreen';
import { AiWidget } from '../components/AiWidget';
import { Skeleton } from '../components/Skeleton';
import { font, useTheme, useThemedStyles, type ThemeColors } from '../theme';
import type { AuthStackParamList, MainStackParamList, MainTabsParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

const TAB_BAR_HEIGHT = 78;

type IconName = ComponentProps<typeof Ionicons>['name'];

function AnimatedTab({ focused, children }: { focused: boolean; children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.spring(bounce, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }).start();
    } else {
      bounce.setValue(0);
    }
  }, [focused, bounce]);

  const iconScale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <Animated.View style={[styles.tabIcon, { transform: [{ scale: iconScale }] }]}>
      <View style={styles.tabContent}>{children}</View>
    </Animated.View>
  );
}

function TabIcon({ focused, icon }: { focused: boolean; icon: IconName }) {
  const { colors } = useTheme();
  return (
    <AnimatedTab focused={focused}>
      <Ionicons
        name={focused ? icon : (`${icon}-outline` as IconName)}
        size={20}
        color={focused ? colors.text : colors.mutedLight}
      />
    </AnimatedTab>
  );
}

function TabBarBackground() {
  const { isDark } = useTheme();
  return (
    <BlurView
      tint={isDark ? 'dark' : 'light'}
      intensity={85}
      style={StyleSheet.absoluteFill}
    />
  );
}

function MainTabs() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={{ flex: 1 }}>
      <Tabs.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: [
            styles.tabBar,
            { backgroundColor: isDark ? 'rgba(22, 25, 24, 0.92)' : 'rgba(255, 255, 255, 0.92)' },
          ],
          tabBarBackground: TabBarBackground,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: 'Search', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="search" /> }}
        />
        <Tabs.Screen
          name="Bookings"
          component={MyBookingsScreen}
          options={{ title: 'My Bookings', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="ticket" /> }}
        />
        <Tabs.Screen
          name="Account"
          component={AccountScreen}
          options={{ title: 'Account', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="person" /> }}
        />
      </Tabs.Navigator>
      <AiWidget tabBarHeight={TAB_BAR_HEIGHT} />
    </View>
  );
}

export function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (loading) {
    return (
      <View style={styles.splash}>
        <Skeleton width={120} height={26} radius={10} />
        <Skeleton width={180} height={14} style={{ marginTop: 14 }} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
        <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      </AuthStack.Navigator>
    );
  }

  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: styles.headerTitle,
        contentStyle: { backgroundColor: colors.surfaceAlt },
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <MainStack.Screen
        name="AgentChat"
        component={AgentChatScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="SeatSelection"
        component={SeatSelectionScreen}
        options={{ title: 'Book seats' }}
      />
      <MainStack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Ticket"
        component={TicketScreen}
        options={{ title: 'My ticket' }}
      />
      <MainStack.Screen
        name="TerminalDetail"
        component={TerminalDetailScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <MainStack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <MainStack.Screen name="Offers" component={OffersScreen} options={{ title: 'Offers & Rewards' }} />
      <MainStack.Screen name="Loyalty" component={LoyaltyScreen} options={{ title: 'Loyalty points' }} />
      <MainStack.Screen
        name="EarlyBird"
        component={EarlyBirdScreen}
        options={{ title: 'Early bird discount' }}
      />
      <MainStack.Screen name="Referral" component={ReferralScreen} options={{ title: 'Refer & earn' }} />
      <MainStack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
      <MainStack.Screen name="NewTicket" component={NewTicketScreen} options={{ title: 'New ticket' }} />
      <MainStack.Screen
        name="TicketThread"
        component={TicketThreadScreen}
        options={{ title: 'Support chat' }}
      />
      <MainStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <MainStack.Screen
        name="TwoFactor"
        component={TwoFactorSetupScreen}
        options={{ title: 'Two-factor authentication' }}
      />
      <MainStack.Screen
        name="DeleteAccountFlow"
        component={DeleteAccountFlowScreen}
        options={{ title: 'Delete account' }}
      />

      <MainStack.Screen
        name="DriverDashboard"
        component={DriverDashboardScreen}
        options={{ headerShown: false }}
      />

      {/* Bus vendor dashboard */}
      <MainStack.Screen
        name="BusVendorDashboard"
        component={BusVendorDashboardScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="BusList"
        component={BusListScreen}
        options={{ title: 'My buses' }}
      />
      <MainStack.Screen
        name="BusForm"
        component={BusFormScreen}
        options={{ title: 'Bus details' }}
      />
      <MainStack.Screen
        name="RouteList"
        component={RouteListScreen}
        options={{ title: 'My routes' }}
      />
      <MainStack.Screen
        name="RouteForm"
        component={RouteFormScreen}
        options={{ title: 'Route details' }}
      />
      <MainStack.Screen
        name="TripList"
        component={TripListScreen}
        options={{ title: 'My trips' }}
      />
      <MainStack.Screen
        name="TripForm"
        component={TripFormScreen}
        options={{ title: 'Trip details' }}
      />
      <MainStack.Screen
        name="BusBookings"
        component={BusBookingsScreen}
        options={{ title: 'Bookings' }}
      />
      <MainStack.Screen
        name="BusBookingDetail"
        component={BusBookingDetailScreen}
        options={{ title: 'Booking' }}
      />
      <MainStack.Screen
        name="BusRevenue"
        component={BusRevenueScreen}
        options={{ title: 'Revenue' }}
      />
      <MainStack.Screen
        name="BusWallet"
        component={BusWalletScreen}
        options={{ title: 'Wallet' }}
      />
      <MainStack.Screen
        name="BusProfile"
        component={BusProfileScreen}
        options={{ title: 'Company profile' }}
      />
    </MainStack.Navigator>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    splash: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    headerTitle: {
      fontWeight: font.bold,
      fontSize: 18,
    },
    tabBar: {
      position: 'absolute',
      backgroundColor: 'transparent',
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: TAB_BAR_HEIGHT,
      paddingTop: 4,
      paddingBottom: 16,
      elevation: 0,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: font.semibold,
    },
    tabIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 30,
    },
    tabContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
