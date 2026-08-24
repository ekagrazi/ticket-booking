import Link from 'next/link';
import { Calendar, Film, Music2, ArrowRight } from 'lucide-react';

type Event = {
  id: string;
  title: string;
  type: 'movie' | 'concert';
  poster_url: string | null;
  description: string | null;
};

export function EventCard({ event, showsCount = 0 }: { event: Event; showsCount?: number }) {
  const isMovie = event.type === 'movie';
  const Icon = isMovie ? Film : Music2;

  return (
    <Link href={`/events/${event.id}`} className="group relative block rounded-2xl overflow-hidden bg-surface-2 border border-white/5 hover:border-brand/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand/20">
      {/* Poster Image */}
      <div className="relative aspect-[3/4] w-full bg-surface-3 overflow-hidden">
        {event.poster_url ? (
          <img
            src={event.poster_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/10">
            <Icon className="w-16 h-16" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-[#0f0f13]/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <span className="bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border border-white/10">
            {event.type}
          </span>
          {showsCount > 0 && (
            <span className="bg-brand/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-lg shadow-brand/20">
              Booking Open
            </span>
          )}
        </div>

        {/* Content positioned at bottom of poster */}
        <div className="absolute bottom-0 left-0 right-0 p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight drop-shadow-md">
            {event.title}
          </h3>
          <div className="flex items-center justify-between text-white/70">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-brand" />
              {showsCount} Show{showsCount !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-brand opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Book Now <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
