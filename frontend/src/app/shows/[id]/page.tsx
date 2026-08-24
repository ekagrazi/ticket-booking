'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSeatMap } from '@/hooks/useSeatMap';
import { SeatMap } from '@/components/SeatMap';
import { BookingSummaryCard } from '@/components/BookingSummaryCard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, Loader2, Calendar } from 'lucide-react';

export default function ShowDetailsPage({ params }: { params: any }) {
  const { id } = use(params) as { id: string };
  const [show, setShow] = useState<any>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const router = useRouter();

  const {
    seats,
    selectedSeatIds,
    heldUntil,
    toggleSeatSelection,
    clearSelection,
    refreshMap
  } = useSeatMap(id);

  useEffect(() => {
    const loadShowData = async () => {
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .select('*, events(*), venues(*)')
        .eq('id', id)
        .single();
        
      if (showError || !showData) {
        setError('Show not found');
        setLoading(false);
        return;
      }
      setShow(showData);

      const { data: priceData } = await supabase
        .from('show_categories')
        .select('*')
        .eq('show_id', id);
        
      const priceMap: Record<string, number> = {};
      priceData?.forEach(p => {
        priceMap[p.category] = p.price;
      });
      setPrices(priceMap);
      setLoading(false);
    };

    loadShowData();
  }, [id]);

  const handlePay = async () => {
    if (selectedSeatIds.length === 0) return;
    setIsConfirming(true);
    setError(null);

    const { data, error } = await supabase.rpc('confirm_booking', {
      p_show_id: id,
      p_seat_ids: selectedSeatIds
    });

    if (error) {
      setIsConfirming(false);
      if (error.message.includes('hold_expired')) {
        setError('Your seat hold has expired. Please reselect your seats.');
        clearSelection();
        refreshMap();
      } else {
        setError(error.message);
      }
      return;
    }

    clearSelection();
    router.push(`/booking/${data.id}`);
  };

  const handleHoldExpired = () => {
    setError('Your seat hold has expired. Please reselect your seats.');
    clearSelection();
    refreshMap();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
    </div>
  );
  if (error && !show) return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-surface-2 p-8 rounded-3xl border border-white/5 max-w-md">
        <h2 className="text-xl font-bold text-white mb-2">Error loading show</h2>
        <p className="text-white/50 mb-6">{error}</p>
        <Link href="/events" className="btn-brand px-6 py-2">Back to Events</Link>
      </div>
    </div>
  );

  const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;
  const selectedSeatsData = seats.filter(s => selectedSeatIds.includes(s.show_seat_id));

  return (
    <div className="bg-[#0f0f13] min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-surface-2/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={`/events/${show.event_id}`} className="text-white/40 hover:text-white transition-colors bg-white/5 p-2 rounded-full border border-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-white leading-tight">{show.events?.title}</h1>
              <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-brand" /> {new Date(show.show_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-brand" /> {show.show_time.substring(0, 5)}</span>
                {venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand" /> {venue.name}</span>}
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-4 bg-surface-3 px-4 py-2 rounded-full border border-white/5 text-xs font-semibold text-white/60">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-white/10 border border-white/20" /> Available</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-brand shadow-[0_0_8px_rgba(248,68,100,0.8)]" /> Selected</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-white/5 border border-white/5 opacity-50" /> Unavailable</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-6 animate-slide-up">
          <div className="bg-brand/10 border border-brand/30 text-brand px-4 py-3 rounded-xl text-sm font-semibold text-center backdrop-blur-md">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Seat Map Area */}
        <div className="lg:flex-1 bg-surface-2 rounded-3xl border border-white/5 shadow-2xl p-6 lg:p-12 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar pr-2 relative">
            {/* Screen indicator */}
            <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none flex flex-col items-center justify-center opacity-40">
              <div className="w-3/4 max-w-md h-2 bg-gradient-to-r from-transparent via-white to-transparent blur-sm rounded-full mb-2" />
              <div className="w-3/4 max-w-md h-[1px] bg-gradient-to-r from-transparent via-white to-transparent" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/50 mt-4 font-bold">Screen</span>
            </div>
            
            <div className="mt-20 flex justify-center pb-12">
              <SeatMap
                seats={seats}
                selectedSeatIds={selectedSeatIds}
                onSeatClick={toggleSeatSelection}
              />
            </div>
          </div>
        </div>

        {/* Checkout Sidebar */}
        <div className="lg:w-80 shrink-0">
          <div className="sticky top-28">
            <BookingSummaryCard
              selectedSeats={selectedSeatsData}
              categoryPrices={prices}
              onPay={handlePay}
              isConfirming={isConfirming}
              heldUntil={heldUntil}
              onHoldExpired={handleHoldExpired}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
