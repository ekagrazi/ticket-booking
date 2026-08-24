-- =====================================================================
-- 0005_organiser_admin_rpcs.sql
-- New security-definer RPCs for organiser and admin management flows.
-- =====================================================================

-- create_event: organiser creates a new event listing
CREATE OR REPLACE FUNCTION create_event(
  p_title       text,
  p_type        text,
  p_description text DEFAULT NULL,
  p_poster_url  text DEFAULT NULL
)
RETURNS events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_event       events%rowtype;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('organiser', 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING errcode = '42501';
  END IF;

  IF p_type NOT IN ('movie', 'concert') THEN
    RAISE EXCEPTION 'invalid_event_type' USING errcode = 'P0001';
  END IF;

  INSERT INTO events (organiser_id, title, type, description, poster_url)
  VALUES (v_caller_id, p_title, p_type, p_description, p_poster_url)
  RETURNING * INTO v_event;

  RETURN v_event;
END;
$$;

-- create_show: organiser creates a show for their event, materializing show_seats
CREATE OR REPLACE FUNCTION create_show(
  p_event_id  uuid,
  p_venue_id  uuid,
  p_show_date date,
  p_show_time time,
  p_pricing   jsonb  -- e.g. {"VIP": 150.00, "Regular": 75.00}
)
RETURNS shows
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id     uuid := auth.uid();
  v_caller_role   text;
  v_owns_event    boolean;
  v_venue_seats   int;
  v_show          shows%rowtype;
  v_category      text;
  v_price         numeric(10,2);
  v_seat          venue_seats%rowtype;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;

  -- Check ownership: organiser must own the event; admin can do anything
  IF v_caller_role = 'organiser' THEN
    SELECT EXISTS(
      SELECT 1 FROM events WHERE id = p_event_id AND organiser_id = v_caller_id
    ) INTO v_owns_event;
    IF NOT v_owns_event THEN
      RAISE EXCEPTION 'not_authorized' USING errcode = '42501';
    END IF;
  ELSIF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'not_authorized' USING errcode = '42501';
  END IF;

  -- Venue must have a layout
  SELECT COUNT(*) INTO v_venue_seats FROM venue_seats WHERE venue_id = p_venue_id;
  IF v_venue_seats = 0 THEN
    RAISE EXCEPTION 'venue_has_no_layout' USING errcode = 'P0001';
  END IF;

  -- Create the show
  INSERT INTO shows (event_id, venue_id, show_date, show_time, status)
  VALUES (p_event_id, p_venue_id, p_show_date, p_show_time, 'scheduled')
  RETURNING * INTO v_show;

  -- Insert per-category pricing
  FOR v_category, v_price IN
    SELECT key, value::numeric FROM jsonb_each_text(p_pricing)
  LOOP
    INSERT INTO show_categories (show_id, category, price)
    VALUES (v_show.id, v_category, v_price)
    ON CONFLICT (show_id, category) DO UPDATE SET price = EXCLUDED.price;
  END LOOP;

  -- Materialize show_seats from the venue layout
  INSERT INTO show_seats (show_id, venue_seat_id, category, status)
  SELECT v_show.id, id, category, 'available'
  FROM venue_seats
  WHERE venue_id = p_venue_id;

  RETURN v_show;
END;
$$;

-- create_venue: admin creates a venue with its full seat layout in one call
CREATE OR REPLACE FUNCTION create_venue(
  p_name    text,
  p_address text DEFAULT NULL,
  p_seats   jsonb DEFAULT '[]'::jsonb
  -- p_seats is an array of seat objects:
  -- [{"section":"A","row_label":"A","seat_number":1,"category":"VIP","pos_x":0,"pos_y":0}, ...]
)
RETURNS venues
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_venue       venues%rowtype;
  v_seat        jsonb;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'not_authorized' USING errcode = '42501';
  END IF;

  INSERT INTO venues (name, address, created_by)
  VALUES (p_name, p_address, v_caller_id)
  RETURNING * INTO v_venue;

  FOR v_seat IN SELECT * FROM jsonb_array_elements(p_seats)
  LOOP
    INSERT INTO venue_seats (venue_id, section, row_label, seat_number, category, pos_x, pos_y)
    VALUES (
      v_venue.id,
      COALESCE(v_seat->>'section', 'Main'),
      v_seat->>'row_label',
      (v_seat->>'seat_number')::int,
      v_seat->>'category',
      COALESCE((v_seat->>'pos_x')::int, 0),
      COALESCE((v_seat->>'pos_y')::int, 0)
    );
  END LOOP;

  RETURN v_venue;
END;
$$;

-- get_organiser_revenue: returns booking + revenue stats for an event's shows
-- Returns a table so the frontend can display per-show breakdown
CREATE OR REPLACE FUNCTION get_organiser_revenue(p_event_id uuid)
RETURNS TABLE(
  show_id         uuid,
  show_date       date,
  show_time       time,
  venue_name      text,
  total_bookings  bigint,
  total_revenue   numeric,
  cancelled_count bigint,
  seat_capacity   bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_owns_event  boolean;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;

  IF v_caller_role = 'organiser' THEN
    SELECT EXISTS(
      SELECT 1 FROM events WHERE id = p_event_id AND organiser_id = v_caller_id
    ) INTO v_owns_event;
    IF NOT v_owns_event THEN
      RAISE EXCEPTION 'not_authorized' USING errcode = '42501';
    END IF;
  ELSIF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'not_authorized' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.id                                                AS show_id,
    s.show_date,
    s.show_time,
    v.name                                              AS venue_name,
    COUNT(b.id) FILTER (WHERE b.status = 'confirmed')  AS total_bookings,
    COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'confirmed'), 0) AS total_revenue,
    COUNT(b.id) FILTER (WHERE b.status = 'cancelled')  AS cancelled_count,
    (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = s.id) AS seat_capacity
  FROM shows s
  JOIN venues v ON v.id = s.venue_id
  LEFT JOIN bookings b ON b.show_id = s.id
  WHERE s.event_id = p_event_id
  GROUP BY s.id, s.show_date, s.show_time, v.name
  ORDER BY s.show_date, s.show_time;
END;
$$;
