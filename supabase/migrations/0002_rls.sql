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
alter table email_outbox enable row level security;

-- Helper: is the current user an admin?
create function is_admin() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer;

create function is_organiser() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('organiser','admin'));
$$ language sql stable security definer;

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

-- email_outbox: never readable or writable by frontend clients directly. 
-- Only via triggers and Edge Functions (which bypass RLS via service role).
