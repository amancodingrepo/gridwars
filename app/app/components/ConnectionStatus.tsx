'use client';

import React from 'react';

interface ConnectionStatusProps {
    isConnected: boolean;
    onlineCount: number;
}

export function ConnectionStatus({ isConnected, onlineCount }: ConnectionStatusProps) {
    return (
        <div className="flex items-center gap-1.5">
            {/* Subtle live dot */}
            <div className="relative flex items-center justify-center w-3 h-3">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#00F5D4]' : 'bg-[#FF3B5C]'}`}
                    style={{
                        boxShadow: isConnected
                            ? '0 0 3px rgba(0, 245, 212, 0.3)'
                            : '0 0 3px rgba(255, 59, 92, 0.4)',
                    }}
                />
                {isConnected && (
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-[#00F5D4]/10 animate-ping" />
                )}
            </div>

            <span className="text-[9px] font-medium text-[#4A5578] tracking-wider">
                {isConnected ? `LIVE · ${onlineCount}` : 'OFFLINE'}
            </span>
        </div>
    );
}
