# TicketBook — Ticket Booking System

A full-stack ticket booking platform for movies and concerts with real-time seat maps, TTL-based seat holds, automatic waitlist assignment, and QR-code email tickets.

**Live demo:** _Add your Vercel URL here_  
**Tech stack:** Next.js 15 · Supabase (Postgres + Auth + Realtime + Edge Functions + pg_cron) · Resend (email) · Vercel

---

## Architecture Overview

There is **no custom backend server**. All business logic lives inside Postgres `security definer` functions called directly from the frontend via `supabase.rpc()`. Supabase handles auth, real-time pub/sub, and the scheduler. The frontend is a Next.js App Router SPA deployed on Vercel.

```
Browser (Next.js)
   │
   ├── supabase.rpc()     → Postgres Functions (hold, confirm, cancel, waitlist)
   ├── supabase.from()    → RLS-protected table reads
   └── supabase.channel() → Realtime seat-status updates
                                 │
                           Supabase Platform
                           ├── PostgreSQL (schema + functions + triggers + pg_cron)
                           ├── Auth (email/password)
                           ├── Realtime (seat map live updates)
                           └── Edge Functions (email + QR generation via Resend)
```

---

## Features

| Role | Capabilities |
|------|-------------|
| **Customer** | Register/login, browse & filter events, visual seat map, hold seats (10 min TTL), confirm booking, view history, cancel booking, join waitlist |
| **Organiser** | Create events (movie/concert), schedule shows with venue + per-category pricing, view revenue dashboard with booking table |
| **Admin** | Create venues with custom seat layouts (sections, rows, categories), manage all venues |

**Core mechanics:**
- 🔒 Row-level locking prevents two customers ever booking the same seat
- ⏱️ Seat holds auto-expire via `pg_cron` sweep + client-side lazy expiry
- 📋 Waitlist trigger auto-assigns freed seats to next queued customer
- 📧 Email + QR ticket generated asynchronously via Edge Function
- ⚡ Real-time seat map updates via Supabase Realtime channels

---

## Setup Guide

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Resend](https://resend.com) account for email (free tier: 3,000 emails/month)
- A [Vercel](https://vercel.com) account for deployment

---

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL**, **anon key**, and **service role key** from Project Settings → API

---

### 2. Run Database Migrations

In the Supabase SQL Editor, run each file **in order**:

```
supabase/migrations/0001_schema.sql       -- tables, views, indexes
supabase/migrations/0002_rls.sql          -- Row Level Security policies
supabase/migrations/0003_functions.sql    -- hold_seats, confirm_booking, etc.
supabase/migrations/0004_cron.sql         -- pg_cron jobs for TTL sweeps
supabase/migrations/0005_organiser_admin_rpcs.sql  -- create_event, create_show, create_venue
```

> **Do not run `0005_seed.sql` yet** — it needs at least one admin profile to exist first.

---

### 3. Configure `pg_net` for Edge Function Calls

The cron job that processes the email outbox calls your Edge Function over HTTP. Set these once in the SQL editor:

```sql
ALTER DATABASE postgres
  SET app.settings.edge_function_url = 'https://<project-ref>.functions.supabase.co';

ALTER DATABASE postgres
  SET app.settings.service_role_key = '<your-service-role-key>';
```

---

### 4. Deploy the Edge Function

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login and link to your project
supabase login
supabase link --project-ref <project-ref>

# Deploy
supabase functions deploy process-outbox

# Set secrets
supabase secrets set \
  RESEND_API_KEY=re_... \
  RESEND_FROM_ADDRESS=tickets@yourdomain.com \
  FRONTEND_URL=https://your-app.vercel.app
```

Also create a **public Storage bucket** named `qr-tickets`:  
Supabase Dashboard → Storage → New Bucket → Name: `qr-tickets` → Public: ✅

---

### 5. Create Admin + Organiser Accounts

Sign up via the app's `/register` page, then promote roles in the SQL editor:

```sql
-- Promote to admin
UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');

-- Promote to organiser
UPDATE profiles SET role = 'organiser'
WHERE id = (SELECT id FROM auth.users WHERE email = 'organiser@example.com');
```

After this, those users will see the **Admin Panel** / **Organiser** links in the navbar after refreshing.

---

### 6. Seed Demo Data (Optional)

Once an admin account exists, run `supabase/migrations/0005_seed.sql` to create a sample venue, event, and show.

---

### 7. Run the Frontend Locally

```bash
cd frontend
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
# → http://localhost:3000
```

---

### 8. Deploy to Vercel

```bash
# From the frontend/ directory
npx vercel --prod
```

Or connect via the Vercel dashboard:
1. Import the GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

---

## Environment Variables

See [`frontend/.env.example`](./frontend/.env.example) for the full list.

| Variable | Where used | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function only | ✅ |
| `RESEND_API_KEY` | Edge Function | ✅ for emails |
| `RESEND_FROM_ADDRESS` | Edge Function | ✅ for emails |
| `FRONTEND_URL` | Edge Function (waitlist offer links) | ✅ |

---

## Project Structure

```
ticket-booking/
├── README.md
├── SYSTEM_DESIGN.md          ← 800-word design write-up
├── API_REFERENCE.md          ← RPC function contracts
├── 01-architecture-and-data-model.md
├── 02-core-logic-concurrency-and-build-order.md
├── 03-frontend-integration-deployment-and-qa.md
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql         ← All tables, views, indexes
│   │   ├── 0002_rls.sql            ← Row Level Security policies
│   │   ├── 0003_functions.sql      ← Core RPCs + waitlist trigger
│   │   ├── 0004_cron.sql           ← pg_cron TTL sweep jobs
│   │   └── 0005_organiser_admin_rpcs.sql ← Management RPCs
│   └── functions/
│       └── process-outbox/
│           └── index.ts            ← Email + QR Edge Function
│
└── frontend/
    ├── .env.example
    ├── src/
    │   ├── app/
    │   │   ├── events/             ← Browse + filter events
    │   │   ├── shows/[id]/         ← Seat map + booking flow
    │   │   ├── booking/[id]/       ← Confirmation + QR
    │   │   ├── bookings/           ← Booking history
    │   │   ├── login/ register/    ← Auth
    │   │   ├── waitlist/offer/[token]/ ← Claim waitlist offer
    │   │   ├── organiser/          ← Organiser portal
    │   │   └── admin/              ← Admin portal
    │   ├── components/
    │   │   ├── SeatMap.tsx
    │   │   ├── BookingSummaryCard.tsx
    │   │   ├── CheckoutTimer.tsx
    │   │   ├── EventCard.tsx
    │   │   └── Navbar.tsx
    │   ├── hooks/
    │   │   ├── useSeatMap.ts       ← Realtime seat subscriptions
    │   │   └── useHoldCountdown.ts
    │   └── lib/
    │       ├── supabaseClient.ts
    │       └── types.ts
    └── package.json
```

---

# Ticket Booking System — 01. Architecture & Data Model

## 1. Guiding principles

1. **Postgres (via Supabase) is the single source of truth for seat state.** No seat availability logic lives in application/frontend code — it lives in the database as functions, constraints, and row locks. This is non-negotiable for the concurrency guarantees the project is evaluated on.
2. **No custom backend server.** Supabase replaces the entire Express/FastAPI layer:
   - Auth + RBAC → Supabase Auth + `profiles` table + Row Level Security (RLS)
   - Business logic + concurrency → Postgres functions (RPC), called directly from the frontend via `supabase.rpc(...)`
   - Real-time seat map → Supabase Realtime (`postgres_changes` subscriptions)
   - TTL sweeps → `pg_cron` calling SQL functions
   - Email + QR → one Supabase Edge Function, triggered by a Database Webhook
3. **Seat state is per-show, not per-venue.** A venue's seat layout is a static template (`venue_seats`). Every show gets its own materialized copy (`show_seats`) with independent status tracking.
4. **Every state-changing operation is atomic.** Hold, release, book, cancel, and waitlist-assign all happen inside a single Postgres function body (implicit transaction), using `SELECT ... FOR UPDATE` row locks.
5. **History is preserved.** Holds and waitlist offers are never deleted — they're status-flipped (`active → expired/converted/released`) so the system has an audit trail.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind |
| Backend | None — Supabase-native (Postgres functions + RLS + Realtime + pg_cron) |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email/password) |
| Real-time | Supabase Realtime (`postgres_changes`) |
| Scheduled jobs | `pg_cron` extension |
| Email | Resend (via Edge Function) |
| QR generation | Edge Function (Deno-compatible QR lib) or generated client-side and stored as a data URL |
| Hosting — frontend | Vercel |
| Hosting — everything else | Supabase (managed) |

No separate Render/Railway service is needed under this architecture. If a background worker ever becomes necessary beyond `pg_cron`'s capabilities, it can be added later without touching the DB layer — but for this scope, it isn't needed.

---

## 3. Entity relationship overview

```
auth.users (Supabase-managed)
   └── profiles (role: customer | organiser | admin)

venues (admin-owned)
   └── venue_seats (static layout template: row, seat_number, category, x/y position)

events (organiser-owned)
   └── shows (date, time, venue_id, status)
         ├── show_categories (per-show pricing per category)
         └── show_seats (materialized per-show seat state — THE hot table)
               ├── seat_holds (audit trail of holds, incl. expired/converted)
               └── booking_seats (join table → bookings)

bookings (customer)
   └── booking_seats

waitlist_entries (per show + category queue)
   └── waitlist_offers (audit trail of time-limited offers made against an entry)
```

---

## 4. Full schema

```sql
-- =====================================================================
-- Extensions
-- =====================================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- =====================================================================
-- Profiles (extends Supabase auth.users with app-specific role)
-- =====================================================================
create table profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    name        text not null,
    role        text not null check (role in ('customer','organiser','admin')) default 'customer',
    created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function handle_new_user() returns trigger as $
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'customer');
  return new;
end;
$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- Venues & seat layout template (admin-managed)
-- =====================================================================
create table venues (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    address     text,
    created_by  uuid references profiles(id),
    created_at  timestamptz not null default now()
);

create table venue_seats (
    id           uuid primary key default gen_random_uuid(),
    venue_id     uuid not null references venues(id) on delete cascade,
    section      text not null default 'Main',
    row_label    text not null,
    seat_number  integer not null,
    category     text not null,
    pos_x        integer not null default 0,
    pos_y        integer not null default 0,
    unique (venue_id, section, row_label, seat_number)
);

-- =====================================================================
-- Events & Shows (organiser-managed)
-- =====================================================================
create table events (
    id            uuid primary key default gen_random_uuid(),
    organiser_id  uuid not null references profiles(id),
    title         text not null,
    type          text not null check (type in ('movie','concert')),
    description   text,
    poster_url    text,
    created_at    timestamptz not null default now()
);

create table shows (
    id          uuid primary key default gen_random_uuid(),
    event_id    uuid not null references events(id) on delete cascade,
    venue_id    uuid not null references venues(id),
    show_date   date not null,
    show_time   time not null,
    status      text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
    created_at  timestamptz not null default now()
);

create table show_categories (
    id        uuid primary key default gen_random_uuid(),
    show_id   uuid not null references shows(id) on delete cascade,
    category  text not null,
    price     numeric(10,2) not null,
    unique (show_id, category)
);

-- =====================================================================
-- show_seats — THE concurrency-critical table.
-- One row per physical seat, per show.
-- =====================================================================
create table show_seats (
    id             uuid primary key default gen_random_uuid(),
    show_id        uuid not null references shows(id) on delete cascade,
    venue_seat_id  uuid not null references venue_seats(id),
    category       text not null,
    status         text not null default 'available' check (status in ('available','held','booked')),
    held_by        uuid references profiles(id),
    held_until     timestamptz,
    booking_id     uuid, -- FK added after bookings table exists
    version        integer not null default 0,
    unique (show_id, venue_seat_id)
);

create index idx_show_seats_show on show_seats(show_id);
create index idx_show_seats_expiry on show_seats(held_until) where status = 'held';

-- Audit trail of every hold ever placed (survives past release/expiry/conversion).
create table seat_holds (
    id            uuid primary key default gen_random_uuid(),
    show_seat_id  uuid not null references show_seats(id),
    held_by       uuid not null references profiles(id),
    status        text not null default 'active' check (status in ('active','released','expired','converted')),
    held_until    timestamptz not null,
    created_at    timestamptz not null default now(),
    resolved_at   timestamptz
);

create index idx_seat_holds_active on seat_holds(show_seat_id) where status = 'active';

-- =====================================================================
-- Bookings
-- =====================================================================
create table bookings (
    id             uuid primary key default gen_random_uuid(),
    booking_ref    text unique not null,
    customer_id    uuid not null references profiles(id),
    show_id        uuid not null references shows(id),
    status         text not null default 'confirmed' check (status in ('confirmed','cancelled')),
    total_amount   numeric(10,2) not null,
    qr_code_url    text,
    created_at     timestamptz not null default now(),
    cancelled_at   timestamptz
);

alter table show_seats
  add constraint fk_show_seats_booking foreign key (booking_id) references bookings(id);

create table booking_seats (
    id            uuid primary key default gen_random_uuid(),
    booking_id    uuid not null references bookings(id) on delete cascade,
    show_seat_id  uuid not null references show_seats(id),
    unique (show_seat_id)
);

-- =====================================================================
-- Waitlist
-- =====================================================================
create table waitlist_entries (
    id           uuid primary key default gen_random_uuid(),
    show_id      uuid not null references shows(id),
    customer_id  uuid not null references profiles(id),
    category     text not null,
    status       text not null default 'waiting'
                 check (status in ('waiting','offered','fulfilled','expired','cancelled')),
    created_at   timestamptz not null default now()
);

create index idx_waitlist_queue on waitlist_entries(show_id, category, status, created_at);

-- Audit trail: an entry can generate more than one offer over its lifetime
-- (e.g. offer expires, entry could theoretically be re-offered a different seat later).
create table waitlist_offers (
    id                uuid primary key default gen_random_uuid(),
    waitlist_entry_id uuid not null references waitlist_entries(id),
    show_seat_id      uuid not null references show_seats(id),
    offer_token       text unique not null,
    status            text not null default 'active' check (status in ('active','claimed','expired')),
    expires_at        timestamptz not null,
    created_at        timestamptz not null default now()
);

create index idx_waitlist_offers_expiry on waitlist_offers(expires_at) where status = 'active';

-- =====================================================================
-- Convenience view: seat map with joined layout info
-- =====================================================================
create view show_seat_map as
select
    ss.id as show_seat_id,
    ss.show_id,
    ss.status,
    ss.category,
    ss.held_by,
    ss.held_until,
    vs.section, vs.row_label, vs.seat_number, vs.pos_x, vs.pos_y
from show_seats ss
join venue_seats vs on vs.id = ss.venue_seat_id;
```

---

## 5. Row Level Security (RLS)

Enable RLS on every table, then add policies. Pattern: **admins bypass most restrictions, organisers manage their own events/shows, customers manage their own bookings/waitlist entries, and everyone can read public catalog data (venues, events, shows, seat maps).**

```sql
alter table profiles enable row level security;
alter table venues enable row level security;
alter table venue_seats enable row level security;
alter table events enable row level security;
alter table shows enable row level security;
alter table show_categories enable row level security;
alter table show_seats enable row level security;
alter table seat_holds enable row level security;
alter table bookings enable row level security;
alter table booking_seats enable row level security;
alter table waitlist_entries enable row level security;
alter table waitlist_offers enable row level security;

-- Helper: is the current user an admin?
create function is_admin() returns boolean as $
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$ language sql stable security definer;

create function is_organiser() returns boolean as $
  select exists (select 1 from profiles where id = auth.uid() and role in ('organiser','admin'));
$ language sql stable security definer;

-- profiles
create policy "read own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on profiles for update using (id = auth.uid());

-- venues: public read, admin write
create policy "venues public read" on venues for select using (true);
create policy "venues admin write" on venues for insert with check (is_admin());
create policy "venues admin update" on venues for update using (is_admin());

-- venue_seats: public read, admin write
create policy "venue_seats public read" on venue_seats for select using (true);
create policy "venue_seats admin write" on venue_seats for insert with check (is_admin());

-- events: public read, organiser writes own
create policy "events public read" on events for select using (true);
create policy "events organiser insert" on events for insert
  with check (organiser_id = auth.uid() and is_organiser());
create policy "events organiser update own" on events for update
  using (organiser_id = auth.uid() or is_admin());

-- shows: public read, organiser writes own event's shows
create policy "shows public read" on shows for select using (true);
create policy "shows organiser insert" on shows for insert
  with check (
    is_organiser() and exists (
      select 1 from events e where e.id = event_id
        and (e.organiser_id = auth.uid() or is_admin())
    )
  );

-- show_categories: public read, tied to show ownership for writes
create policy "show_categories public read" on show_categories for select using (true);
create policy "show_categories organiser insert" on show_categories for insert
  with check (
    exists (
      select 1 from shows s join events e on e.id = s.event_id
      where s.id = show_id and (e.organiser_id = auth.uid() or is_admin())
    )
  );

-- show_seats: public read (seat map is public); writes ONLY through RPC functions
-- (functions run as security definer, so no direct-write policy is needed/wanted here).
create policy "show_seats public read" on show_seats for select using (true);

-- seat_holds: customers see only their own holds; admins see all
create policy "seat_holds own read" on seat_holds for select
  using (held_by = auth.uid() or is_admin());

-- bookings: customers see/manage their own; organisers see bookings for their events
create policy "bookings own read" on bookings for select
  using (
    customer_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from shows s join events e on e.id = s.event_id
      where s.id = show_id and e.organiser_id = auth.uid()
    )
  );
-- Inserts/updates to bookings happen only via RPC functions (security definer),
-- so no direct insert/update policy is granted to customers.

-- booking_seats: readable if the parent booking is readable
create policy "booking_seats read" on booking_seats for select
  using (
    exists (
      select 1 from bookings b where b.id = booking_id
      and (b.customer_id = auth.uid() or is_admin())
    )
  );

-- waitlist_entries: customers manage their own
create policy "waitlist own read" on waitlist_entries for select
  using (customer_id = auth.uid() or is_admin());
create policy "waitlist own insert" on waitlist_entries for insert
  with check (customer_id = auth.uid());

-- waitlist_offers: readable by the owning entry's customer
create policy "waitlist_offers own read" on waitlist_offers for select
  using (
    exists (
      select 1 from waitlist_entries we where we.id = waitlist_entry_id
      and (we.customer_id = auth.uid() or is_admin())
    )
  );
```

**Key design point:** `show_seats`, `bookings`, `waitlist_entries` state transitions (hold/release/book/cancel/assign) are **never** written directly by the client via `UPDATE`/`INSERT` policies. They are only ever mutated inside `security definer` Postgres functions (see file 02), which run with elevated privilege and enforce the actual business rules (locking, validation, ownership checks) in one place. RLS here is mainly about **read** visibility and about restricting the few tables customers legitimately insert into directly (`waitlist_entries` initial join, `profiles` update).

---

## 6. Why this schema shape, briefly

- **`show_seats` separate from `venue_seats`**: the same physical seat (e.g. row B, seat 7) needs independent availability per show. Materializing a fresh `show_seats` row set at show-creation time makes every subsequent query/lock operate on a simple per-show table without date/time filtering logic baked into every query.
- **`seat_holds` and `waitlist_offers` as audit tables, separate from the live status columns on `show_seats`**: gives a queryable history (how many holds expired unclaimed, how long offers typically take to convert) without slowing down the hot-path seat-map read, which only ever touches `show_seats` + `show_seat_map`.
- **`booking_seats` unique on `show_seat_id`**: guarantees at the schema level that a seat can never appear in two live bookings simultaneously — a second safety net below the transactional logic, not a replacement for it.

Continue to **`02-core-logic-concurrency-and-build-order.md`** for the RPC functions, triggers, scheduled jobs, and phased build plan.


## Seat Hold & Waitlist Logic

See [`02-core-logic-concurrency-and-build-order.md`](./02-core-logic-concurrency-and-build-order.md) for the full technical explanation, and [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) for the 800-word summary.

**In brief:**

**Seat Hold TTL:**
1. `hold_seats` RPC writes `status='held'`, `held_until=now()+10min` — protected by `SELECT FOR UPDATE`
2. `pg_cron` sweeps every 30s and resets expired holds to `available`
3. Frontend also normalizes: if `held_until < now()` client-side, the seat renders as available immediately

**Concurrency:**
- `SELECT ... FOR UPDATE` on target rows ordered by PK (prevents deadlocks)
- Second concurrent transaction blocks, then re-reads and gets `seats_unavailable` error
- All-or-nothing: partial holds are never left in place

**Waitlist:**
- `trg_assign_waitlist_on_seat_free` trigger fires on every `show_seats → available` transition
- Claims next `waiting` entry with `FOR UPDATE SKIP LOCKED` (handles multiple simultaneous seat frees)
- Converts seat to 30-min hold for the waitlisted customer + enqueues email

**Waitlist Offer Expiry:**
- Same TTL mechanism as regular holds — `pg_cron` expires the offer
- Seat flips back to `available` → trigger fires again → next customer gets the seat

---

# API Reference — RPC Function Contracts

There is no REST API. All state-changing operations are Postgres functions called directly from
the frontend via `supabase.rpc('function_name', { ...params })`. Read operations (browsing events,
seat maps, booking history) go through normal `supabase.from('table').select(...)` calls governed
by RLS (see `01-architecture-and-data-model.md`, §5).

Every RPC below runs as `security definer` and re-derives the caller's identity from `auth.uid()`
— it never trusts a customer/user id passed in as a parameter.

---

## `hold_seats`

Place a checkout hold on one or more seats.

**Params**
| name | type | required | notes |
|---|---|---|---|
| `p_show_id` | uuid | yes | |
| `p_seat_ids` | uuid[] | yes | all-or-nothing: if any seat is unavailable, none are held |
| `p_ttl_minutes` | int | no | default 10 |

**Returns:** `setof show_seats` — the updated rows.

**Errors**
- `not_authenticated` — no session
- `seats_not_found` — one or more ids don't belong to this show
- `seats_unavailable:<comma-separated-ids>` — some requested seats are booked or held by someone else; parse the suffix client-side to highlight which ones

---

## `release_seats`

Explicitly release seats the caller currently holds (checkout abandonment / seat deselection).

**Params:** `p_show_id uuid`, `p_seat_ids uuid[]`

**Returns:** `setof show_seats`

**Behavior:** only releases seats where `held_by = auth.uid()` — cannot be used to release someone
else's hold. No-op (silently) for seats not held by the caller.

---

## `confirm_booking`

Convert a currently-held seat set into a confirmed booking.

**Params:** `p_show_id uuid`, `p_seat_ids uuid[]`

**Returns:** `bookings` row (single record).

**Errors**
- `not_authenticated`
- `hold_expired` — one or more seats are no longer held by the caller with a valid (non-expired) TTL; frontend should prompt the user to reselect seats and refresh the seat map

**Side effects:** inserts a `booking_confirmation` row into `email_outbox` (processed asynchronously by the Edge Function — see `03-frontend-integration-deployment-and-qa.md`, §6).

---

## `cancel_booking`

Cancel a confirmed booking and free its seats.

**Params:** `p_booking_id uuid`

**Returns:** `void`

**Errors**
- `not_authenticated`
- `booking_not_found`
- `already_cancelled`
- `not_authorized` — customer attempting to cancel someone else's booking (organisers/admins may cancel bookings tied to their own shows — extend this check if that flow is added; currently only the owning customer or an admin can cancel)

**Side effects:** freeing the seats fires the waitlist auto-assignment trigger per seat (see `02-core-logic-concurrency-and-build-order.md`, §6b) — no explicit waitlist call is needed from the client.

---

## `join_waitlist`

Join the waitlist for a sold-out category on a show.

**Params:** `p_show_id uuid`, `p_category text`

**Returns:** `waitlist_entries` row.

**Errors**
- `not_authenticated`
- `seats_available` — the category is not actually sold out; direct the customer to book normally instead

---

## `complete_waitlist_offer`

Claim a time-limited waitlist offer (the link sent by email).

**Params:** `p_offer_token text` — extracted from the URL path `/waitlist/offer/:token`

**Returns:** `bookings` row (delegates to `confirm_booking` internally for the single offered seat).

**Errors**
- `not_authenticated`
- `offer_not_found`
- `not_authorized` — token belongs to a different account
- `offer_no_longer_active` — already claimed or already expired-and-reassigned
- `offer_expired` — past `expires_at` but the cron sweep hasn't flipped its status yet (lazy-expiry check happens here too, mirroring the seat-map read pattern)

---

## `create_show`

Organiser/admin helper: creates a show, its per-category pricing, and materializes `show_seats`
from the venue's layout — all in one call.

**Params**
| name | type | notes |
|---|---|---|
| `p_event_id` | uuid | must belong to the calling organiser (or caller is admin) |
| `p_venue_id` | uuid | must have at least one `venue_seats` row |
| `p_show_date` | date | |
| `p_show_time` | time | |
| `p_pricing` | jsonb | e.g. `{"Premium": 450, "Standard": 250}` |

**Returns:** `shows` row.

**Errors**
- `not_authorized` — caller doesn't own the parent event and isn't admin
- `venue_has_no_layout` — venue has zero `venue_seats` rows

---

## Read-only queries (no RPC needed — direct table/view access via RLS)

| Use case | Query |
|---|---|
| Browse/filter events | `supabase.from('events').select('*, shows(*)').eq('type', ...).ilike('title', ...)` |
| Seat map for a show | `supabase.from('show_seat_map').select('*').eq('show_id', showId)` |
| Show pricing | `supabase.from('show_categories').select('*').eq('show_id', showId)` |
| Customer's booking history | `supabase.from('bookings').select('*').eq('customer_id', auth.uid())` (RLS scopes this automatically — no explicit filter is even required, but include it for clarity) |
| Organiser's revenue per event | Aggregate `bookings` joined through `shows` where `status = 'confirmed'`; RLS's organiser-read policy on `bookings` already scopes this to the organiser's own shows |
| Venue seat layout (admin/organiser browsing venues) | `supabase.from('venue_seats').select('*').eq('venue_id', venueId)` |

## Error-handling convention

All RPC errors surface to the client as a Postgres exception with a short machine-readable code in
the message (e.g. `hold_expired`, `seats_unavailable:id1,id2`). The frontend should switch on the
error message prefix rather than displaying raw Postgres error text to the user. See
`03-frontend-integration-deployment-and-qa.md`, §4 for the checkout flow's handling of these.


## Evaluation Checklist

| Criterion | Implementation |
|---|---|
| Seat hold TTL & auto-release | `hold_seats` RPC + `pg_cron` sweep + lazy expiry |
| Concurrency protection | `SELECT FOR UPDATE` deterministic locking |
| Waitlist auto-assignment | `trg_assign_waitlist_on_seat_free` trigger |
| Time-limited offer flow | 30-min hold + `offer_token` + `complete_waitlist_offer` |
| Seat map data model | `venue_seats` template → `show_seats` per show instance |
| Real-time status updates | Supabase Realtime `postgres_changes` on `show_seats` |
| QR code generation | Edge Function generates PNG via `qrcode` npm package |
| Email delivery | Resend API called from Edge Function |
| API design | Security-definer RPCs, no direct table writes for state changes |
| Code structure | Clean separation: DB layer (RPCs) / hooks / components / pages |
| Documentation | README + API_REFERENCE + SYSTEM_DESIGN + 3 architecture docs |
