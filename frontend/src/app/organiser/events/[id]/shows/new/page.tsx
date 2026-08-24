'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2, Trash2 } from 'lucide-react';

type Venue = { id: string; name: string; address: string | null };
type Category = string;

export default function NewShowPage({ params }: { params: any }) {
  const { id } = use(params) as { id: string };
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [venueCategories, setVenueCategories] = useState<Category[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [pricing, setPricing] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.from('venues').select('id, name, address').then(({ data }) => {
      setVenues(data || []);
      setLoadingVenues(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedVenue) { setVenueCategories([]); setPricing({}); return; }
    supabase
      .from('venue_seats')
      .select('category')
      .eq('venue_id', selectedVenue)
      .then(({ data }) => {
        const cats = [...new Set((data || []).map((r) => r.category))];
        setVenueCategories(cats);
        const defaultPricing: Record<string, string> = {};
        cats.forEach((c) => { defaultPricing[c] = ''; });
        setPricing(defaultPricing);
      });
  }, [selectedVenue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate pricing fields
    for (const cat of venueCategories) {
      if (!pricing[cat] || isNaN(Number(pricing[cat])) || Number(pricing[cat]) <= 0) {
        setError(`Please enter a valid price for ${cat}.`);
        return;
      }
    }
    setLoading(true);
    setError(null);

    const pricingObj: Record<string, number> = {};
    venueCategories.forEach((c) => { pricingObj[c] = Number(pricing[c]); });

    const { data: show, error: showError } = await supabase.rpc('create_show', {
      p_event_id: id,
      p_venue_id: selectedVenue,
      p_show_date: date,
      p_show_time: time,
      p_pricing: pricingObj,
    });
    setLoading(false);
    if (showError) { setError(showError.message); return; }
    router.push(`/organiser/events/${id}`);
  };

  return (
    <div className="max-w-2xl">
      <Link href={`/organiser/events/${id}`} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-purple-600 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Event
      </Link>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Schedule a Show</h1>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm">⚠️ {error}</div>}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Venue */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Venue *</label>
            {loadingVenues ? (
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <select
                required
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 bg-white"
              >
                <option value="">Select a venue…</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}{v.address ? ` — ${v.address}` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date *</label>
              <input
                required type="date" value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time *</label>
              <input
                required type="time" value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900"
              />
            </div>
          </div>

          {/* Per-category pricing */}
          {venueCategories.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Pricing by Category *
              </label>
              <div className="space-y-3">
                {venueCategories.map((cat) => (
                  <div key={cat} className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold min-w-[90px] text-center ${
                      cat === 'VIP' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {cat}
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricing[cat] || ''}
                        onChange={(e) => setPricing((p) => ({ ...p, [cat]: e.target.value }))}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedVenue && venueCategories.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border border-amber-100">
              This venue has no seat layout. Ask an admin to define the seats first.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !selectedVenue || !date || !time || venueCategories.length === 0}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Show'}
          </button>
        </form>
      </div>
    </div>
  );
}
