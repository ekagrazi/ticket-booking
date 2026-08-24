import { useState, useEffect } from 'react';
import { differenceInSeconds, parseISO } from 'date-fns';

export function useHoldCountdown(heldUntil: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!heldUntil) {
      setTimeLeft(0);
      setIsExpired(true);
      return;
    }

    const endDate = parseISO(heldUntil);

    const updateTimer = () => {
      const now = new Date();
      const diff = differenceInSeconds(endDate, now);
      
      if (diff <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
      } else {
        setTimeLeft(diff);
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [heldUntil]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { timeLeft, isExpired, formattedTime };
}
