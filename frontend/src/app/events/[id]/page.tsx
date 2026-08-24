import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Calendar, Clock, MapPin, ArrowLeft, Info, Share2, Film, Music2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (eventError || !event) notFound();

  const { data: shows } = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('event_id', id)
    .eq('status', 'scheduled')
    .order('show_date', { ascending: true })
    .order('show_time', { ascending: true });

  const isMovie = event.type === 'movie';
  const Icon = isMovie ? Film : Music2;

  return (
    <div className="bg-[#0f0f13] min-h-screen">
      {/* Immersive Hero */}
      <div className="relative h-[60vh] min-h-[500px] w-full">
        {event.poster_url ? (
          <>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay z-10" />
            <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-[#0f0f13]/80 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f13] via-[#0f0f13]/50 to-transparent z-10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-surface-2 flex items-center justify-center">
            <Icon className="w-32 h-32 text-white/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] to-transparent z-10" />
          </div>
        )}

        <div className="absolute inset-0 z-20 flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/events" className="inline-flex items-center text-white/50 hover:text-white font-medium w-fit transition-colors bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Link>
          
          <div className="mt-auto pb-10 flex flex-col md:flex-row gap-8 items-end">
            {/* Poster Thumbnail for Desktop */}
            {event.poster_url && (
              <div className="hidden md:block w-64 aspect-[3/4] rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl shrink-0 bg-surface-3">
                <img src={event.poster_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="flex-1">
              <span className="bg-brand text-white px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest mb-4 inline-block shadow-lg shadow-brand/20">
                {event.type}
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-4 drop-shadow-lg">
                {event.title}
              </h1>
              
              <div className="flex gap-4 mb-6">
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-md transition-colors text-sm font-medium border border-white/5">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-30 flex flex-col lg:flex-row gap-12">
        {/* Left Column: About */}
        <div className="lg:w-1/3">
          <div className="bg-surface-2 rounded-2xl border border-white/5 p-8 sticky top-24">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-brand" /> About
            </h3>
            <p className="text-white/60 leading-relaxed text-sm">
              {event.description || 'No description available for this event.'}
            </p>
          </div>
        </div>

        {/* Right Column: Shows */}
        <div className="lg:w-2/3">
          <h2 className="text-2xl font-bold text-white mb-6">Select a Show</h2>
          
          {(!shows || shows.length === 0) ? (
            <div className="bg-surface-2 rounded-2xl border border-dashed border-white/10 p-12 text-center">
              <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 font-medium">No shows currently scheduled.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shows.map((show) => {
                const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;
                return (
                  <div key={show.id} className="group bg-surface-2 hover:bg-surface-3 border border-white/5 hover:border-brand/30 rounded-2xl p-6 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-brand/10 text-brand p-2 rounded-lg">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg">
                            {new Date(show.show_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-white/50 text-sm flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> {show.show_time.substring(0, 5)}
                          </p>
                        </div>
                      </div>
                      {venue && (
                        <div className="flex items-center text-white/50 text-sm mt-3 ml-12">
                          <MapPin className="w-4 h-4 mr-1.5 text-white/30" />
                          {venue.name}
                        </div>
                      )}
                    </div>
                    
                    <Link 
                      href={`/shows/${show.id}`}
                      className="btn-brand px-8 py-3 text-center md:w-auto w-full group-hover:scale-105"
                    >
                      Book Seats
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
