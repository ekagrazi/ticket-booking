# System Design Write-Up

**TicketBook — Seat Hold, Concurrency, Waitlist & Time-Limited Offer Architecture**

---

## Architecture in One Sentence

Postgres is the sole source of truth for seat state; every state transition — hold, release, booking, cancellation, waitlist assignment — executes inside a `security definer` SQL function that is itself an implicit serializable transaction, so correctness is enforced at the database engine level rather than coordinated across application code.

---

## Seat Hold and TTL Mechanism

When a customer selects seats and clicks "Hold Seats," the frontend calls `hold_seats(show_id, seat_ids[], ttl_minutes=10)`. Inside that function, Postgres writes `status='held'`, `held_by=<customer_id>`, and `held_until=now()+10min` to every requested row in `show_seats`. Nothing about expiry is entrusted to the browser — it can crash, lose connectivity, or be killed mid-checkout.

Expiry is enforced by two deliberately redundant mechanisms:

**1. Lazy expiry on read.** Every query that reads seat status — including a subsequent `hold_seats` or `confirm_booking` attempt — treats any row where `status='held' AND held_until < now()` as effectively `available`. This means correctness never depends on a background sweep having run. Even if the cron job is delayed, no customer is blocked from selecting a seat whose hold has technically already expired.

**2. Active sweep via `pg_cron`.** A scheduled job (`release_expired_holds`) runs every 30 seconds and writes the actual `status='available'` transition for expired rows. This makes the freed seats visible to other customers via Supabase Realtime without requiring them to trigger a hold attempt of their own. The client-side seat map subscribes to `postgres_changes` on `show_seats` and re-renders whenever any row updates.

The frontend also applies lazy expiry locally: the `useSeatMap` hook runs a `normalize()` pass on every fetch and every incoming Realtime event, rendering any client-visible held seat with `held_until < now()` as `available` immediately — so the UI never shows a stale "unavailable" seat, even for the few seconds before the cron sweep fires.

The customer sees a cosmetic countdown derived from the `held_until` timestamp purely as a UX prompt; it has no bearing on actual seat availability.

---

## Concurrency Prevention

The classic double-booking race — two customers selecting the same seat within milliseconds — is prevented with **row-level pessimistic locking**, not optimistic retries or application-layer flags.

Both `hold_seats` and `confirm_booking` begin with:

```sql
SELECT 1 FROM show_seats
  WHERE id = ANY(p_seat_ids) AND show_id = p_show_id
  ORDER BY id   -- deterministic order prevents deadlocks
  FOR UPDATE;
```

Ordering by primary key is essential: if Customer A requests seats [3,1] and Customer B requests [1,3], both are normalized to [1,3] before locking, which prevents circular wait. Whichever transaction acquires the locks first proceeds; the second transaction blocks at the `FOR UPDATE` until the first commits or rolls back. After unblocking, it re-reads the rows under its own lock and finds `status='held'` — it raises `seats_unavailable` and rolls back cleanly. No seat is ever double-booked.

Multi-seat requests are **all-or-nothing**: if even one seat among a selection is unavailable, the entire transaction rolls back. A customer is never left holding a confusing partial selection while another customer holds the rest.

`confirm_booking` re-validates under the same locks: it re-checks that every seat is still held by the requesting customer with a non-expired TTL. This closes the narrow race window where a TTL lapses in the milliseconds between the "Pay" button click and the request reaching the database.

---

## Waitlist Auto-Assignment Flow

Rather than requiring every code path that frees a seat to explicitly check the waitlist, assignment is centralised in a single Postgres trigger: `trg_assign_waitlist_on_seat_free`. This trigger fires `AFTER UPDATE ON show_seats FOR EACH ROW` whenever a row transitions into `status='available'`.

On firing, the trigger claims the earliest `waiting` entry for that show and category:

```sql
SELECT * FROM waitlist_entries
  WHERE show_id = new.show_id AND category = new.category AND status = 'waiting'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
```

`SKIP LOCKED` is critical for group cancellations: if five seats free simultaneously, five trigger invocations run concurrently, each `SKIP LOCKED` past the entries already locked by sibling invocations — so five different waiting customers each receive a seat, rather than all five invocations fighting over the same first entry.

On claiming an entry, the trigger converts the freed seat into a 30-minute hold attributed to the waitlisted customer, creates a `waitlist_offers` record with a random unguessable `offer_token`, and writes a `waitlist_offer` row to `email_outbox`. An Edge Function processes the outbox asynchronously, sending the customer an email with a direct link containing the token — completely decoupled from the seat-state transaction so email failures cannot corrupt seat data.

---

## Time-Limited Offer Handling

A waitlist offer reuses the identical `held`/`held_until` mechanism as an ordinary checkout hold, with a longer TTL (30 minutes) and `held_by` set to the waitlisted customer. The emailed link points to `/waitlist/offer/<token>`, which calls `complete_waitlist_offer(token)`. That function validates token existence, ownership (`customer_id = auth.uid()`), active status, and non-expiry — then delegates to `confirm_booking` internally, reusing the same locking and validation path rather than duplicating it.

If the offer window lapses unclaimed, the `expire_waitlist_offers` cron job (also on the 30-second sweep) marks the offer `expired`, marks the `waitlist_entries` row `expired`, and flips the seat to `available`. This re-fires `trg_assign_waitlist_on_seat_free`, cascading the seat automatically to the next queued customer. No customer can be skipped and no seat can be silently orphaned in a held state indefinitely, because every hold-producing code path funnels through the same TTL-and-sweep mechanism.

---

## Why This Shape

Concentrating every write path for seat state into a small number of database functions — rather than spreading equivalent logic across API route handlers — means the invariant being evaluated (no two customers can ever hold or book the same seat) is enforced in exactly one place by the database engine, and holds by construction rather than by discipline across many call sites.

*Word count: ~780*
