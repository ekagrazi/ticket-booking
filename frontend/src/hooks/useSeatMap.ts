import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/lib/types';

type Seat = Database['public']['Views']['show_seat_map']['Row'];

// Spec §3 (file 03): treat held_until < now() as available client-side
// so the UI doesn't wait for the cron sweep or a Realtime event.
function normalize(rows: Seat[]): Seat[] {
  const now = Date.now();
  return rows.map((r) =>
    r.status === 'held' && r.held_until && new Date(r.held_until).getTime() < now
      ? { ...r, status: 'available' as const, held_by: null, held_until: null }
      : r
  );
}

export function useSeatMap(showId: string) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSeats() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('show_seat_map')
          .select('*')
          .eq('show_id', showId);

        if (error) throw error;
        if (isMounted) {
          setSeats(normalize(data || []));
        }
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSeats();

    // Realtime channel keyed by show_id (not event_id — spec §3)
    const channel = supabase
      .channel(`show:${showId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'show_seats',
          filter: `show_id=eq.${showId}`,
        },
        (payload) => {
          if (!isMounted) return;
          setSeats((prev) =>
            normalize(
              prev.map((s) =>
                s.show_seat_id === payload.new.id
                  ? {
                      ...s,
                      status: payload.new.status,
                      held_by: payload.new.held_by,
                      held_until: payload.new.held_until,
                    }
                  : s
              )
            )
          );
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [showId]);

  return { seats, loading, error };
}
