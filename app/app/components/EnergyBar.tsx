'use client';

import React from 'react';
import { EnergyState } from '../types';

interface EnergyBarProps {
    energy: EnergyState;
}

export function EnergyBar({ energy }: EnergyBarProps) {
    const percent = Math.min(100, (energy.current / energy.max) * 100);
    const isLow = percent < 20;

    return (
        <div className="flex items-center gap-2.5">
            <div className="w-24 h-[3px] bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.02]">
                <div
                    className={`energy-fill h-full rounded-full transition-all duration-500 ${isLow ? 'animate-pulse' : ''}`}
                    style={{
                        width: `${percent}%`,
                        background: isLow
                            ? 'linear-gradient(90deg, #FF3B5C, #FF6B81)'
                            : 'linear-gradient(90deg, #00F5D4, #00C9A7)',
                        boxShadow: isLow
                            ? '0 0 6px rgba(255, 59, 92, 0.4)'
                            : '0 0 6px rgba(0, 245, 212, 0.25)',
                    }}
                />
            </div>
            <span className={`text-[11px] font-semibold font-mono-game tabular-nums ${isLow ? 'text-[#FF3B5C]' : 'text-[#6B7A99]'}`}>
                {Math.round(percent)}%
            </span>
        </div>
    );
}
