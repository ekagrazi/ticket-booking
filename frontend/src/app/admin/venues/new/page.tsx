'use client';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2, Building2 } from 'lucide-react';

type SeatSection = {
  id: string; // local key only
  section: string;
  category: string;
  rows: string;        // e.g. "A,B,C" or "A-C"
  seatsPerRow: number;
};

function generateSeats(sections: SeatSection[]) {
  const seats: Array<{
    section: string; row_label: string; seat_number: number;
    category: string; pos_x: number; pos_y: number;
  }> = [];

  let globalY = 0;
  sections.forEach((sec) => {
    // Parse rows: "A,B,C" or "A-C"
    let rowLabels: string[] = [];
    if (sec.rows.includes('-')) {
      const [start, end] = sec.rows.split('-').map((s) => s.trim().toUpperCase());
      const startCode = start.charCodeAt(0);
      const endCode = end.charCodeAt(0);
      for (let c = startCode; c <= endCode; c++) rowLabels.push(String.fromCharCode(c));
    } else {
      rowLabels = sec.rows.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean);
    }

    rowLabels.forEach((row, rowIdx) => {
      for (let seatNum = 1; seatNum <= sec.seatsPerRow; seatNum++) {
        seats.push({
          section: sec.section,
          row_label: row,
          seat_number: seatNum,
          category: sec.category,
          pos_x: seatNum - 1,
          pos_y: globalY + rowIdx,
        });
      }
    });
    globalY += rowLabels.length + 1; // gap between sections
  });

  return seats;
}

export default function NewVenuePage() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [sections, setSections] = useState<SeatSection[]>([
    { id: crypto.randomUUID(), section: 'Main', category: 'Regular', rows: 'A-E', seatsPerRow: 10 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const addSection = () =>
    setSections((prev) => [
      ...prev,
      { id: crypto.randomUUID(), section: '', category: 'Regular', rows: 'A-B', seatsPerRow: 8 },
    ]);

  const removeSection = (id: string) =>
    setSections((prev) => prev.filter((s) => s.id !== id));

  const updateSection = (id: string, field: keyof SeatSection, value: string | number) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const preview = useMemo(() => generateSeats(sections), [sections]);

  // Group preview by section for display
  const previewBySec = useMemo(() => {
    const map: Record<string, typeof preview> = {};
    preview.forEach((s) => {
      if (!map[s.section]) map[s.section] = [];
      map[s.section].push(s);
    });
    return map;
  }, [preview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview.length === 0) { setError('Add at least one section with seats.'); return; }
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc('create_venue', {
      p_name: name,
      p_address: address || null,
      p_seats: preview,
    });

    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(`/admin/venues/${data.id}`);
  };

  const categoryColors: Record<string, string> = {
    VIP: 'bg-purple-400',
    Premium: 'bg-blue-400',
    Regular: 'bg-emerald-400',
    Standard: 'bg-teal-400',
  };

  return (
    <div>
      <Link href="/admin/venues" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Venues
      </Link>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Create Venue</h1>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm">⚠️ {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4" /> Venue Details</h2>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Venue Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grand Arena"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, City"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>

            {/* Seat sections */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Seat Layout</h2>
                <button type="button" onClick={addSection}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Section
                </button>
              </div>

              <div className="space-y-4">
                {sections.map((sec, idx) => (
                  <div key={sec.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Section {idx + 1}</span>
                      {sections.length > 1 && (
                        <button type="button" onClick={() => removeSection(sec.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Section Name</label>
                        <input value={sec.section} onChange={(e) => updateSection(sec.id, 'section', e.target.value)}
                          placeholder="e.g. VIP, Floor, Balcony"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-gray-300 outline-none bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                        <select value={sec.category} onChange={(e) => updateSection(sec.id, 'category', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-gray-300 outline-none bg-white">
                          <option>Regular</option>
                          <option>Standard</option>
                          <option>Premium</option>
                          <option>VIP</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Rows (e.g. A-E or A,B,C)</label>
                        <input value={sec.rows} onChange={(e) => updateSection(sec.id, 'rows', e.target.value)}
                          placeholder="A-E"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-gray-300 outline-none bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Seats per Row</label>
                        <input type="number" min={1} max={50} value={sec.seatsPerRow}
                          onChange={(e) => updateSection(sec.id, 'seatsPerRow', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-gray-300 outline-none bg-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-3">Total seats: <strong className="text-gray-700">{preview.length}</strong></p>
            </div>

            <button type="submit" disabled={loading || !name || preview.length === 0}
              className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Create Venue (${preview.length} seats)`}
            </button>
          </form>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-gray-900 to-gray-700 py-3 flex items-center justify-center">
              <span className="text-white/70 text-xs font-semibold tracking-[0.3em] uppercase">Stage</span>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh]">
              {Object.keys(previewBySec).length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Add sections to preview the seat layout</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(previewBySec).map(([secName, seats]) => {
                    const rows: Record<string, typeof seats> = {};
                    seats.forEach((s) => {
                      if (!rows[s.row_label]) rows[s.row_label] = [];
                      rows[s.row_label].push(s);
                    });
                    const cat = seats[0]?.category;
                    const dotColor = categoryColors[cat] || 'bg-gray-400';
                    return (
                      <div key={secName}>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-center mb-2">
                          {secName || 'Unnamed'} · {cat}
                        </p>
                        <div className="space-y-1">
                          {Object.entries(rows).map(([rowLabel, rowSeats]) => (
                            <div key={rowLabel} className="flex items-center gap-1.5 justify-center">
                              <span className="text-[10px] font-mono text-gray-400 w-4 text-right">{rowLabel}</span>
                              <div className="flex gap-0.5 flex-wrap">
                                {rowSeats.map((s) => (
                                  <div
                                    key={s.seat_number}
                                    title={`${secName} ${rowLabel}${s.seat_number}`}
                                    className={`w-3.5 h-3.5 rounded-sm ${dotColor} opacity-80`}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="border-t border-gray-100 px-5 py-3 flex flex-wrap gap-4 bg-gray-50/50">
              {Object.entries(categoryColors).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className={`w-3 h-3 rounded-sm ${color}`} />
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
