'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoundState, LeaderboardEntry, RANK_ICONS } from '../types';

interface GameOverOverlayProps {
    data: { round: RoundState; topPlayers: LeaderboardEntry[] } | null;
}

export function GameOverOverlay({ data }: GameOverOverlayProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (data) {
            setShow(true);
            const timer = setTimeout(() => setShow(false), 9000);
            return () => clearTimeout(timer);
        }
    }, [data]);

    if (!data || !show) return null;
    const { round, topPlayers } = data;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={() => setShow(false)}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 16 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="glass-panel p-8 max-w-sm w-full mx-4 text-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-5xl mb-4">🏆</div>
                    <h2 className="text-xl font-bold text-white mb-1 tracking-tight">
                        Round {round.roundNumber} Complete
                    </h2>

                    {round.winner ? (
                        <div className="my-5 p-4 rounded-xl border border-[#00F5D4]/10"
                            style={{ background: 'linear-gradient(135deg, rgba(0,245,212,0.04), rgba(123,97,255,0.04))' }}
                        >
                            <div className="w-10 h-10 rounded-full mx-auto mb-2"
                                style={{
                                    backgroundColor: round.winner.color,
                                    boxShadow: `0 0 20px ${round.winner.color}50`,
                                }}
                            />
                            <div className="text-lg font-bold text-white">{round.winner.username}</div>
                            <div className="text-[9px] text-[#6B7A99] tracking-wider">{round.winner.faction}</div>
                            <div className="text-2xl font-bold text-[#00F5D4] mt-1 font-mono-game">{round.winner.score} PTS</div>
                        </div>
                    ) : (
                        <p className="text-sm text-[#6B7A99] my-5">No winner this round</p>
                    )}

                    <div className="space-y-1.5 mb-4">
                        {topPlayers.slice(0, 3).map((player, i) => (
                            <motion.div
                                key={player.username}
                                initial={{ x: 12, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 + i * 0.08 }}
                                className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]"
                            >
                                <span className="text-sm">{['🥇', '🥈', '🥉'][i]}</span>
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.color }} />
                                <span className="text-[11px] text-gray-300 flex-1 text-left truncate">{player.username}</span>
                                <span className="text-[10px] font-bold font-mono-game text-gray-400">{player.roundCaptures}</span>
                            </motion.div>
                        ))}
                    </div>

                    <p className="text-[9px] text-[#3D4A66] animate-pulse tracking-[0.15em]">NEXT ROUND STARTING SOON</p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
