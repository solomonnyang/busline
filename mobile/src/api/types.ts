export interface City {
  id: number;
  name: string;
  state?: string | null;
  lat?: number;
  lng?: number;
  is_active?: number;
}

export interface Offer {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  badge?: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  icon?: string | null;
  color?: string | null;
  soft?: string | null;
  image?: string | null;
  is_active: number;
}

export interface Terminal {
  id: number;
  city_id: number;
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  city_name?: string | null;
  available_buses?: number;
  upcoming_buses?: number;
  next_departure?: string | null;
  next_departure_date?: string | null;
  min_price?: number | null;
  operators?: string[];
}

export interface Suggestion {
  type: 'city' | 'terminal';
  id: number;
  city_id?: number | null;
  label: string;
  sub: string | null;
  lat: number;
  lng: number;
}

export interface TerminalBus {
  trip_id: number;
  bus_id: number;
  route_id: number;
  status: string;
  bus_name: string | null;
  bus_type: string | null;
  registration_number: string | null;
  departure_date: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  price: number;
  available_seats: number;
  total_seats: number;
  vendor_id: number;
  origin_city: string | null;
  origin_city_id: number;
  destination_city: string | null;
  destination_city_id: number;
}

export interface TerminalVendorGroup {
  vendor_id: number;
  vendor_name: string;
  vendor_logo?: string | null;
  buses: TerminalBus[];
}

export interface TerminalDetail extends Terminal {
  city_state?: string | null;
  amenities_map?: Record<string, boolean>;
  amenities_list?: string[];
  est_duration_minutes?: number | null;
  distance_km?: number | null;
  buses_by_vendor: TerminalVendorGroup[];
}

export interface Trip {
  id: number;
  vendor_id: number;
  bus_id: number;
  route_id: number;
  departure_date: string;
  departure_time: string;
  arrival_time: string | null;
  price: number;
  available_seats: number;
  status: string;
  bus_name: string;
  bus_type: string;
  registration_number: string;
  category_name?: string | null;
  category_image?: string | null;
  total_seats?: number;
  origin_city: string;
  destination_city: string;
  origin_city_id: number;
  destination_city_id: number;
  vendor_name: string;
  vendor_phone?: string | null;
  vendor_logo?: string | null;
  bus_terminal_id?: number | null;
  bus_terminal_name?: string | null;
  bus_terminal_city?: string | null;
  bus_terminal_address?: string | null;
  vendor_terminal_id?: number | null;
}

export interface PriceHint {
  destination_city_id: number;
  destination_city: string | null;
  min_price: number;
  trip_count: number;
}

export interface DriverTrip extends Trip {
  driver_role: 'driver' | 'assistant';
  assigned_at?: string | null;
  passenger_count?: number;
}

export interface Seat {
  id: number;
  bus_id: number;
  seat_number: string;
  seat_row: number;
  seat_column: string;
  seat_type: string;
  reserved: boolean;
}

export interface SeatMapData {
  trip: Trip;
  seats: Seat[];
  layout: {
    columns?: string[];
    rows?: number | (string | null)[][];
  } | null;
}

export interface Booking {
  id: number;
  booking_number: string;
  trip_id: number;
  booking_date: string;
  total_amount: number;
  seat_count: number;
  status: string;
  payment_status: string;
  qr_code?: string | null;
  departure_date: string;
  departure_time: string;
  arrival_time: string | null;
  bus_name: string;
  bus_type: string;
  registration_number: string;
  origin_city: string;
  destination_city: string;
  vendor_name: string;
  vendor_phone?: string | null;
  vendor_logo?: string | null;
  trip_price?: number;
  origin_lat?: number | string | null;
  origin_lng?: number | string | null;
  destination_lat?: number | string | null;
  destination_lng?: number | string | null;
  seats?: BookingSeat[];
}

export interface BookingSeat {
  id: number;
  booking_id: number;
  trip_id: number;
  seat_id: number;
  passenger_name: string;
  passenger_age?: number | null;
  passenger_gender?: string | null;
  ticket_price: number;
  seat_number: string;
}

export interface Payment {
  id: number;
  booking_id: number;
  payment_reference: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at?: string | null;
  transaction_id?: string | null;
  paystack_ref?: string | null;
  booking_number?: string;
  booking_date?: string;
  origin_city?: string | null;
  destination_city?: string | null;
}

export interface TicketData {
  booking: Booking;
  seats: BookingSeat[];
  payments: Payment[];
  qr: string | null;
}

export interface Profile {
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
    role_slug: string;
    two_factor_enabled?: number;
  };
  profile?: Record<string, unknown> | null;
  staff?: StaffInfo | null;
}

export interface StaffInfo {
  id: number;
  vendor_id: number;
  role: string;
  position?: string | null;
  department?: string | null;
  is_active: number;
  permissions?: string[];
}

export interface Session {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
    role_slug: string;
    two_factor_enabled?: number;
  };
  profile?: Record<string, unknown> | null;
  staff?: StaffInfo | null;
}

export type LoginResult =
  | (Session & { requires_2fa?: false; requires_verification?: false })
  | LoginChallenge
  | VerificationChallenge;

export interface LoginChallenge {
  requires_2fa: true;
  requires_verification?: false;
  tfa_token: string;
  user: Session['user'];
}

export interface VerificationChallenge {
  requires_verification: true;
  requires_2fa?: false;
  email: string;
  user: Session['user'];
}

export interface RegisterResult {
  user: Session['user'];
  customer?: Record<string, unknown> | null;
  vendor?: Record<string, unknown> | null;
  referral_code?: string;
  email_verified?: boolean;
  token?: string | null;
}

export interface TwoFactorStatus {
  enabled: boolean;
  backup_codes_left: number;
}

export interface TwoFactorSetup {
  secret: string;
  otpauth_url: string;
  qr_data_uri: string;
}

export interface TwoFactorEnableResult {
  enabled: boolean;
  backup_codes: string[];
}

export interface TwoFactorBackupCodes {
  backup_codes: string[];
}

export interface BookingCreateResult {
  booking: Booking;
  payment_ref: string;
  authorization_url: string | null;
  paystack_error?: string | null;
}

export interface PassengerInput {
  name: string;
  age?: number | null;
  gender?: string | null;
}

export interface Wallet {
  id: number;
  customer_id: number;
  balance: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  type: 'credit' | 'debit';
  amount: number | string;
  reference: string;
  description?: string | null;
  status: 'pending' | 'success' | 'failed';
  payment_method?: string | null;
  paystack_ref?: string | null;
  paid_at?: string | null;
  created_at?: string;
}

export interface WalletOverview {
  wallet: Wallet;
  transactions: WalletTransaction[];
}

export interface WalletTopupResult {
  transaction: WalletTransaction;
  authorization_url: string | null;
}

export interface LoyaltyRules {
  loyalty: {
    points_per_booking: number;
    points_value_ngn: number;
    min_points_redeem: number;
  };
  early_bird: {
    days: number;
    discount_percent: number;
  };
  referral: {
    commission_percent: number;
    signup_url: string;
  };
}

export interface LoyaltyPoint {
  id: number;
  customer_id: number;
  points: number;
  type: 'earn' | 'redeem';
  source: string;
  description: string;
  reference: string;
  booking_id?: number | null;
  created_at: string;
}

export interface ReferralEntry {
  id: number;
  referrer_customer_id: number;
  referred_user_id: number;
  referred_customer_id: number;
  code: string;
  status: 'registered' | 'qualified';
  commission_amount: number | string;
  booking_id?: number | null;
  referred_name?: string | null;
  referred_email?: string | null;
  created_at?: string;
}

export interface LoyaltyOverview {
  balance: number;
  history: LoyaltyPoint[];
  rules: LoyaltyRules;
  referral_code: string;
  referral_link: string;
  referrals: ReferralEntry[];
  commission_earned: number;
}

export interface LoyaltyRedeemResult {
  redeemed_points: number;
  amount: number;
  balance: number;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: number;
  ticket_number: string;
  user_id: number;
  subject: string;
  category: string;
  priority: string;
  status: SupportTicketStatus;
  assigned_to?: number | null;
  needs_human?: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface MessageReaction {
  emoji: string;
  user_id: number;
  sender_name?: string | null;
  created_at: string;
}

export interface SupportTicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  body: string;
  is_admin: number | string;
  created_at: string;
  sender_name?: string | null;
  reply_to_id?: number | null;
  reply_to_body?: string | null;
  reactions?: MessageReaction[];
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportTicketMessage[];
}

export const SUPPORT_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
] as const;

export const SUPPORT_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

export const SUPPORT_TICKET_STATUSES: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentSeatOption {
  id: number;
  seat_number: string;
  seat_row: number;
  seat_column: string;
  price: number;
  reserved: boolean;
}

export type AgentCardType =
  | 'booking'
  | 'ticket'
  | 'trip'
  | 'wallet'
  | 'offers'
  | 'support'
  | 'terminal'
  | 'bus'
  | 'seatmap'
  | 'confirm'
  | 'payment'
  | 'paystack';

export interface AgentCard {
  type: AgentCardType;
  id?: number;
  title: string;
  subtitle?: string;
  detail?: string;
  originId?: number;
  destinationId?: number;
  originName?: string;
  destinationName?: string;
  /** Selection token sent back to the AI when the card is tapped. */
  action?: string;
  /** Seat map payload for the inline seat picker. */
  seats?: AgentSeatOption[];
  layout?: SeatMapData['layout'];
  /** Full trip payload for bus cards (deep-link to seat selection). */
  trip?: Trip;
  /** Payment method key for payment cards (wallet|cash|paystack). */
  method?: string;
  /** Paystack checkout URL for paystack cards. */
  url?: string;
  /** Paystack payment reference for paystack cards. */
  reference?: string;
}

export interface AgentReply {
  reply: string;
  cards: AgentCard[];
}
