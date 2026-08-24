'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, Clock, MapPin, Loader2, Film, Music2, Users, TrendingUp } from 'lucide-react';

export default function OrganiserEventDetailPage({ params }: { params: any }) {
  const { id } = use(params) as { id: string };
  const [event, setEvent] = useState<any>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: ev }, { data: revRows }] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.rpc('get_organiser_revenue', { p_event_id: id }),
      ]);
      setEvent(ev);
      setShows(revRows || []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-purple-400" /></div>
  );

  if (!event) return <div className="text-gray-500 p-8">Event not found.</div>;

  const TypeIcon = event.type === 'concert' ? Music2 : Film;
  const totalRevenue = shows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const totalBookings = shows.reduce((s, r) => s + Number(r.total_bookings), 0);
  const totalCapacity = shows.reduce((s, r) => s + Number(r.seat_capacity), 0);

  return (
    <div>
      <Link href="/organiser/events" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-purple-600 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> My Events
      </Link>

      {/* Event header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6 flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
          event.type === 'concert' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
        }`}>
          <TypeIcon className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{event.title}</h1>
          <p className="text-gray-500 text-sm capitalize">{event.type}</p>
          {event.description && <p className="text-gray-600 text-sm mt-2">{event.description}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/organiser/events/${id}/revenue`}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <TrendingUp className="w-4 h-4" /> Revenue
          </Link>
          <Link
            href={`/organiser/events/${id}/shows/new`}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 rounded-xl text-sm font-semibold text-white hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" /> Add Show
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Bookings', value: totalBookings, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Shows', value: shows.length, icon: Calendar, color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-xl font-extrabold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Shows list */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Shows</h2>
        {shows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm mb-3">No shows scheduled yet.</p>
            <Link
              href={`/organiser/events/${id}/shows/new`}
              className="inline-flex items-center gap-1.5 text-purple-600 font-semibold text-sm hover:underline"
            >
              <Plus className="w-4 h-4" /> Add first show
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shows.map((show) => {
              const occupancy = show.seat_capacity > 0
                ? Math.round((show.total_bookings / show.seat_capacity) * 100)
                : 0;
              return (
                <div key={show.show_id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          {new Date(show.show_date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                          <Clock className="w-3.5 h-3.5 text-blue-400 ml-2" />
                          {show.show_time.substring(0, 5)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" /> {show.venue_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 text-right shrink-0">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Revenue</p>
                        <p className="font-bold text-gray-900">₹{Number(show.total_revenue).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Sold</p>
                        <p className="font-bold text-gray-900">{show.total_bookings}/{show.seat_capacity}</p>
                      </div>
                      <div className="w-20">
                        <p className="text-xs text-gray-400 mb-1">Occupancy</p>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{occupancy}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
