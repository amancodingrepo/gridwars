// ==========================================
// NEON DOMINION — Core Types
// ==========================================

// Factions
export type Faction = 'Neon Wolves' | 'Cyber Syndicate' | 'Quantum Legion' | 'Shadow Circuit' | 'Void Collective' | 'Plasma Hive';

export const FACTIONS: Faction[] = ['Neon Wolves', 'Cyber Syndicate', 'Quantum Legion', 'Shadow Circuit', 'Void Collective', 'Plasma Hive'];

// Rank tiers
export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Neon';

export function getRankTier(captures: number): RankTier {
    if (captures >= 200) return 'Neon';
    if (captures >= 100) return 'Diamond';
    if (captures >= 50) return 'Gold';
    if (captures >= 20) return 'Silver';
    return 'Bronze';
}

// Cell
export interface Cell {
    id: string;
    ownerId: string | null;
    color: string | null;
    lastCapturedAt: number;
    isCore: boolean;
}

// User
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
    connectedAt: number;
    lastActivity: number;
}

// Energy
export interface EnergyState {
    current: number;
    max: number;
    regenRate: number; // per second
    lastRegenAt: number;
}

// Game round
export type RoundStatus = 'waiting' | 'active' | 'ended';

export interface RoundState {
    roundNumber: number;
    status: RoundStatus;
    startedAt: number;
    endsAt: number;
    durationMs: number;
    winner: { username: string; color: string; faction: Faction; score: number } | null;
}

// Capture
export interface CaptureRequest {
    cellId: string;
}

export interface CaptureResult {
    success: boolean;
    reason?: string;
    cell?: Cell;
    energyCost?: number;
    pointsAwarded?: number;
    isCore?: boolean;
}

// Cluster bonus
export interface ClusterBonus {
    userId: string;
    username: string;
    color: string;
    clusterSize: number;
    bonusPoints: number;
}

// Leaderboard
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

// Snapshot
export interface GridSnapshot {
    cells: Map<string, Cell>;
    timestamp: number;
    totalCells: number;
    claimedCells: number;
}

export interface UserStats {
    userId: string;
    username: string;
    capturesCount: number;
    connectedDuration: number;
}

// ==========================================
// Socket Events
// ==========================================

export interface ServerToClientEvents {
    // Grid
    cell_updated: (data: { cellId: string; cell: Cell }) => void;
    full_sync: (data: { cells: Record<string, Cell>; coreZones: string[]; round: RoundState }) => void;

    // User
    user_connected: (data: { user: User; onlineCount: number }) => void;
    user_disconnected: (data: { userId: string; onlineCount: number }) => void;
    welcome: (data: { user: User; energy: EnergyState }) => void;

    // Energy
    energy_update: (data: EnergyState) => void;

    // Leaderboard & activity
    leaderboard_update: (leaderboard: LeaderboardEntry[]) => void;
    activity_feed: (data: ActivityEvent) => void;

    // Game
    round_update: (data: RoundState) => void;
    game_over: (data: { round: RoundState; topPlayers: LeaderboardEntry[] }) => void;
    cluster_bonus: (data: ClusterBonus) => void;
    rank_up: (data: { username: string; newRank: RankTier; previousRank: RankTier }) => void;

    // Errors
    capture_rejected: (data: { cellId: string; reason: string }) => void;
    rate_limited: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
    capture: (data: CaptureRequest) => void;
    request_full_sync: () => void;
    set_username: (username: string) => void;
}

// Activity event types
export type ActivityEventType = 'capture' | 'core_capture' | 'cluster_bonus' | 'rank_up' | 'round_start' | 'round_end';

export interface ActivityEvent {
    type: ActivityEventType;
    username: string;
    color: string;
    cellId?: string;
    message: string;
    timestamp: number;
}
