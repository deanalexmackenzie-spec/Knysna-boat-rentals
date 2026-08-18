import { createHash } from 'crypto';

export type PayfastMode = 'sandbox' | 'live';

export interface PayfastConfig {
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
  mode: PayfastMode;
}

/**
 * PayFast configuration, resolved once from the environment.
 *
 * There is deliberately NO fallback to sandbox. A half-configured or
 * mistyped environment throws at import time rather than quietly pointing
 * live customers at sandbox.payfast.co.za, where a checkout looks completely
 * normal and no money is ever collected.
 *
 * Three outcomes:
 *   - no PAYFAST_* variables at all  → card payments are off, EFT only
 *   - all of them, valid             → card payments on
 *   - anything in between            → throw, loudly, at startup
 */

// Values still carrying the shape of a .env.example placeholder.
const PLACEHOLDER = /^(your[-_]|changeme|xxx+$|<.*>$)/i;

function readCredential(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  if (PLACEHOLDER.test(raw)) {
    throw new Error(
      `${name} is still set to the placeholder from .env.example. Put the real ` +
        `PayFast value in your environment, or unset every PAYFAST_* variable to ` +
        `run EFT-only.`,
    );
  }
  return raw;
}

function resolveConfig(): PayfastConfig | null {
  const merchantId = readCredential('PAYFAST_MERCHANT_ID');
  const merchantKey = readCredential('PAYFAST_MERCHANT_KEY');
  const rawMode = process.env.PAYFAST_MODE?.trim().toLowerCase();

  // Nothing configured at all: an intentional EFT-only deployment.
  if (!merchantId && !merchantKey && !rawMode) return null;

  const missing: string[] = [];
  if (!merchantId) missing.push('PAYFAST_MERCHANT_ID');
  if (!merchantKey) missing.push('PAYFAST_MERCHANT_KEY');
  if (rawMode !== 'live' && rawMode !== 'sandbox') {
    missing.push("PAYFAST_MODE (must be exactly 'live' or 'sandbox')");
  }

  if (missing.length > 0) {
    throw new Error(
      `PayFast is partially configured — missing or invalid: ${missing.join(', ')}. ` +
        `Refusing to start rather than guess a mode and take no money. Set all of ` +
        `them, or unset every PAYFAST_* variable to run EFT-only.`,
    );
  }

  const mode = rawMode as PayfastMode;

  // Sandbox in a production build means every deposit silently goes nowhere.
  if (mode === 'sandbox' && process.env.NODE_ENV === 'production') {
    if (process.env.PAYFAST_ALLOW_SANDBOX !== 'true') {
      throw new Error(
        'PAYFAST_MODE=sandbox in a production build: customers would complete a ' +
          'checkout that never collects a cent. Set PAYFAST_MODE=live, or set ' +
          'PAYFAST_ALLOW_SANDBOX=true if this really is a staging deployment.',
      );
    }
    console.warn('[payfast] running in SANDBOX mode — no real payments will be taken.');
  }

  return {
    merchantId: merchantId!,
    merchantKey: merchantKey!,
    passphrase: process.env.PAYFAST_PASSPHRASE?.trim() || undefined,
    mode,
  };
}

let resolved: PayfastConfig | null | undefined;

export function payfastConfig(): PayfastConfig | null {
  if (resolved === undefined) resolved = resolveConfig();
  return resolved;
}

export function requirePayfastConfig(): PayfastConfig {
  const config = payfastConfig();
  if (!config) {
    throw new Error('PayFast is not configured — no PAYFAST_* variables are set.');
  }
  return config;
}

export function payfastMode(): PayfastMode {
  return requirePayfastConfig().mode;
}

// Validate at module load, so a bad environment fails on startup rather than
// at the moment a customer clicks "pay".
payfastConfig();

export function payfastProcessUrl(): string {
  return payfastMode() === 'live'
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process';
}

function payfastValidateUrl(): string {
  return payfastMode() === 'live'
    ? 'https://www.payfast.co.za/eng/query/validate'
    : 'https://sandbox.payfast.co.za/eng/query/validate';
}

/**
 * PayFast urlencodes with uppercase hex and encodes spaces as '+'.
 * encodeURIComponent leaves !'()* alone and lowercases nothing, so those are
 * fixed up here.
 */
function pfEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}

/**
 * Signature over the fields in the given order (PayFast signs the payload in
 * the order the fields are submitted, not alphabetically), with the passphrase
 * appended when one is configured.
 */
export function signPayload(entries: [string, string][], passphrase?: string): string {
  const parts = entries
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${pfEncode(String(v))}`);

  if (passphrase) parts.push(`passphrase=${pfEncode(passphrase)}`);

  return createHash('md5').update(parts.join('&')).digest('hex');
}

export interface CheckoutInput {
  reference: string;
  amount: string; // "4600.00"
  itemName: string;
  itemDescription: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

/**
 * Ordered field list for the checkout form. PayFast requires the signature to
 * be computed over exactly these fields in exactly this order.
 */
export function buildCheckoutFields(input: CheckoutInput): [string, string][] {
  const config = requirePayfastConfig();

  const fields: [string, string][] = [
    ['merchant_id', config.merchantId],
    ['merchant_key', config.merchantKey],
    ['return_url', input.returnUrl],
    ['cancel_url', input.cancelUrl],
    ['notify_url', input.notifyUrl],
    ['name_first', input.firstName],
    ['name_last', input.lastName],
  ];

  if (input.email) fields.push(['email_address', input.email]);

  fields.push(
    ['m_payment_id', input.reference],
    ['amount', input.amount],
    ['item_name', input.itemName],
    ['item_description', input.itemDescription],
  );

  const signature = signPayload(fields, config.passphrase);
  fields.push(['signature', signature]);

  return fields;
}

export function payfastConfigured(): boolean {
  return payfastConfig() !== null;
}

/**
 * Recompute the ITN signature from the posted fields, preserving PayFast's
 * ordering, and compare against the one supplied.
 */
export function verifyItnSignature(rawBody: string): boolean {
  const pairs = rawBody
    .split('&')
    .map((part) => part.split('='))
    .map(([k, v = '']) => [decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, ' '))]) as [
    string,
    string,
  ][];

  const supplied = pairs.find(([k]) => k === 'signature')?.[1];
  if (!supplied) return false;

  const expected = signPayload(
    pairs.filter(([k]) => k !== 'signature'),
    requirePayfastConfig().passphrase,
  );

  return timingSafeEqual(supplied.toLowerCase(), expected.toLowerCase());
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Ask PayFast to confirm it really sent this ITN. */
export async function validateItnWithPayfast(rawBody: string): Promise<boolean> {
  try {
    const res = await fetch(payfastValidateUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rawBody,
      cache: 'no-store',
    });
    const text = (await res.text()).trim();
    return text.startsWith('VALID');
  } catch {
    return false;
  }
}

/** PayFast's published ITN source hosts. */
const PAYFAST_HOSTS = [
  'www.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za',
  'sandbox.payfast.co.za',
];

export async function isPayfastSourceIp(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  try {
    const { promises: dns } = await import('dns');
    const lists = await Promise.all(
      PAYFAST_HOSTS.map((host) => dns.resolve4(host).catch(() => [] as string[])),
    );
    return lists.flat().includes(ip);
  } catch {
    return false;
  }
}
