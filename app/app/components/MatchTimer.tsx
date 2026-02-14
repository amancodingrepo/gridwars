'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RoundState } from '../types';

interface MatchTimerProps {
    round: RoundState | null;
    onUrgencyChange?: (isUrgent: boolean, isCritical: boolean) => void;
}

export function MatchTimer({ round, onUrgencyChange }: MatchTimerProps) {
    const [timeLeft, setTimeLeft] = useState(0);
    const prevUrgent = useRef(false);
    const prevCritical = useRef(false);

    useEffect(() => {
        if (!round || round.status !== 'active') { setTimeLeft(0); return; }
        const update = () => setTimeLeft(Math.max(0, round.endsAt - Date.now()));
        update();
        const interval = setInterval(update, 200);
        return () => clearInterval(interval);
    }, [round]);

    const totalSec = Math.ceil(timeLeft / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const isUrgent = totalSec <= 20 && totalSec > 10 && round?.status === 'active';
    const isCritical = totalSec <= 10 && totalSec > 0 && round?.status === 'active';

    // Notify parent of urgency state changes
    useEffect(() => {
        if (isUrgent !== prevUrgent.current || isCritical !== prevCritical.current) {
            prevUrgent.current = isUrgent;
            prevCritical.current = isCritical;
            onUrgencyChange?.(isUrgent || isCritical, isCritical);
        }
    }, [isUrgent, isCritical, onUrgencyChange]);

    if (!round) return null;

    const timeStr = round.status === 'active'
        ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : '--:--';

    const timerClass = isCritical
        ? 'timer-critical-text'
        : isUrgent
            ? 'timer-urgent-text'
            : 'text-white';

    return (
        <div className="text-center">
            <div
                className={`text-[28px] font-bold font-mono-game tabular-nums leading-none ${timerClass}`}
                style={{
                    letterSpacing: '0.08em',
                    textShadow: (!isUrgent && !isCritical)
                        ? '0 0 8px rgba(0, 245, 212, 0.15)'
                        : undefined,
                }}
            >
                {timeStr}
            </div>
        </div>
    );
}
