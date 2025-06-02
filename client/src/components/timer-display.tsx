import { useState, useEffect } from "react";
import { formatDuration } from "@/lib/timer-utils";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  startTime: Date | string;
  endTime?: Date | string | null;
  duration?: number | null;
  isRunning?: boolean;
  className?: string;
  showHours?: boolean;
}

export default function TimerDisplay({ 
  startTime, 
  endTime,
  duration,
  isRunning = true,
  className,
  showHours = true 
}: TimerDisplayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTimestamp = new Date(startTime).getTime();
    const accumulatedTime = duration || 0; // Tempo já acumulado de pausas anteriores
    
    const updateElapsed = () => {
      if (isRunning) {
        // Se está rodando, somar tempo atual + tempo acumulado
        const now = Date.now();
        const currentSessionSeconds = Math.floor((now - startTimestamp) / 1000);
        setElapsed(accumulatedTime + currentSessionSeconds);
      } else if (endTime) {
        // Se pausado, mostrar apenas o tempo acumulado
        setElapsed(accumulatedTime);
      } else {
        // Fallback para tempo acumulado
        setElapsed(accumulatedTime);
      }
    };

    // Update immediately
    updateElapsed();

    // Only set interval if running
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(updateElapsed, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, endTime, isRunning]);

  return (
    <span className={cn("font-mono", className)}>
      {formatDuration(elapsed, showHours)}
    </span>
  );
}
