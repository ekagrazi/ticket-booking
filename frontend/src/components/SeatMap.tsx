type Seat = {
  show_seat_id: string;
  section: string;
  row_label: string;
  seat_number: number;
  category: string;
  status: 'available' | 'held' | 'booked';
  pos_x: number;
  pos_y: number;
};

type SeatMapProps = {
  seats: Seat[];
  selectedSeatIds: string[];
  onSeatClick: (seatId: string) => void;
};

export function SeatMap({ seats, selectedSeatIds, onSeatClick }: SeatMapProps) {
  if (!seats || seats.length === 0) {
    return <div className="text-white/30 text-sm font-medium py-10">Loading seat map...</div>;
  }

  const maxX = Math.max(...seats.map(s => s.pos_x));
  const maxY = Math.max(...seats.map(s => s.pos_y));

  const gridRows = Array.from({ length: maxY + 1 });
  const gridCols = Array.from({ length: maxX + 1 });

  return (
    <div className="inline-block p-6 bg-surface-3/30 rounded-3xl border border-white/5 backdrop-blur-sm">
      <div 
        className="grid gap-2 sm:gap-3"
        style={{ 
          gridTemplateRows: `repeat(${maxY + 1}, minmax(0, 1fr))`,
        }}
      >
        {gridRows.map((_, y) => {
          const rowSeats = seats.filter(s => s.pos_y === y);
          if (rowSeats.length === 0) {
            return <div key={`empty-row-${y}`} className="h-6 sm:h-8" />; // Empty gap row
          }

          const rowLabel = rowSeats[0].row_label;

          return (
            <div key={`row-${y}`} className="flex items-center gap-2 sm:gap-4">
              {/* Row Label Left */}
              <div className="w-4 sm:w-6 text-right font-mono text-[10px] sm:text-xs font-bold text-white/30 uppercase">
                {rowLabel}
              </div>

              {/* Seats Grid */}
              <div 
                className="grid gap-1.5 sm:gap-2.5"
                style={{ 
                  gridTemplateColumns: `repeat(${maxX + 1}, minmax(0, 1fr))`,
                }}
              >
                {gridCols.map((_, x) => {
                  const seat = seats.find(s => s.pos_x === x && s.pos_y === y);
                  
                  if (!seat) {
                    return <div key={`empty-${x}-${y}`} className="w-5 h-5 sm:w-7 sm:h-7" />;
                  }

                  const isSelected = selectedSeatIds.includes(seat.show_seat_id);
                  const isAvailable = seat.status === 'available';
                  const isHeld = seat.status === 'held';
                  const isBooked = seat.status === 'booked';

                  // Determine styling based on status
                  let btnClass = "w-5 h-5 sm:w-7 sm:h-7 rounded-sm sm:rounded-md transition-all duration-200 border flex items-center justify-center group relative";
                  
                  if (isSelected) {
                    btnClass += " bg-brand border-brand text-white seat-selected scale-110 z-10";
                  } else if (isAvailable) {
                    btnClass += " bg-surface-2 border-white/20 hover:border-brand/50 hover:bg-surface-3 cursor-pointer text-white";
                  } else {
                    btnClass += " bg-white/5 border-white/5 opacity-40 cursor-not-allowed";
                  }

                  return (
                    <button
                      key={seat.show_seat_id}
                      onClick={() => isAvailable && onSeatClick(seat.show_seat_id)}
                      disabled={!isAvailable && !isSelected}
                      className={btnClass}
                      title={`${seat.section} Row ${seat.row_label} Seat ${seat.seat_number} - ${seat.category}`}
                    >
                      <span className={`text-[8px] sm:text-[10px] font-bold ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        {seat.seat_number}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {/* Row Label Right */}
              <div className="w-4 sm:w-6 text-left font-mono text-[10px] sm:text-xs font-bold text-white/30 uppercase">
                {rowLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
