'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Plus, Film, Music2, Calendar, TrendingUp, Loader2, ArrowRight } from 'lucide-react';

type EventWithStats = {
  id: string; title: string; type: 'movie' | 'concert';
  description: string | null; created_at: string;
  showsCount: number; totalRevenue: number;
};

export default function OrganiserEventsPage() {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: evs } = await supabase
        .from('events')
        .select('*')
        .eq('organiser_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!evs || evs.length === 0) { setLoading(false); return; }

      // Fetch shows + revenue for each event
      const stats = await Promise.all(evs.map(async (ev) => {
        const { data: revRows } = await supabase.rpc('get_organiser_revenue', { p_event_id: ev.id });
        const showsCount = revRows?.length ?? 0;
        const totalRevenue = revRows?.reduce((s: number, r: any) => s + Number(r.total_revenue), 0) ?? 0;
        return { ...ev, showsCount, totalRevenue };
      }));

      setEvents(stats);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Events</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your events and shows</p>
        </div>
        <Link
          href="/organiser/events/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-purple-200"
        >
          <Plus className="w-4 h-4" /> New Event
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-purple-400" /></div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-purple-50 text-purple-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No events yet</h2>
          <p className="text-gray-500 text-sm mb-6">Create your first event to start selling tickets.</p>
          <Link href="/organiser/events/new" className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors">
            <Plus className="w-4 h-4" /> Create Event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => {
            const TypeIcon = ev.type === 'concert' ? Music2 : Film;
            return (
              <Link key={ev.id} href={`/organiser/events/${ev.id}`} className="group block bg-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      ev.type === 'concert' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <TypeIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg group-hover:text-purple-700 transition-colors truncate">{ev.title}</h3>
                      <p className="text-sm text-gray-500 capitalize">{ev.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 shrink-0 ml-6">
                    <div className="text-center hidden sm:block">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><Calendar className="w-3 h-3" /> Shows</div>
                      <p className="font-bold text-gray-900">{ev.showsCount}</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><TrendingUp className="w-3 h-3" /> Revenue</div>
                      <p className="font-bold text-gray-900">₹{ev.totalRevenue.toFixed(2)}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
