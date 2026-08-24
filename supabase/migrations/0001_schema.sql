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
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'customer');
  return new;
end;
$$ language plpgsql security definer;

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

-- =====================================================================
-- Email Outbox
-- =====================================================================
create table email_outbox (
    id          uuid primary key default gen_random_uuid(),
    kind        text not null check (kind in ('booking_confirmation','waitlist_offer')),
    payload     jsonb not null,
    status      text not null default 'pending' check (status in ('pending','sent','failed')),
    attempts    int not null default 0,
    created_at  timestamptz not null default now(),
    sent_at     timestamptz
);
