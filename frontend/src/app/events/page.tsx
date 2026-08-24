'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { EventCard } from '@/components/EventCard';
import { Sparkles, Ticket, Search, Film, Music2, LayoutGrid, Loader2 } from 'lucide-react';

type Event = { id: string; title: string; type: 'movie' | 'concert'; description: string | null; poster_url: string | null; created_at: string; organiser_id: string; };

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showsCount, setShowsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'concert'>('all');

  useEffect(() => {
    const load = async () => {
      const [{ data: evs }, { data: shows }] = await Promise.all([
        supabase.from('events').select('*').order('created_at', { ascending: false }),
        supabase.from('shows').select('event_id').eq('status', 'scheduled'),
      ]);
      setEvents(evs || []);
      const counts: Record<string, number> = {};
      shows?.forEach((s) => { counts[s.event_id] = (counts[s.event_id] || 0) + 1; });
      setShowsCount(counts);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchType = typeFilter === 'all' || e.type === typeFilter;
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [events, search, typeFilter]);

  const typeButtons = [
    { key: 'all', label: 'All', icon: LayoutGrid },
    { key: 'movie', label: 'Movies', icon: Film },
    { key: 'concert', label: 'Concerts', icon: Music2 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Hero Section */}
      <div className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 border border-brand/30 bg-brand/10 text-brand px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> Now Trending
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
            Experience the <span className="gradient-text">Extraordinary</span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
            Immerse yourself in world-class entertainment. Discover curated movies and unforgettable live performances.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex items-center bg-surface-2 rounded-2xl border border-white/10 p-2">
              <Search className="w-5 h-5 text-white/40 ml-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for movies, events, artists..."
                className="w-full bg-transparent border-none outline-none text-white px-4 py-3 placeholder:text-white/30"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Recommended <span className="text-brand">Events</span>
          </h2>
          
          <div className="flex gap-2 bg-surface-2 p-1.5 rounded-xl border border-white/5">
            {typeButtons.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  typeFilter === key
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl border border-white/5 skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-surface-2 rounded-3xl border border-white/5">
            <div className="w-16 h-16 bg-surface-3 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white/20">
              <Ticket className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No matches found</h2>
            <p className="text-white/40 text-sm mb-6 max-w-sm mx-auto">
              We couldn't find any events matching your criteria. Try exploring different categories.
            </p>
            <button onClick={() => { setSearch(''); setTypeFilter('all'); }} className="btn-brand px-6 py-2.5">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} showsCount={showsCount[event.id] || 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
