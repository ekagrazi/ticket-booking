'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, Calendar, BarChart3, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function RevenueDetailPage({ params }: { params: any }) {
  const { id } = use(params) as { id: string };
  const [event, setEvent] = useState<any>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: ev }, { data: revRows }] = await Promise.all([
        supabase.from('events').select('title, type').eq('id', id).single(),
        supabase.rpc('get_organiser_revenue', { p_event_id: id }),
      ]);
      setEvent(ev);
      setShows(revRows || []);

      // Load individual bookings for this event's shows
      const showIds = revRows?.map((r: any) => r.show_id) || [];
      if (showIds.length > 0) {
        const { data: bks } = await supabase
          .from('bookings')
          .select('*, profiles(name), shows(show_date, show_time)')
          .in('show_id', showIds)
          .order('created_at', { ascending: false });
        setBookings(bks || []);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-purple-400" /></div>;

  const totalRevenue = shows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const totalBookings = shows.reduce((s, r) => s + Number(r.total_bookings), 0);
  const totalCancelled = shows.reduce((s, r) => s + Number(r.cancelled_count), 0);
  const totalCapacity = shows.reduce((s, r) => s + Number(r.seat_capacity), 0);
  const maxRevenue = Math.max(...shows.map((s) => Number(s.total_revenue)), 1);

  return (
    <div>
      <Link href={`/organiser/events/${id}`} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-purple-600 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Event
      </Link>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Revenue Report</h1>
      <p className="text-gray-500 text-sm mb-8">{event?.title}</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Confirmed Bookings', value: totalBookings, icon: CheckCircle2, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Cancellations', value: totalCancelled, icon: XCircle, color: 'text-red-500 bg-red-50 border-red-100' },
          { label: 'Total Seats', value: `${totalBookings}/${totalCapacity}`, icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-white rounded-2xl border p-5 flex items-center gap-3 ${color.split(' ')[2]}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color.split(' ').slice(0, 2).join(' ')}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
              <p className="text-xl font-extrabold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-show revenue bar chart */}
      {shows.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" /> Revenue by Show
          </h2>
          <div className="space-y-4">
            {shows.map((show) => {
              const rev = Number(show.total_revenue);
              const pct = Math.round((rev / maxRevenue) * 100);
              return (
                <div key={show.show_id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">
                      {new Date(show.show_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {show.show_time.substring(0, 5)}
                    </span>
                    <span className="font-bold text-gray-900">₹{rev.toFixed(2)}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{show.total_bookings} bookings · {show.seat_capacity} seats</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bookings table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">All Bookings</h2>
        </div>
        {bookings.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No bookings yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ref</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Show</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{b.booking_ref}</td>
                    <td className="px-6 py-4 text-gray-700">{b.profiles?.name || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(b.shows?.show_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {b.shows?.show_time?.substring(0, 5)}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{Number(b.total_amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {b.status === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
