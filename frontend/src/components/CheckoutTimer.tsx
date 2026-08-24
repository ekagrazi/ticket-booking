'use client';
import { useHoldCountdown } from '@/hooks/useHoldCountdown';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutTimerProps {
  heldUntil: string;
  onExpire: () => void;
}

export function CheckoutTimer({ heldUntil, onExpire }: CheckoutTimerProps) {
  const { formattedTime, isExpired } = useHoldCountdown(heldUntil);

  if (isExpired) {
    onExpire();
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full font-mono font-medium shadow-sm transition-colors",
      "bg-amber-100 text-amber-800 border border-amber-200"
    )}>
      <Timer className="w-4 h-4 animate-pulse" />
      <span>{formattedTime}</span>
    </div>
  );
}
