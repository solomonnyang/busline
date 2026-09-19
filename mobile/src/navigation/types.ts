import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Trip } from '../api/types';

export type AuthStackParamList = {
  Login: { tfaToken?: string } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };
};

export type MainTabsParamList = {
  Search: undefined;
  Bookings: undefined;
  Account: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  DriverDashboard: undefined;
  Results: { originId: number; destinationId: number; originName: string; destinationName: string };
  SeatSelection: { trip: Trip };
  BookingDetail: { id: number };
  Ticket: { id: number };
  TerminalDetail: { id: number; name: string };
  Profile: undefined;
  Payment: undefined;
  Offers: undefined;
  Loyalty: undefined;
  EarlyBird: undefined;
  Referral: undefined;
  Support: undefined;
  NewTicket: undefined;
  TicketThread: { id: number };
  Settings: undefined;
  TwoFactor: undefined;
  DeleteAccountFlow: undefined;
  AgentChat: undefined;
  // Bus vendor dashboard
  BusVendorDashboard: undefined;
  BusList: undefined;
  BusForm: { busId?: number } | undefined;
  RouteList: undefined;
  RouteForm: { routeId?: number } | undefined;
  TripList: undefined;
  TripForm: { tripId?: number } | undefined;
  BusBookings: undefined;
  BusBookingDetail: { id: number };
  BusRevenue: undefined;
  BusWallet: undefined;
  BusProfile: undefined;
};
