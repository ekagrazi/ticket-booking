'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ArrowLeft, MapPin, Loader2, Calendar } from 'lucide-react';

export default function AdminVenueDetailPage({ params }: { params: any }) {
  const { id } = use(params) as { id: string };
  const [venue, setVenue] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: v }, { data: s }, { data: sh }] = await Promise.all([
        supabase.from('venues').select('*').eq('id', id).single(),
        supabase.from('venue_seats').select('*').eq('venue_id', id).order('section').order('row_label').order('seat_number'),
        supabase.from('shows').select('*, events(title)').eq('venue_id', id).order('show_date', { ascending: false }).limit(20),
      ]);
      setVenue(v);
      setSeats(s || []);
      setShows(sh || []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>;
  if (!venue) return <div className="text-gray-500 p-8">Venue not found.</div>;

  // Group by section + row for preview
  const layout: Record<string, Record<string, any[]>> = {};
  seats.forEach((s) => {
    if (!layout[s.section]) layout[s.section] = {};
    if (!layout[s.section][s.row_label]) layout[s.section][s.row_label] = [];
    layout[s.section][s.row_label].push(s);
  });

  const catColors: Record<string, string> = {
    VIP: 'bg-purple-400', Premium: 'bg-blue-400',
    Regular: 'bg-emerald-400', Standard: 'bg-teal-400',
  };

  return (
    <div>
      <Link href="/admin/venues" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Venues
      </Link>

      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{venue.name}</h1>
        {venue.address && (
          <p className="text-gray-400 text-sm flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {venue.address}
          </p>
        )}
        <div className="flex gap-6 mt-4 text-sm">
          <div><span className="text-gray-400">Seats:</span> <strong className="text-gray-900">{seats.length}</strong></div>
          <div><span className="text-gray-400">Shows:</span> <strong className="text-gray-900">{shows.length}</strong></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seat layout visual */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-b from-gray-900 to-gray-700 py-3 flex items-center justify-center">
            <span className="text-white/70 text-xs font-semibold tracking-[0.3em] uppercase">Stage</span>
          </div>
          <div className="p-6 overflow-auto max-h-[50vh]">
            <div className="space-y-5">
              {Object.entries(layout).map(([sec, rows]) => {
                const firstSeat = Object.values(rows)[0]?.[0];
                const dotColor = catColors[firstSeat?.category] || 'bg-gray-400';
                return (
                  <div key={sec}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-center mb-2">
                      {sec} · {firstSeat?.category}
                    </p>
                    <div className="space-y-1">
                      {Object.entries(rows).sort().map(([row, rowSeats]) => (
                        <div key={row} className="flex items-center gap-1.5 justify-center">
                          <span className="text-[10px] font-mono text-gray-400 w-4 text-right">{row}</span>
                          <div className="flex gap-0.5">
                            {rowSeats.sort((a, b) => a.seat_number - b.seat_number).map((s) => (
                              <div key={s.id} title={`${row}${s.seat_number}`}
                                className={`w-3.5 h-3.5 rounded-sm ${dotColor} opacity-80`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-gray-100 px-5 py-3 flex flex-wrap gap-4 bg-gray-50/50">
            {Object.entries(catColors).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-3 h-3 rounded-sm ${color}`} /> {cat}
              </div>
            ))}
          </div>
        </div>

        {/* Shows using this venue */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-4 h-4" /> Shows at this Venue</h2>
          </div>
          {shows.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No shows scheduled yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {shows.map((show) => (
                <div key={show.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{show.events?.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(show.show_date).toLocaleDateString()} · {show.show_time?.substring(0, 5)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    show.status === 'scheduled' ? 'bg-blue-50 text-blue-600'
                    : show.status === 'completed' ? 'bg-gray-100 text-gray-500'
                    : 'bg-red-50 text-red-500'
                  }`}>
                    {show.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
