'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Film, Music2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewEventPage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'movie' | 'concert'>('movie');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc('create_event', {
      p_title: title,
      p_type: type,
      p_description: description || null,
      p_poster_url: posterUrl || null,
    });

    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(`/organiser/events/${data.id}`);
  };

  return (
    <div className="max-w-2xl">
      <Link href="/organiser/events" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-purple-600 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to My Events
      </Link>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Create New Event</h1>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm">⚠️ {error}</div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Event Type</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'movie', label: 'Movie', icon: Film, desc: 'Film screening or premiere' },
                { key: 'concert', label: 'Concert', icon: Music2, desc: 'Live music performance' },
              ] as const).map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    type === key
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${type === key ? 'text-purple-600' : 'text-gray-400'}`} />
                  <p className={`font-semibold text-sm ${type === key ? 'text-purple-700' : 'text-gray-700'}`}>{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Grand Concert 2025"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the event for customers..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Poster URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Poster Image URL</label>
            <input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
            {posterUrl && (
              <img src={posterUrl} alt="preview" className="mt-2 h-24 rounded-xl object-cover border border-gray-100" onError={() => setPosterUrl('')} />
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !title}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm shadow-purple-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
