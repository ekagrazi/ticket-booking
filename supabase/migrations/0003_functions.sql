create function hold_seats(p_show_id uuid, p_seat_ids uuid[], p_ttl_minutes int default 10)
returns setof show_seats
language plpgsql
security definer
as $$
declare
  v_customer_id uuid := auth.uid();
  v_now timestamptz := now();
  v_held_until timestamptz := now() + (p_ttl_minutes || ' minutes')::interval;
  v_row show_seats%rowtype;
  v_unavailable uuid[];
begin
  if v_customer_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Lock target rows in deterministic order.
  perform 1 from show_seats
    where id = any(p_seat_ids) and show_id = p_show_id
    order by id
    for update;

  -- Re-check status now that we hold the locks.
  select array_agg(id) into v_unavailable
  from show_seats
  where id = any(p_seat_ids)
    and show_id = p_show_id
    and (
      status = 'booked'
      or (status = 'held' and held_until > v_now and held_by <> v_customer_id)
    );

  if v_unavailable is not null and array_length(v_unavailable, 1) > 0 then
    raise exception 'seats_unavailable:%', array_to_string(v_unavailable, ',')
      using errcode = 'P0001';
  end if;

  -- All clear — place the hold.
  update show_seats
  set status = 'held', held_by = v_customer_id, held_until = v_held_until, version = version + 1
  where id = any(p_seat_ids) and show_id = p_show_id;

  insert into seat_holds (show_seat_id, held_by, held_until, status)
  select id, v_customer_id, v_held_until, 'active'
  from show_seats where id = any(p_seat_ids) and show_id = p_show_id;

  return query select * from show_seats where id = any(p_seat_ids) and show_id = p_show_id;
end;
$$;

create function release_seats(p_show_id uuid, p_seat_ids uuid[])
returns setof show_seats
language plpgsql
security definer
as $$
declare
  v_customer_id uuid := auth.uid();
begin
  update show_seats
  set status = 'available', held_by = null, held_until = null, version = version + 1
  where id = any(p_seat_ids)
    and show_id = p_show_id
    and held_by = v_customer_id   -- can only release YOUR OWN holds
    and status = 'held';

  update seat_holds
  set status = 'released', resolved_at = now()
  where show_seat_id = any(p_seat_ids) and held_by = v_customer_id and status = 'active';

  return query select * from show_seats where id = any(p_seat_ids) and show_id = p_show_id;
end;
$$;

create function confirm_booking(p_show_id uuid, p_seat_ids uuid[])
returns bookings
language plpgsql
security definer
as $$
declare
  v_customer_id uuid := auth.uid();
  v_now timestamptz := now();
  v_invalid_count int;
  v_total numeric(10,2);
  v_booking bookings%rowtype;
  v_ref text := 'BKG-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
begin
  if v_customer_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  perform 1 from show_seats
    where id = any(p_seat_ids) and show_id = p_show_id
    order by id
    for update;

  select count(*) into v_invalid_count
  from show_seats
  where id = any(p_seat_ids) and show_id = p_show_id
    and not (status = 'held' and held_by = v_customer_id and held_until > v_now);

  if v_invalid_count > 0 then
    raise exception 'hold_expired' using errcode = 'P0001';
  end if;

  select sum(sc.price) into v_total
  from show_seats ss
  join show_categories sc on sc.show_id = ss.show_id and sc.category = ss.category
  where ss.id = any(p_seat_ids) and ss.show_id = p_show_id;

  insert into bookings (booking_ref, customer_id, show_id, status, total_amount)
  values (v_ref, v_customer_id, p_show_id, 'confirmed', v_total)
  returning * into v_booking;

  update show_seats
  set status = 'booked', booking_id = v_booking.id, held_by = null, held_until = null, version = version + 1
  where id = any(p_seat_ids) and show_id = p_show_id;

  insert into booking_seats (booking_id, show_seat_id)
  select v_booking.id, id from show_seats where id = any(p_seat_ids) and show_id = p_show_id;
  
  -- Insert booking confirmation into outbox
  insert into email_outbox (kind, payload)
  values ('booking_confirmation', jsonb_build_object(
    'booking_id', v_booking.id,
    'booking_ref', v_booking.booking_ref,
    'customer_id', v_customer_id,
    'show_id', p_show_id,
    'seat_ids', p_seat_ids
  ));

  update seat_holds
  set status = 'converted', resolved_at = now()
  where show_seat_id = any(p_seat_ids) and held_by = v_customer_id and status = 'active';

  return v_booking;
end;
$$;

create function cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_booking bookings%rowtype;
  v_requester uuid := auth.uid();
  v_is_customer boolean;
begin
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'already_cancelled' using errcode = 'P0001';
  end if;

  select role = 'customer' into v_is_customer from profiles where id = v_requester;
  if v_is_customer and v_booking.customer_id <> v_requester then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update bookings set status = 'cancelled', cancelled_at = now() where id = p_booking_id;

  -- Freeing these seats fires the auto-assign trigger per seat
  update show_seats
  set status = 'available', booking_id = null, held_by = null, held_until = null, version = version + 1
  where id in (select show_seat_id from booking_seats where booking_id = p_booking_id);
end;
$$;

create function join_waitlist(p_show_id uuid, p_category text)
returns waitlist_entries
language plpgsql
security definer
as $$
declare
  v_customer_id uuid := auth.uid();
  v_available_count int;
  v_entry waitlist_entries%rowtype;
begin
  select count(*) into v_available_count
  from show_seats where show_id = p_show_id and category = p_category and status = 'available';

  if v_available_count > 0 then
    raise exception 'seats_available' using errcode = 'P0001'; -- direct booking, no need to wait
  end if;

  insert into waitlist_entries (show_id, customer_id, category, status)
  values (p_show_id, v_customer_id, p_category, 'waiting')
  returning * into v_entry;

  return v_entry;
end;
$$;

create function trg_assign_waitlist_on_seat_free()
returns trigger
language plpgsql
security definer
as $$
declare
  v_entry waitlist_entries%rowtype;
  v_offer_token text;
  v_offer_ttl_minutes int := 30;
  v_expires timestamptz;
begin
  -- Only act when a seat has just transitioned INTO 'available'.
  if new.status <> 'available' or old.status = 'available' then
    return new;
  end if;

  -- Claim the earliest waiting entry for this show+category.
  -- SKIP LOCKED so simultaneous seat-frees each grab a DIFFERENT customer.
  select * into v_entry
  from waitlist_entries
  where show_id = new.show_id and category = new.category and status = 'waiting'
  order by created_at asc
  limit 1
  for update skip locked;

  if not found then
    return new; -- nobody waiting
  end if;

  v_offer_token := replace(gen_random_uuid()::text, '-', '');
  v_expires := now() + (v_offer_ttl_minutes || ' minutes')::interval;

  -- Re-lock and convert the seat into a time-limited offer for this customer.
  update show_seats
  set status = 'held', held_by = v_entry.customer_id, held_until = v_expires, version = version + 1
  where id = new.id;

  update waitlist_entries set status = 'offered' where id = v_entry.id;

  insert into waitlist_offers (waitlist_entry_id, show_seat_id, offer_token, status, expires_at)
  values (v_entry.id, new.id, v_offer_token, 'active', v_expires);

  -- Enqueue the notification email via a lightweight outbox table
  insert into email_outbox (kind, payload)
  values ('waitlist_offer', jsonb_build_object(
    'waitlist_entry_id', v_entry.id,
    'offer_token', v_offer_token,
    'customer_id', v_entry.customer_id,
    'show_id', new.show_id,
    'expires_at', v_expires
  ));

  return new;
end;
$$;

create trigger on_show_seat_available
  after update on show_seats
  for each row execute function trg_assign_waitlist_on_seat_free();

create function complete_waitlist_offer(p_offer_token text)
returns bookings
language plpgsql
security definer
as $$
declare
  v_offer waitlist_offers%rowtype;
  v_entry waitlist_entries%rowtype;
  v_customer_id uuid := auth.uid();
  v_booking bookings%rowtype;
begin
  select * into v_offer from waitlist_offers where offer_token = p_offer_token for update;
  if not found then
    raise exception 'offer_not_found' using errcode = 'P0001';
  end if;

  select * into v_entry from waitlist_entries where id = v_offer.waitlist_entry_id;

  if v_entry.customer_id <> v_customer_id then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_offer.status <> 'active' then
    raise exception 'offer_no_longer_active' using errcode = 'P0001';
  end if;
  if v_offer.expires_at < now() then
    raise exception 'offer_expired' using errcode = 'P0001';
  end if;

  -- Reuse confirm_booking's exact locking/validation path for the single seat.
  v_booking := confirm_booking(
    (select show_id from show_seats where id = v_offer.show_seat_id),
    array[v_offer.show_seat_id]
  );

  update waitlist_offers set status = 'claimed' where id = v_offer.id;
  update waitlist_entries set status = 'fulfilled' where id = v_entry.id;

  return v_booking;
end;
$$;
