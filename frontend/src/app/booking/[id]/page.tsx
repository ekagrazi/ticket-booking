'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { CheckCircle2, QrCode, Calendar, Clock, MapPin, ArrowLeft, Loader2, Mail } from 'lucide-react';

export default function BookingConfirmationPage({ params }: { params: any }) {
  const { id } = use(params) as { id: string };
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchBooking = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, shows(*, events(*), venues(*))')
        .eq('id', id)
        .single();
      
      setBooking(data);
      setLoading(false);

      if (data && !data.qr_code_url && data.status === 'confirmed') {
        interval = setInterval(async () => {
          const { data: updated } = await supabase
            .from('bookings')
            .select('qr_code_url')
            .eq('id', id)
            .single();
            
          if (updated?.qr_code_url) {
            setBooking((prev: any) => ({ ...prev, qr_code_url: updated.qr_code_url }));
            clearInterval(interval);
          }
        }, 2000);
      }
    };

    fetchBooking();
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  if (!booking) return <div className="min-h-screen bg-[#0f0f13] text-white flex items-center justify-center">Booking not found.</div>;

  const show = booking.shows;
  const event = show?.events;
  const venue = Array.isArray(show?.venues) ? show?.venues[0] : show?.venues;

  return (
    <div className="bg-[#0f0f13] min-h-screen py-12 relative overflow-hidden">
      {/* Background flare */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-brand/20 blur-[150px] pointer-events-none opacity-50" />
      
      <div className="max-w-3xl mx-auto px-4 relative z-10">
        <Link href="/events" className="inline-flex items-center text-white/50 hover:text-white text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">Booking Confirmed!</h1>
          <p className="text-white/60">Your tickets have been secured.</p>
        </div>

        {/* Digital Ticket */}
        <div className="bg-surface-2 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left side info */}
            <div className="flex-1 p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 relative">
              <div className="absolute top-0 right-0 p-6">
                <span className="font-mono text-white/30 text-sm">#{booking.booking_ref}</span>
              </div>
              
              <h2 className="text-3xl font-extrabold text-white mb-1 pr-24">{event?.title}</h2>
              <p className="text-brand font-bold text-sm uppercase tracking-widest mb-8">{event?.type}</p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 text-white/70">
                  <Calendar className="w-5 h-5 text-white/40 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Date</p>
                    <p>{new Date(show?.show_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-white/70">
                  <Clock className="w-5 h-5 text-white/40 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Time</p>
                    <p>{show?.show_time.substring(0, 5)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-white/70">
                  <MapPin className="w-5 h-5 text-white/40 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Venue</p>
                    <p>{venue?.name}</p>
                    <p className="text-sm text-white/40">{venue?.address}</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex justify-between items-end">
                <div>
                  <p className="text-white/40 text-sm mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-white">₹{booking.total_amount.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                  <Mail className="w-4 h-4" /> Receipt Emailed
                </div>
              </div>
            </div>

            {/* Right side QR */}
            <div className="w-full md:w-80 bg-surface-3 p-8 md:p-12 flex flex-col items-center justify-center">
              <p className="text-white/40 text-sm font-medium uppercase tracking-widest mb-6">Scan Entry</p>
              
              <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center p-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                {booking.qr_code_url ? (
                  <img src={booking.qr_code_url} alt="QR Code" className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Generating</span>
                  </div>
                )}
              </div>
              
              <p className="text-center text-white/40 text-xs mt-8 leading-relaxed max-w-[200px]">
                Show this QR code at the venue entrance. Do not share this with anyone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
