'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
    entries: LeaderboardEntry[];
    currentUser: { username: string; color: string } | null;
}

export function Leaderboard({ entries, currentUser }: LeaderboardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="glass-panel px-3 py-2.5" style={{ background: 'rgba(6, 12, 24, 0.6)' }}>
            {/* Toggle header */}
            <button
                className="leaderboard-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="text-[8px] font-bold text-[#4A5578] tracking-[0.15em]">
                    LEADERBOARD
                    <span className="text-[#2D3548] ml-1.5 font-normal">
                        {entries.length > 0 ? `(${entries.length})` : ''}
                    </span>
                </span>
                <span className="text-[9px] text-[#2D3548] transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}
                >
                    ▸
                </span>
            </button>

            {/* Collapsible body */}
            <div className={`leaderboard-body ${isExpanded ? 'expanded' : 'collapsed'}`}>
                <div className="space-y-0.5 pt-2">
                    <AnimatePresence mode="popLayout">
                        {entries.slice(0, 5).map((entry, index) => {
                            const isCurrentUser = currentUser?.username === entry.username;
                            return (
                                <motion.div
                                    key={entry.username}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className={`flex items-center gap-1.5 py-1 px-1 rounded ${isCurrentUser ? 'bg-[#00F5D4]/[0.04]' : ''
                                        }`}
                                >
                                    <span className="text-[8px] text-[#2D3548] w-2.5 font-mono-game">{index + 1}</span>
                                    <div
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{
                                            backgroundColor: entry.color,
                                            boxShadow: `0 0 3px ${entry.color}30`,
                                        }}
                                    />
                                    <span className="text-[9px] text-gray-400 flex-1 truncate">
                                        {entry.username}
                                        {isCurrentUser && <span className="text-[7px] text-[#00F5D4]/60 ml-1">you</span>}
                                    </span>
                                    <span className="text-[9px] font-semibold font-mono-game tabular-nums text-[#6B7A99]">
                                        {entry.roundCaptures}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {entries.length === 0 && (
                        <div className="text-[#2D3548] text-center py-2 text-[8px]">No captures yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}
