'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Cell, LeaderboardEntry, ActivityEvent, EnergyState, RoundState, User, ClusterBonus, RankTier } from '../types';
import { playCapture, playCoreCapture, playRankUp, playClusterBonus, playRoundEnd, playDenied } from '../lib/SoundEngine';

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [cells, setCells] = useState<Record<string, Cell>>({});
    const [coreZones, setCoreZones] = useState<string[]>([]);
    const coreZonesRef = useRef<string[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [onlineCount, setOnlineCount] = useState(0);
    const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
    const [energy, setEnergy] = useState<EnergyState>({ current: 100, max: 100, regenRate: 1, lastRegenAt: Date.now() });
    const [round, setRound] = useState<RoundState | null>(null);
    const [gameOver, setGameOver] = useState<{ round: RoundState; topPlayers: LeaderboardEntry[] } | null>(null);
    const [lastCapture, setLastCapture] = useState<{ cellId: string; color: string } | null>(null);

    // Track energy regen locally for smooth UI
    const energyRef = useRef(energy);
    energyRef.current = energy;

    useEffect(() => {
        const interval = setInterval(() => {
            setEnergy(prev => {
                const now = Date.now();
                const elapsed = (now - prev.lastRegenAt) / 1000;
                const regen = Math.floor(elapsed * prev.regenRate);
                if (regen > 0 && prev.current < prev.max) {
                    return {
                        ...prev,
                        current: Math.min(prev.max, prev.current + regen),
                        lastRegenAt: now,
                    };
                }
                return prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
        const newSocket = io(wsUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
        });

        newSocket.on('connect', () => {
            console.log('⚡ Connected to Neon Dominion');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Welcome event with user info + energy
        newSocket.on('welcome', ({ user, energy: e }: { user: User; energy: EnergyState }) => {
            setCurrentUser(user);
            setEnergy(e);
        });

        // Full state sync
        newSocket.on('full_sync', ({ cells: c, coreZones: cz, round: r }: { cells: Record<string, Cell>; coreZones: string[]; round: RoundState }) => {
            setCells(c);
            setCoreZones(cz);
            coreZonesRef.current = cz;
            setRound(r);
            setGameOver(null); // Clear game over on new sync
        });

        // Cell updates
        newSocket.on('cell_updated', ({ cellId, cell }: { cellId: string; cell: Cell }) => {
            setCells(prev => ({ ...prev, [cellId]: cell }));
            setLastCapture({ cellId, color: cell.color || '#fff' });
            setTimeout(() => setLastCapture(null), 500);

            // Sound: core capture or normal capture
            if (coreZonesRef.current.includes(cellId)) {
                playCoreCapture();
            } else {
                playCapture();
            }
        });

        // Energy updates
        newSocket.on('energy_update', (e: EnergyState) => {
            setEnergy(e);
        });

        // Round updates
        newSocket.on('round_update', (r: RoundState) => {
            setRound(r);
        });

        // Game over
        newSocket.on('game_over', (data: { round: RoundState; topPlayers: LeaderboardEntry[] }) => {
            setGameOver(data);
            playRoundEnd();
        });

        // Leaderboard
        newSocket.on('leaderboard_update', (lb: LeaderboardEntry[]) => {
            setLeaderboard(lb);
        });

        // User connection events
        newSocket.on('user_connected', ({ onlineCount: count }) => {
            setOnlineCount(count);
        });

        newSocket.on('user_disconnected', ({ onlineCount: count }) => {
            setOnlineCount(count);
        });

        // Activity feed
        newSocket.on('activity_feed', (event: ActivityEvent) => {
            setActivityFeed(prev => [event, ...prev].slice(0, 15));
        });

        // Cluster bonus
        newSocket.on('cluster_bonus', (_data: ClusterBonus) => {
            playClusterBonus();
        });

        // Rank up
        newSocket.on('rank_up', (_data: { username: string; newRank: RankTier; previousRank: RankTier }) => {
            playRankUp();
        });

        // Errors
        newSocket.on('capture_rejected', ({ reason }: { cellId: string; reason: string }) => {
            console.warn(`❌ ${reason}`);
            playDenied();
        });

        newSocket.on('rate_limited', ({ message }: { message: string }) => {
            console.warn(`⚠️ ${message}`);
        });

        setSocket(newSocket);
        return () => { newSocket.close(); };
    }, []);

    const captureCell = useCallback((cellId: string) => {
        if (socket && isConnected) {
            socket.emit('capture', { cellId });
        }
    }, [socket, isConnected]);

    return {
        isConnected,
        cells,
        coreZones,
        leaderboard,
        currentUser,
        onlineCount,
        activityFeed,
        energy,
        round,
        gameOver,
        lastCapture,
        captureCell,
    };
}
