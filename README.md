# Knysna Boat Rentals

Production build of the Knysna Boat Rentals site: a public booking site for a
six-boat fleet on the Knysna estuary, plus a private owner dashboard for fleet,
availability, deposits, documents and follow-ups.

- **Framework** — Next.js 16 (App Router) + Tailwind v4, deployed on Vercel
- **Data / auth / storage** — Supabase (Postgres, Auth, Storage)
- **Payments** — PayFast (card deposits, optional), ITN webhook
- **Email** — Resend, using four owner-editable templates

Day rate only, no hourly or half-day. Optional skipper add-on per day. The
deposit is 50% of (day rate + skipper fee); the balance is settled on collection.

---

## 1. Setup

```bash
cp .env.example .env.local     # fill in the values below
npm install
npm run dev                    # http://localhost:3000
```

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql`.
   Both are idempotent, so re-running them is safe. The schema creates the
   `boat-photos` (public) and `documents` (private) storage buckets and their
   policies; the seed loads the six boats, the four message templates, and the
   terms / indemnity / privacy / safety copy.
3. Copy the project URL, the anon key and the **service-role** key from
   **Project Settings → API** into `.env.local`.
4. Create the owner's login under **Authentication → Users → Add user**
   (email + password, "Auto Confirm User" on). There is no public sign-up —
   any confirmed Supabase user is the owner, so create exactly the accounts
   that should have dashboard access.

### PayFast

Card payments are optional. Leave every `PAYFAST_*` variable unset and the site
runs EFT-only — the booking page offers bank transfer alone.

To enable cards, set `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY` and
`PAYFAST_MODE` (exactly `sandbox` or `live`), plus `PAYFAST_PASSPHRASE` if the
account has one. Sandbox credentials and test cards are published in the PayFast
developer docs; live credentials come from the PayFast dashboard. Going live is
just a change of those values — the same code signs and validates both.

**There is no fallback.** A half-set or mistyped PayFast environment throws at
startup instead of quietly defaulting to sandbox, and a production build refuses
to run in sandbox mode at all unless `PAYFAST_ALLOW_SANDBOX=true` is set for a
deliberate staging deployment. Copying `.env.example` to `.env` without editing
it also fails loudly, because the placeholder values are rejected. The failure
mode being guarded against is a live site that takes bookings, shows a normal
checkout, and never collects a cent.

The ITN webhook is `POST /api/payfast/notify`. It must be reachable from the
internet, so use a tunnel (`ngrok http 3000`) when testing locally and set
`NEXT_PUBLIC_SITE_URL` to the tunnel URL — the notify URL is derived from it.

### Email

Create a Resend API key and verify the sending domain, then set `RESEND_API_KEY`,
`EMAIL_FROM` and `OWNER_EMAIL`. Without those the app still works: emails are
skipped, logged to the console, and recorded in `message_log` with a reason, so
a missing mail configuration never blocks a booking.

### Scheduled reminders

`vercel.json` runs `GET /api/cron/reminders` daily at 07:00 UTC. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set as
a project environment variable. Off Vercel, hit the same endpoint from any
scheduler with that header (or `?secret=…`).

Each run:

- sends the **deposit reminder** when a deposit is still unpaid 48 hours after
  the request;
- sends the **documents reminder** 3 days before a trip when anything is
  missing;
- marks past trips `completed`;
- **purges documents** 30 days after the trip (POPIA retention).

The intervals live in the `settings` table, not in code.

---

## 2. How it fits together

### Public site

| Route | What it is |
| --- | --- |
| `/` | Hero, info strip, fleet grid, destination section, CTA band |
| `/fleet` | All boats with capacities, power, length and rates |
| `/fleet/[slug]` | One boat, gallery, prices, availability calendar and booking box |
| `/knysna` | Knysna & the lagoon |
| `/safety` | Lagoon map illustration, safety notes, emergency panel |
| `/terms` | Rental terms, with the indemnity modal |
| `/privacy` | POPIA privacy notice |
| `/booking/[reference]?t=…` | The customer's private booking page |

The indemnity opens in an enlarged modal from three discreet links — the footer,
the terms page and the booking box — and carries the signature block. Away from
a booking the block explains that signing happens on the booking page; on the
booking page it captures the signature.

### Booking flow

1. The customer picks a boat, an open date and self-drive or skippered. Dates
   that are booked or owner-closed are not offered at all.
2. `POST /api/bookings` upserts the customer **on phone number** (that is the
   client-log key), creates the booking, emails the "request received" template,
   notifies the owner, and moves the status to `deposit_pending`.
3. The customer lands on their private booking page, where they pay the deposit
   by card (PayFast) or read the EFT details, sign the indemnity, and upload
   their ID and skipper's licence.
4. PayFast's ITN marks the deposit paid; EFT deposits are marked by the owner.

A partial unique index on `(boat_id, date)` for non-cancelled bookings is what
actually prevents a double booking — two simultaneous requests for the same day
cannot both succeed, whatever the calendar showed.

### Status workflow

Status is derived from the facts rather than clicked through by hand
(`src/lib/bookings.ts`):

| Status | Condition |
| --- | --- |
| `request` | just created, no email issued yet |
| `deposit_pending` | deposit outstanding, documents outstanding |
| `docs_received` | documents complete, deposit still outstanding |
| `deposit_paid` | deposit in, documents outstanding |
| `balance_due` | deposit and documents both in — the confirmation email fires here |
| `confirmed` | balance settled |
| `completed` / `cancelled` | terminal; set by the owner or by the cron job |

"Documents complete" means the indemnity is signed, an ID is on file, and — for
a self-drive hire — a SAMSA skipper's licence too.

### Owner dashboard (`/dashboard`, login required)

- **Bookings** — the diary, filtered by upcoming / needs action / past /
  cancelled, with deposit, balance and document state per row. The detail page
  marks payments received, opens documents through five-minute signed URLs,
  verifies or deletes them, keeps internal notes, and resends any of the four
  messages with one click.
- **Openings** — per-boat calendar. Click a date to open or close it; closed
  dates vanish from the customer calendar; booked dates are locked until the
  booking is cancelled. Open-all / close-all for the visible month.
- **Client log** — one record per client with contact details, every booking and
  its status, and lifetime spend (from the `customer_summary` view).
- **Fleet** — add, edit, publish, hide or delete boats and set both rates.
  Photos are chosen from the device (file picker or drag-and-drop) — **there is
  nowhere to paste a URL**. Each file is resized to 1600px and re-encoded as
  JPEG in the browser, uploaded to Supabase Storage, and only the storage path
  is stored.
- **Auto-replies** — the four templates, with the placeholder set
  (`{name} {boat} {date} {deposit} {balance} {total} {method} {reference} {link}
  {bank_details}`) as click-to-insert chips.
- **Terms & copy** — the terms, indemnity, banking details, privacy notice and
  page copy, with a live preview. Saved copy renders straight onto the site.

---

## 3. Data, privacy and security

- **Cards** — no card data touches this application. PayFast hosts the payment
  page; we store only its `pf_payment_id` for reconciliation.
- **ITN validation** — four checks before a payment is trusted: the MD5
  signature, PayFast's own server-side validation call, the source IP against
  PayFast's published hosts, and the gross amount against the quoted deposit.
  The handler is idempotent, so repeated notifications are harmless.
- **Documents** — ID copies and skipper's licences are sensitive personal
  information under POPIA. They live in a private bucket, are never public, are
  served only through short-lived signed URLs to a logged-in owner, and are
  deleted 30 days after the trip (configurable in `settings.doc_retention_days`).
- **RLS** — anonymous users can read only `boats`, `blocked_dates` and
  `site_content`. The availability calendar is assembled on the server, so
  booked dates reach the browser as bare dates with no customer data attached
  (a `public_booked_dates` function is provided for querying them directly from
  the client if that is ever wanted). Every write
  goes through a server route or server action using the service-role key, and
  every one of those re-checks the session rather than trusting the proxy.
- **Booking links** — a customer's booking page is guarded by a random
  `access_token` in the URL, compared in constant time.

### Before going live

- Have the rental terms **and** the indemnity reviewed by a South African
  attorney. The CPA limits what a waiver can exclude, and gross negligence
  cannot be excluded at all — §6 of the seeded indemnity says so, but the whole
  document needs a professional read.
- Fill in the real banking details, phone number and email (Dashboard →
  Terms & copy, and `src/components/site/Footer.tsx`).
- Verify the emergency numbers on the safety page — they change.
- Confirm the deposit percentage, per-boat security deposits and the fuel
  charge rate.
- Register an information officer with the Information Regulator if the
  operator has not already done so.
- The lagoon map is an original schematic drawn for this site
  (`src/components/site/LagoonMap.tsx`). Using the official Barefoot Clients or
  SANParks map instead would need their permission.

---

## 4. Project layout

```
src/
  app/
    (site)/          public pages, share the header/footer chrome
    dashboard/       owner UI + server actions (actions.ts)
    api/
      bookings/      booking request
      indemnity/     electronic signature capture
      documents/     customer document upload (private bucket)
      payfast/notify PayFast ITN webhook
      cron/reminders scheduled reminders, completion and retention purge
    login/
  components/
    site/            public components (calendar, booking box, modal, map)
    dash/            dashboard components
  lib/
    bookings.ts      availability, references, status derivation
    payfast.ts       signing, ITN verification
    notifications.ts template rendering and sending
    pricing.ts       deposit/balance arithmetic, ZAR formatting
    images.ts        browser-side resize/re-encode
supabase/
  schema.sql         tables, RLS, buckets, view (idempotent)
  seed.sql           six boats, four templates, site copy (idempotent)
```

## 5. Scripts

```bash
npm run dev         # development server
npm run build       # production build (type-checks)
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
```
