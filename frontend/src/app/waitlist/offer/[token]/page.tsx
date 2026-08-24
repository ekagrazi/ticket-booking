'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Ticket, Clock, CheckCircle } from 'lucide-react';

export default function WaitlistOfferPage({ params }: { params: { token: string } }) {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOffer = async () => {
      const { data, error } = await supabase
        .from('waitlist_offers')
        .select('*, show_seats(*), waitlist_entries(*)')
        .eq('offer_token', params.token)
        .single();
        
      if (error) {
        setError("Offer not found or invalid.");
      } else {
        setOffer(data);
      }
      setLoading(false);
    };
    fetchOffer();
  }, [params.token]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const { error } = await supabase.rpc('complete_waitlist_offer', {
        p_offer_token: params.token
      });
      if (error) throw error;
      
      router.push('/bookings');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div></div>;
  }

  if (error || !offer) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl text-center border border-gray-100">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Offer Invalid</h2>
        <p className="text-gray-500">{error || "This offer may have expired or already been claimed."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Great News!</h1>
        <p className="text-gray-500">A seat has become available from your waitlist request.</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Category</span>
          <span className="font-semibold text-gray-900">{offer.show_seats?.category}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Expires At</span>
          <span className="font-semibold text-red-600">
            {new Date(offer.expires_at).toLocaleString()}
          </span>
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={claiming || offer.status !== 'active' || new Date(offer.expires_at) < new Date()}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
      >
        {claiming ? 'Claiming...' : 'Claim & Book Now'}
      </button>
    </div>
  );
}
