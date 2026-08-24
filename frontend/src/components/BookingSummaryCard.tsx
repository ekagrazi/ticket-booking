import { ArrowRight, Ticket, Clock, CheckCircle2 } from 'lucide-react';
import { CheckoutTimer } from './CheckoutTimer';

type BookingSummaryCardProps = {
  selectedSeats: any[];
  categoryPrices: Record<string, number>;
  onPay: () => void;
  isConfirming: boolean;
  heldUntil: string | null;
  onHoldExpired: () => void;
};

export function BookingSummaryCard({ selectedSeats, categoryPrices, onPay, isConfirming, heldUntil, onHoldExpired }: BookingSummaryCardProps) {
  const total = selectedSeats.reduce((sum, seat) => sum + (categoryPrices[seat.category] || 0), 0);

  if (selectedSeats.length === 0) {
    return (
      <div className="bg-surface-2 border border-white/5 rounded-2xl p-6 text-center shadow-xl">
        <div className="w-12 h-12 bg-surface-3 rounded-full flex items-center justify-center mx-auto mb-3 text-white/20">
          <Ticket className="w-6 h-6" />
        </div>
        <h3 className="text-white font-bold mb-1">No seats selected</h3>
        <p className="text-white/40 text-sm">Select seats from the map to proceed</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-brand/30 rounded-2xl p-6 shadow-2xl shadow-brand/10">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Ticket className="w-5 h-5 text-brand" /> Summary
        </h3>
        <span className="bg-brand/20 text-brand px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
          {selectedSeats.length} Ticket{selectedSeats.length !== 1 && 's'}
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto mb-4 space-y-2 pr-2 custom-scrollbar">
        {selectedSeats.map(seat => (
          <div key={seat.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-surface-3 border border-white/5">
            <div>
              <p className="text-white font-medium">{seat.section} {seat.row_label}{seat.seat_number}</p>
              <p className="text-white/40 text-xs">{seat.category}</p>
            </div>
            <div className="text-white font-bold">₹{categoryPrices[seat.category] || 0}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6 pt-4 border-t border-white/5">
        <span className="text-white/60 font-medium">Total Amount</span>
        <span className="text-2xl font-extrabold text-white">₹{total.toFixed(2)}</span>
      </div>

      {heldUntil && (
        <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 mb-6 flex items-center justify-center gap-2 text-brand text-sm font-bold">
          <Clock className="w-4 h-4 animate-pulse" />
          <CheckoutTimer heldUntil={heldUntil} onExpired={onHoldExpired} />
        </div>
      )}

      <button
        onClick={onPay}
        disabled={isConfirming}
        className="w-full btn-brand py-4 flex items-center justify-center gap-2 text-lg"
      >
        {isConfirming ? (
          <>Processing... <span className="animate-spin text-white">⚙</span></>
        ) : (
          <>Pay & Confirm <ArrowRight className="w-5 h-5" /></>
        )}
      </button>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-400/80 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" /> Tickets held securely for you
      </div>
    </div>
  );
}
