import { request } from './client';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface VendorCity {
  id: number;
  name: string;
  state?: string | null;
}

export interface VendorTerminal {
  id: number;
  name: string;
  city_id?: number | null;
  city_name?: string | null;
  address?: string | null;
}

export interface BusCategory {
  id: number;
  name: string;
  slug?: string | null;
  is_active?: number;
}

export interface SeatLayoutTemplate {
  id: number;
  name: string;
  is_active?: number;
}

export interface Bus {
  id: number;
  vendor_id: number;
  terminal_id?: number | null;
  bus_name: string;
  registration_number: string;
  bus_type?: string | null;
  category_id?: number | null;
  total_seats: number;
  seat_layout?: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  terminal_name?: string | null;
  category_name?: string | null;
}

export interface Route {
  id: number;
  vendor_id: number;
  origin_city_id: number;
  destination_city_id: number;
  distance_km: number;
  estimated_duration?: number | null;
  status: 'active' | 'inactive';
  origin_city?: string | null;
  destination_city?: string | null;
  origin_state?: string | null;
  destination_state?: string | null;
}

export interface Trip {
  id: number;
  vendor_id: number;
  bus_id: number;
  route_id: number;
  terminal_id?: number | null;
  departure_date: string;
  departure_time: string;
  arrival_time?: string | null;
  price: number;
  available_seats: number;
  status: string;
  bus_name?: string;
  bus_type?: string | null;
  registration_number?: string;
  total_seats?: number;
  origin_city?: string;
  destination_city?: string;
  bus_terminal_name?: string | null;
  bus_terminal_city?: string | null;
}

export interface BusVendorBooking {
  id: number;
  booking_number: string;
  trip_id: number;
  customer_name?: string | null;
  customer_email?: string | null;
  route_id?: number | null;
  bus_name?: string | null;
  registration_number?: string | null;
  origin_city?: string | null;
  destination_city?: string | null;
  total_amount: number;
  status: string;
  payment_status: string;
  booking_date: string;
  departure_date?: string;
  departure_time?: string;
  seats?: { id: number; seat_number?: string | null }[];
}

export interface BusVendorDashboard {
  widgets: {
    today_trips: number;
    total_bookings: number;
    revenue: number;
    available_buses: number;
  };
  recent_bookings: BusVendorBooking[];
  upcoming_trips: Trip[];
  vendor: Record<string, unknown>;
}

export interface BusVendorRevenue {
  from: string;
  to: string;
  total_revenue: number;
  total_bookings: number;
  avg_per_booking: number;
  best_day: { day: string; bookings: number; revenue: number } | null;
  daily: { day: string; bookings: number; revenue: number }[];
  route_breakdown: {
    route_id: number | null;
    origin_city?: string;
    destination_city?: string;
    bookings: number;
    revenue: number;
  }[];
  recent_bookings: {
    id: number;
    booking_number: string;
    total_amount: number;
    created_at: string;
    origin_city?: string;
    destination_city?: string;
    bus_name?: string;
    customer_name?: string;
    seat_count?: number;
  }[];
}

export interface Withdrawal {
  id: number;
  amount: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  reference: string;
  status: string;
  created_at?: string;
}

export interface BusVendorWallet {
  earned: number;
  withdrawn: number;
  pending: number;
  available: number;
  withdrawals: Withdrawal[];
}

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------

export function fetchBusVendorDashboard() {
  return request<BusVendorDashboard>('/vendor/dashboard');
}

// ------------------------------------------------------------------
// Buses
// ------------------------------------------------------------------

export function fetchBuses() {
  return request<Bus[]>('/vendor/buses');
}

export function createBus(payload: Record<string, unknown>) {
  return request<Bus>('/vendor/buses', { method: 'POST', body: payload });
}

export function updateBus(id: number, payload: Record<string, unknown>) {
  return request<Bus>(`/vendor/buses/${id}`, { method: 'PUT', body: payload });
}

export function deleteBus(id: number) {
  return request<null>(`/vendor/buses/${id}`, { method: 'DELETE' });
}

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------

export function fetchRoutes() {
  return request<Route[]>('/vendor/routes');
}

export function createRoute(payload: Record<string, unknown>) {
  return request<Route>('/vendor/routes', { method: 'POST', body: payload });
}

export function updateRoute(id: number, payload: Record<string, unknown>) {
  return request<Route>(`/vendor/routes/${id}`, { method: 'PUT', body: payload });
}

export function deleteRoute(id: number) {
  return request<null>(`/vendor/routes/${id}`, { method: 'DELETE' });
}

// ------------------------------------------------------------------
// Reference data
// ------------------------------------------------------------------

export function fetchVendorCities() {
  return request<VendorCity[]>('/vendor/cities');
}

export function fetchBusCategories() {
  return request<BusCategory[]>('/vendor/bus-categories');
}

export function fetchSeatLayoutTemplates() {
  return request<SeatLayoutTemplate[]>('/vendor/seat-layout-templates');
}

export function fetchVendorTerminals() {
  return request<VendorTerminal[]>('/vendor/terminals');
}

export function fetchAllTerminals() {
  return request<VendorTerminal[]>('/vendor/terminals/all');
}

export function updateVendorTerminals(terminalIds: number[]) {
  return request<VendorTerminal[]>('/vendor/terminals', {
    method: 'PUT',
    body: { terminal_ids: terminalIds },
  });
}

// ------------------------------------------------------------------
// Trips
// ------------------------------------------------------------------

export function fetchTrips(params?: { status?: string; route_id?: number; bus_id?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.route_id != null) qs.set('route_id', String(params.route_id));
  if (params?.bus_id != null) qs.set('bus_id', String(params.bus_id));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<Trip[]>(`/vendor/trips${suffix}`);
}

export function createTrip(payload: Record<string, unknown>) {
  return request<Trip>('/vendor/trips', { method: 'POST', body: payload });
}

export function updateTrip(id: number, payload: Record<string, unknown>) {
  return request<Trip>(`/vendor/trips/${id}`, { method: 'PUT', body: payload });
}

export function deleteTrip(id: number) {
  return request<null>(`/vendor/trips/${id}`, { method: 'DELETE' });
}

export function fetchTripDetail(id: number) {
  return request<{ trip: Trip; seats: unknown[]; layout: unknown; bookings: unknown[] }>(
    `/vendor/trips/${id}`
  );
}

// ------------------------------------------------------------------
// Bookings
// ------------------------------------------------------------------

export function fetchBusBookings(params?: {
  status?: string;
  payment_status?: string;
  route_id?: number;
  date_from?: string;
  date_to?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.payment_status) qs.set('payment_status', params.payment_status);
  if (params?.route_id != null) qs.set('route_id', String(params.route_id));
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<BusVendorBooking[]>(`/vendor/bookings${suffix}`);
}

export function createBusBooking(payload: {
  trip_id: number;
  seats: number[];
  passengers: { name: string; age?: number; gender?: string; price?: number }[];
  customer?: { name?: string; email?: string; phone?: string };
}) {
  return request<BusVendorBooking>('/vendor/bookings', { method: 'POST', body: payload });
}

export function fetchBusBookingDetail(id: number) {
  return request<{ booking: BusVendorBooking; seats: { id: number; seat_number?: string | null }[] }>(
    `/vendor/bookings/${id}`
  );
}

export function checkinBooking(id: number) {
  return request<null>(`/vendor/bookings/${id}/checkin`, { method: 'POST' });
}

// ------------------------------------------------------------------
// Revenue & wallet
// ------------------------------------------------------------------

export function fetchBusVendorRevenue() {
  return request<BusVendorRevenue>('/vendor/revenue');
}

export function fetchBusVendorWallet() {
  return request<BusVendorWallet>('/vendor/wallet');
}

export function createWithdrawal(payload: {
  amount: number;
  bank_name: string;
  account_name: string;
  account_number: string;
}) {
  return request<Withdrawal>('/vendor/withdrawals', { method: 'POST', body: payload });
}

// ------------------------------------------------------------------
// Profile
// ------------------------------------------------------------------

export function updateBusVendorProfile(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>('/vendor/profile', { method: 'PUT', body: payload });
}
