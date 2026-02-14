// ==========================================
// NEON DOMINION — Frontend Types
// ==========================================

export type Faction = 'Neon Wolves' | 'Cyber Syndicate' | 'Quantum Legion' | 'Shadow Circuit' | 'Void Collective' | 'Plasma Hive';
export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Neon';
export type RoundStatus = 'waiting' | 'active' | 'ended';
export type ActivityEventType = 'capture' | 'core_capture' | 'cluster_bonus' | 'rank_up' | 'round_start' | 'round_end';

export interface Cell {
    id: string;
    ownerId: string | null;
    color: string | null;
    lastCapturedAt: number;
    isCore: boolean;
}

export interface User {
    id: string;
    socketId: string;
    username: string;
    color: string;
    faction: Faction;
    capturesCount: number;
    roundCaptures: number;
    streak: number;
    rank: RankTier;
}

export interface EnergyState {
    current: number;
    max: number;
    regenRate: number;
    lastRegenAt: number;
}

export interface RoundState {
    roundNumber: number;
    status: RoundStatus;
    startedAt: number;
    endsAt: number;
    durationMs: number;
    winner: { username: string; color: string; faction: Faction; score: number } | null;
}

export interface LeaderboardEntry {
    username: string;
    color: string;
    faction: Faction;
    capturesCount: number;
    roundCaptures: number;
    streak: number;
    rank: RankTier;
    position: number;
}

export interface ActivityEvent {
    type: ActivityEventType;
    username: string;
    color: string;
    cellId?: string;
    message: string;
    timestamp: number;
}

export interface ClusterBonus {
    userId: string;
    username: string;
    color: string;
    clusterSize: number;
    bonusPoints: number;
}

export const RANK_COLORS: Record<RankTier, string> = {
    Bronze: '#CD7F32',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Diamond: '#B9F2FF',
    Neon: '#00FF88',
};

export const RANK_ICONS: Record<RankTier, string> = {
    Bronze: '🥉',
    Silver: '🥈',
    Gold: '🥇',
    Diamond: '💎',
    Neon: '⚡',
};
