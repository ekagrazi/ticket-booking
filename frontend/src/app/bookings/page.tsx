'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Ticket, Calendar, Clock, MapPin, ArrowLeft, Loader2, CheckCircle2, XCircle, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data } = await supabase
        .from('bookings')
        .select('*, shows(*, events(*), venues(*))')
        .order('created_at', { ascending: false });

      setBookings(data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This cannot be undone.')) return;
    await supabase.rpc('cancel_booking', { p_booking_id: id });
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  return (
    <div className="bg-[#0f0f13] min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <Link href="/events" className="inline-flex items-center text-white/50 hover:text-white text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
        </Link>
        
        <h1 className="text-4xl font-extrabold text-white mb-8 tracking-tight">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="bg-surface-2 rounded-3xl p-16 text-center border border-white/5 shadow-xl">
            <div className="w-20 h-20 bg-surface-3 rounded-full flex items-center justify-center mx-auto mb-5 text-white/20">
              <Ticket className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">No bookings yet</h2>
            <p className="text-white/40 mb-8 max-w-sm mx-auto">You haven't booked any tickets yet. Explore our events and book your first show!</p>
            <Link href="/events" className="btn-brand px-8 py-3">Explore Events</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const show = booking.shows;
              const event = show?.events;
              const venue = Array.isArray(show?.venues) ? show?.venues[0] : show?.venues;
              const isConfirmed = booking.status === 'confirmed';

              return (
                <div key={booking.id} className={`bg-surface-2 rounded-2xl border ${isConfirmed ? 'border-brand/30' : 'border-white/5 opacity-70'} overflow-hidden shadow-2xl transition-all`}>
                  <div className={`px-6 py-4 flex items-center justify-between border-b ${isConfirmed ? 'border-brand/20 bg-brand/5' : 'border-white/5 bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${isConfirmed ? 'bg-brand/20 text-brand' : 'bg-red-500/10 text-red-400'}`}>
                        {isConfirmed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {booking.status}
                      </span>
                      <span className="font-mono text-white/40 text-sm">{booking.booking_ref}</span>
                    </div>
                    {isConfirmed && (
                      <Link href={`/booking/${booking.id}`} className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-white transition-colors">
                        <QrCode className="w-4 h-4" /> View Ticket
                      </Link>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col md:flex-row gap-6 justify-between">
                    <div className="flex gap-6">
                      {event?.poster_url && (
                        <div className="w-24 h-32 rounded-lg overflow-hidden shrink-0 bg-surface-3">
                          <img src={event.poster_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{event?.title}</h3>
                        <div className="space-y-1.5 text-sm text-white/60">
                          <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-brand" /> {new Date(show?.show_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                          <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand" /> {show?.show_time.substring(0, 5)}</p>
                          {venue && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" /> {venue.name}</p>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between border-t border-white/5 pt-6 md:pt-0 md:border-t-0 md:border-l pl-0 md:pl-6">
                      <div className="text-right w-full">
                        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-1">Total Paid</p>
                        <p className="text-3xl font-extrabold text-white">₹{booking.total_amount.toFixed(2)}</p>
                      </div>
                      
                      {isConfirmed && (
                        <button
                          onClick={() => cancelBooking(booking.id)}
                          className="mt-6 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-lg transition-colors border border-red-400/20"
                        >
                          Cancel Booking
                        </button>
                      )}
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
