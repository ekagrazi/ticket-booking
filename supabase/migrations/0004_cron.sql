-- Release checkout holds whose TTL has passed.
create function release_expired_holds() returns void
language plpgsql security definer as $$
begin
  update show_seats
  set status = 'available', held_by = null, held_until = null, version = version + 1
  where status = 'held' and held_until < now()
    and id not in (select show_seat_id from waitlist_offers where status = 'active');
    -- ^ leave active waitlist-offer holds alone here; they're handled by expire_waitlist_offers

  update seat_holds set status = 'expired', resolved_at = now()
  where status = 'active' and held_until < now();
end;
$$;

-- Expire stale waitlist offers; freeing the seat re-fires the assignment
-- trigger automatically, cascading to the next queued customer.
create function expire_waitlist_offers() returns void
language plpgsql security definer as $$
declare
  v_offer record;
begin
  for v_offer in
    select * from waitlist_offers where status = 'active' and expires_at < now()
    for update skip locked
  loop
    update waitlist_offers set status = 'expired' where id = v_offer.id;
    update waitlist_entries set status = 'expired' where id = v_offer.waitlist_entry_id;

    -- This UPDATE transitions status to 'available', firing the trigger
    -- in section 6b, which will pick the NEXT waiting customer.
    update show_seats
    set status = 'available', held_by = null, held_until = null, version = version + 1
    where id = v_offer.show_seat_id;
  end loop;
end;
$$;

-- Process the email outbox
create function process_email_outbox() returns void
language plpgsql security definer as $$
begin
  -- Implementation detail lives in edge function; this just marks/dispatches rows.
  perform net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/process-outbox',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
end;
$$;

select cron.schedule('release-expired-holds', '30 seconds', $$select release_expired_holds()$$);
select cron.schedule('expire-waitlist-offers', '30 seconds', $$select expire_waitlist_offers()$$);
select cron.schedule('process-email-outbox', '15 seconds', $$select process_email_outbox()$$);

-- Helper for the Edge Function to safely claim outbox rows
create function claim_email_outbox(p_limit int default 10)
returns setof email_outbox
language plpgsql security definer as $$
begin
  return query
  update email_outbox
  set status = 'processing'
  where id in (
    select id from email_outbox
    where status = 'pending' or (status = 'failed' and attempts < 3)
    order by created_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;
