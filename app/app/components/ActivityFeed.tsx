'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityEvent } from '../types';

interface ActivityFeedProps {
    activities: ActivityEvent[];
}

interface FeedItemProps {
    event: ActivityEvent;
    index: number;
}

function FeedItem({ event, index }: FeedItemProps) {
    const [visible, setVisible] = React.useState(true);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Auto-fade after 3 seconds
        timerRef.current = setTimeout(() => {
            setVisible(false);
        }, 3000);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (!visible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15, delay: index * 0.03 }}
            className="py-0.5"
        >
            <div className="flex items-baseline gap-1.5">
                {event.cellId && (
                    <span className="text-[9px] text-[#00F5D4]/40 font-mono-game">
                        ({event.cellId.replace('-', ',')})
                    </span>
                )}
                <span className="text-[9px] text-[#4A5578] leading-snug">{event.message}</span>
            </div>
        </motion.div>
    );
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
    return (
        <div className="glass-panel px-3 py-2.5" style={{ background: 'rgba(6, 12, 24, 0.6)' }}>
            <h3 className="text-[8px] font-bold text-[#4A5578] tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-[#00F5D4]"
                        style={{ boxShadow: '0 0 3px rgba(0, 245, 212, 0.3)' }}
                    />
                    <div className="absolute w-2 h-2 rounded-full bg-[#00F5D4]/10 animate-ping" />
                </div>
                LIVE FEED
            </h3>

            <div className="space-y-0 max-h-[80px] overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                    {activities.slice(0, 4).map((event, i) => (
                        <FeedItem
                            key={`${event.timestamp}-${i}`}
                            event={event}
                            index={i}
                        />
                    ))}
                </AnimatePresence>

                {activities.length === 0 && (
                    <div className="text-[#2D3548] text-center py-2 text-[8px]">Waiting…</div>
                )}
            </div>
        </div>
    );
}
