'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Plus, Building2, MapPin, Loader2, ArrowRight } from 'lucide-react';

type Venue = { id: string; name: string; address: string | null; created_at: string; seatCount: number; showCount: number };

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: vens } = await supabase.from('venues').select('*').order('created_at', { ascending: false });
      if (!vens) { setLoading(false); return; }

      const enriched = await Promise.all(vens.map(async (v) => {
        const [{ count: seatCount }, { count: showCount }] = await Promise.all([
          supabase.from('venue_seats').select('*', { count: 'exact', head: true }).eq('venue_id', v.id),
          supabase.from('shows').select('*', { count: 'exact', head: true }).eq('venue_id', v.id),
        ]);
        return { ...v, seatCount: seatCount ?? 0, showCount: showCount ?? 0 };
      }));

      setVenues(enriched);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Venues</h1>
          <p className="text-gray-500 text-sm mt-1">Manage venues and seat layouts</p>
        </div>
        <Link
          href="/admin/venues/new"
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Venue
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>
      ) : venues.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No venues yet</h2>
          <p className="text-gray-500 text-sm mb-6">Create a venue and define its seat layout.</p>
          <Link href="/admin/venues/new" className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Create Venue
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {venues.map((v) => (
            <Link key={v.id} href={`/admin/venues/${v.id}`} className="group flex items-center justify-between bg-white rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all p-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-gray-700">{v.name}</h3>
                  {v.address && (
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {v.address}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center hidden sm:block">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Seats</p>
                  <p className="font-bold text-gray-900">{v.seatCount}</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Shows</p>
                  <p className="font-bold text-gray-900">{v.showCount}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
