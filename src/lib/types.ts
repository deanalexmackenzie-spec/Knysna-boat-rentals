export type BookingStatus =
  | 'request'
  | 'deposit_pending'
  | 'deposit_paid'
  | 'docs_received'
  | 'balance_due'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'card' | 'eft';
export type PaymentState = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentKind = 'deposit' | 'balance';
export type DocumentType = 'id' | 'skipper_licence' | 'drivers_licence' | 'indemnity';
export type TemplateKey = 'received' | 'deposit' | 'docs' | 'confirmed';

export const BOOKING_STATUS_FLOW: BookingStatus[] = [
  'request',
  'deposit_pending',
  'deposit_paid',
  'docs_received',
  'balance_due',
  'confirmed',
  'completed',
];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  request: 'Request',
  deposit_pending: 'Deposit pending',
  deposit_paid: 'Deposit paid',
  docs_received: 'Docs & indemnity received',
  balance_due: 'Balance due',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  id: 'ID / passport',
  skipper_licence: "SAMSA skipper's licence",
  drivers_licence: "Driver's licence",
  indemnity: 'Signed indemnity',
};

export const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  received: 'Request received (sent immediately)',
  deposit: 'Deposit reminder (timed)',
  docs: 'Docs & indemnity reminder (before trip)',
  confirmed: 'Booking confirmed (deposit + docs complete)',
};

export interface Boat {
  id: string;
  slug: string;
  name: string;
  description: string;
  capacity: number;
  power: string;
  length_m: number;
  day_rate: number;
  skipper_rate: number;
  photo_paths: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  notes: string | null;
  created_at: string;
}

export interface CustomerSummary extends Customer {
  booking_count: number;
  total_paid: number;
  last_trip_date: string | null;
}

export interface Booking {
  id: string;
  reference: string;
  access_token: string;
  customer_id: string;
  boat_id: string;
  date: string;
  skipper: boolean;
  day_rate: number;
  skipper_rate: number;
  total_amount: number;
  deposit_amount: number;
  balance_amount: number;
  deposit_method: PaymentMethod;
  deposit_status: PaymentState;
  balance_status: PaymentState;
  indemnity_signed: boolean;
  indemnity_name: string | null;
  indemnity_signed_at: string | null;
  status: BookingStatus;
  notes: string | null;
  docs_purged_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingDocument {
  id: string;
  booking_id: string;
  type: DocumentType;
  file_path: string;
  file_name: string | null;
  uploaded_at: string;
  verified: boolean;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  gateway_ref: string | null;
  status: PaymentState;
  created_at: string;
}

export interface MessageTemplate {
  key: TemplateKey;
  subject: string;
  body: string;
  updated_at: string;
}

export interface MessageLogEntry {
  id: string;
  booking_id: string | null;
  template_key: TemplateKey | null;
  channel: string;
  recipient: string | null;
  status: string;
  error: string | null;
  sent_at: string;
}

export interface SiteContent {
  key: string;
  title: string;
  body: string;
  updated_at: string;
}

export interface Settings {
  deposit_percent: number;
  doc_retention_days: number;
  deposit_reminder_hours: number;
  docs_reminder_days: number;
}
