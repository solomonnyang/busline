import { API_BASE_URL, request, uploadFile } from './client';
import type {
  AgentMessage,
  AgentReply,
  Booking,
  BookingCreateResult,
  City,
  DriverTrip,
  LoginResult,
  LoyaltyOverview,
  LoyaltyRedeemResult,
  LoyaltyRules,
  Offer,
  PassengerInput,
  Payment,
  PriceHint,
  Profile,
  RegisterResult,
  SeatMapData,
  Session,
  Suggestion,
  SupportTicket,
  SupportTicketDetail,
  Terminal,
  TerminalDetail,
  TicketData,
  Trip,
  TwoFactorBackupCodes,
  TwoFactorEnableResult,
  TwoFactorSetup,
  TwoFactorStatus,
  WalletOverview,
  WalletTopupResult,
} from './types';

export function login(email: string, password: string) {
  return request<LoginResult>('/login', { method: 'POST', body: { email, password } });
}

export function verifyEmail(email: string, code: string) {
  return request<null>('/email/verify', { method: 'POST', body: { email, code } });
}

export function resendVerification(email: string) {
  return request<null>('/email/resend', { method: 'POST', body: { email } });
}

export function forgotPassword(email: string) {
  return request<null>('/password/forgot', { method: 'POST', body: { email } });
}

export function resetPassword(email: string, token: string, password: string) {
  return request<null>('/password/reset', {
    method: 'POST',
    body: { email, token, password },
  });
}

export function loginTwoFactor(tfaToken: string, code: string) {
  return request<Session>('/login/2fa', {
    method: 'POST',
    body: { tfa_token: tfaToken, code },
  });
}

export function fetchTwoFactorStatus() {
  return request<TwoFactorStatus>('/2fa');
}

export function setupTwoFactor() {
  return request<TwoFactorSetup>('/2fa/setup', { method: 'POST' });
}

export function enableTwoFactor(code: string, password: string) {
  return request<TwoFactorEnableResult>('/2fa/enable', {
    method: 'POST',
    body: { code, password },
  });
}

export function disableTwoFactor(code: string, password: string) {
  return request<{ enabled: boolean }>('/2fa/disable', {
    method: 'POST',
    body: { code, password },
  });
}

export function regenerateBackupCodes(password: string) {
  return request<TwoFactorBackupCodes>('/2fa/backup-codes', {
    method: 'POST',
    body: { password },
  });
}

export function registerCustomer(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  referral_code?: string;
}) {
  return request<RegisterResult>('/register/customer', { method: 'POST', body: payload });
}

export function fetchProfile() {
  return request<Profile>('/profile');
}

export function updateAvatar(avatarUrl: string) {
  return request<null>('/profile', {
    method: 'PUT',
    body: { avatar: avatarUrl },
  });
}

export function updateProfile(payload: {
  name?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
}) {
  return request<null>('/profile', {
    method: 'PUT',
    body: payload,
  });
}

export function deleteAccount() {
  return request<null>('/account', {
    method: 'DELETE',
  });
}

export function uploadAvatar(fileUri: string, mimeType = 'image/jpeg') {
  return uploadFile<{ url: string }>('/upload', fileUri, mimeType);
}

export function fetchCities() {
  return request<City[]>('/cities');
}

export function fetchOffers() {
  return request<Offer[]>('/offers');
}

export function fetchTerminals(cityId?: number) {
  const params = cityId != null ? `?city_id=${cityId}` : '';
  return request<Terminal[]>(`/terminals${params}`);
}

export function fetchSuggestions(q: string) {
  return request<Suggestion[]>(`/terminals/suggestions?q=${encodeURIComponent(q)}`);
}

export function fetchTerminal(id: number) {
  return request<TerminalDetail>(`/terminals/${id}`);
}

export function searchTrips(origin: number, destination: number, date?: string | null) {
  const params = `origin=${origin}&destination=${destination}${date ? `&date=${encodeURIComponent(date)}` : ''}`;
  return request<Trip[]>(`/trips?${params}`);
}

export function fetchPriceHints(origin: number) {
  return request<PriceHint[]>(`/trips/popular?origin=${origin}`);
}

export function fetchUpcomingTrips() {
  return request<Trip[]>(`/upcoming-trips`);
}

export function fetchTrip(id: number) {
  return request<Trip>(`/trips/${id}`);
}

export function fetchSeatMap(tripId: number) {
  return request<SeatMapData>(`/trips/${tripId}/seats`);
}

export function createBooking(payload: {
  trip_id: number;
  payment_method: 'wallet' | 'paystack';
  seats: number[];
  passengers: PassengerInput[];
  callback_url?: string;
}) {
  return request<BookingCreateResult>('/bookings', { method: 'POST', body: payload });
}

export function fetchBookings() {
  return request<Booking[]>(`/bookings`);
}

export function fetchBookingDetail(id: number) {
  return request<TicketData>(`/bookings/${id}`);
}

export function fetchTicket(id: number) {
  return request<TicketData>(`/bookings/${id}/ticket`);
}

export function cancelBooking(id: number) {
  return request<null>(`/bookings/${id}/cancel`, { method: 'POST' });
}

export function fetchPayments() {
  return request<Payment[]>('/payments');
}

export function fetchWallet() {
  return request<WalletOverview>('/wallet');
}

export function topupWallet(amount: number, callbackUrl?: string) {
  return request<WalletTopupResult>('/wallet/topup', {
    method: 'POST',
    body: { amount, callback_url: callbackUrl },
  });
}

export function checkWalletTopupStatus(reference: string) {
  return request<{ status: string }>(`/wallet/topup/status/${encodeURIComponent(reference)}`);
}

export function verifyWalletTopup(reference: string) {
  return request<WalletOverview>('/wallet/topup/verify', {
    method: 'POST',
    body: { reference },
  });
}

export function checkBookingPaymentStatus(reference: string) {
  return request<{ status: string; booking_id: number }>(
    `/payments/status/${encodeURIComponent(reference)}`
  );
}

export function verifyBookingPayment(reference: string) {
  return request<TicketData>('/payments/verify', {
    method: 'POST',
    body: { reference },
  });
}

export function fetchOfferRules() {
  return request<LoyaltyRules>('/offers/rules');
}

export function fetchLoyaltyOverview() {
  return request<LoyaltyOverview>('/loyalty/overview');
}

export function redeemPoints(points: number) {
  return request<LoyaltyRedeemResult>('/loyalty/redeem', {
    method: 'POST',
    body: { points },
  });
}

export function fetchSupportTickets() {
  return request<SupportTicket[]>('/support/tickets');
}

export function createSupportTicket(payload: {
  subject: string;
  message: string;
  category?: string;
  priority?: string;
}) {
  return request<SupportTicket>('/support/tickets', { method: 'POST', body: payload });
}

export function fetchSupportTicket(id: number) {
  return request<SupportTicketDetail>(`/support/tickets/${id}`);
}

export function replySupportTicket(id: number, message: string, replyTo?: number | null) {
  return request<SupportTicketDetail>(`/support/tickets/${id}/reply`, {
    method: 'POST',
    body: replyTo ? { message, reply_to: replyTo } : { message },
  });
}

export function reactToSupportMessage(ticketId: number, messageId: number, emoji: string) {
  return request<SupportTicketDetail>(`/support/tickets/${ticketId}/messages/${messageId}/react`, {
    method: 'POST',
    body: { emoji },
  });
}

export function agentChat(messages: AgentMessage[]) {
  return request<AgentReply>('/agent/chat', { method: 'POST', body: { messages } });
}

export function registerPushToken(token: string, platform: string, device?: string) {
  return request<null>('/push/register', {
    method: 'POST',
    body: { token, platform, device },
  });
}

export function unregisterPushToken(token: string) {
  return request<null>('/push/unregister', { method: 'POST', body: { token } });
}

export function fetchDriverTrips(params?: { status?: string }) {
  const suffix = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
  return request<DriverTrip[]>(`/driver/trips${suffix}`);
}

export function fetchDriverTripDetail(id: number) {
  return request<{ trip: Trip; driver_role: 'driver' | 'assistant'; assigned_at?: string | null; bookings?: unknown[] }>(
    `/driver/trips/${id}`
  );
}

export type RoadRouteResult = {
  coords: { latitude: number; longitude: number }[];
  distanceKm: number;
  durationSec: number;
};

/**
 * Fetch the drivable road route between two points. The backend proxies a
 * public routing service (OSRM) and caches hot routes, so devices only talk
 * to the trusted API origin. Returns null when routing fails so callers can
 * fall back to a straight-line polyline.
 */
export async function fetchRoadRoute(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number }
): Promise<RoadRouteResult | null> {
  try {
    const qs = [
      `from_lat=${origin.latitude}`,
      `from_lng=${origin.longitude}`,
      `to_lat=${dest.latitude}`,
      `to_lng=${dest.longitude}`,
    ].join('&');
    const res = await fetch(`${API_BASE_URL}/route/road?${qs}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const payload: { success?: boolean; data?: { coords?: [number, number][]; distance_km?: number; duration_sec?: number } } =
      await res.json();
    const data = payload.data;
    if (!payload.success || !data?.coords || data.coords.length < 2) return null;
    const round = (v: number) => Math.round(Number(v) * 100000) / 100000;
    const points = data.coords.map(([lat, lng]) => ({
      latitude: round(lat),
      longitude: round(lng),
    }));
    if (points.length < 2) return null;
    return {
      coords: points,
      distanceKm: Number(data.distance_km ?? 0),
      durationSec: Number(data.duration_sec ?? 0),
    };
  } catch {
    return null;
  }
}
