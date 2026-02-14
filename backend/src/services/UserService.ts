import { User, UserStats, LeaderboardEntry, Faction, FACTIONS, RankTier, getRankTier } from '../types';
import { query } from '../db/db';

export class UserService {
    private users: Map<string, User> = new Map();
    private colorPalette: string[] = [
        '#FF2E63', '#08D9D6', '#00FFF5', '#FE53BB', '#F5D300',
        '#09FBD3', '#FF6B6B', '#845EC2', '#FF9671', '#00C9A7',
        '#F9F871', '#4ECDC4', '#45B7D1', '#E84393', '#00BBF9',
    ];
    private colorIndex: number = 0;
    private factionIndex: number = 0;

    /**
     * Register a user — checks DB for existing player by username.
     * If found, restores persistent profile. If not, creates new.
     */
    async registerUser(socketId: string, username?: string): Promise<User> {
        const generatedUsername = username || this.generateUsername();

        // Check if player exists in DB
        try {
            const existing = await query<any>(
                'SELECT * FROM players WHERE username = $1',
                [generatedUsername]
            );

            if (existing.rows.length > 0) {
                const row = existing.rows[0];
                const user: User = {
                    id: row.id,
                    socketId,
                    username: row.username,
                    color: row.color,
                    faction: row.faction as Faction,
                    capturesCount: row.total_captures,
                    roundCaptures: 0,
                    streak: 0,
                    rank: row.rank as RankTier,
                    connectedAt: Date.now(),
                    lastActivity: Date.now(),
                };

                this.users.set(user.id, user);

                // Update last_seen
                await query(
                    'UPDATE players SET last_seen_at = NOW() WHERE id = $1',
                    [user.id]
                );

                console.log(`✅ ${user.username} reconnected [${user.faction}] (${user.capturesCount} total captures)`);
                return user;
            }
        } catch (err: any) {
            console.error('⚠️ DB lookup failed, creating in-memory user:', err.message);
        }

        // New player
        const userId = this.generateUserId();
        const user: User = {
            id: userId,
            socketId,
            username: generatedUsername,
            color: this.getNextColor(),
            faction: this.getNextFaction(),
            capturesCount: 0,
            roundCaptures: 0,
            streak: 0,
            rank: 'Bronze',
            connectedAt: Date.now(),
            lastActivity: Date.now(),
        };

        this.users.set(userId, user);

        // Persist to DB
        try {
            await query(
                `INSERT INTO players (id, username, color, faction, rank, total_captures)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (username) DO UPDATE SET last_seen_at = NOW()`,
                [user.id, user.username, user.color, user.faction, user.rank, 0]
            );

            await query(
                `INSERT INTO player_stats (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
                [user.id]
            );
        } catch (err: any) {
            console.error('⚠️ Failed to persist new player:', err.message);
        }

        console.log(`✅ ${user.username} joined [${user.faction}]`);
        return user;
    }

    getUserBySocket(socketId: string): User | undefined {
        return Array.from(this.users.values()).find(user => user.socketId === socketId);
    }

    getUserById(userId: string): User | undefined {
        return this.users.get(userId);
    }

    /**
     * Disconnect user — sync to DB, remove from memory.
     */
    async disconnectUser(socketId: string): Promise<User | undefined> {
        const user = this.getUserBySocket(socketId);
        if (user) {
            // Sync to DB before removing from memory
            await this.syncPlayerToDB(user);
            this.users.delete(user.id);
            console.log(`👋 ${user.username} left [${user.faction}]`);
            return user;
        }
        return undefined;
    }

    updateUserActivity(userId: string): void {
        const user = this.users.get(userId);
        if (user) {
            user.lastActivity = Date.now();
        }
    }

    incrementCaptureCount(userId: string, points: number = 1): { newCount: number; rankUp: RankTier | null; previousRank: RankTier } {
        const user = this.users.get(userId);
        if (!user) return { newCount: 0, rankUp: null, previousRank: 'Bronze' };

        const previousRank = user.rank;
        user.capturesCount += points;
        user.roundCaptures += points;
        user.streak++;

        // Check rank up
        const newRank = getRankTier(user.capturesCount);
        user.rank = newRank;

        return {
            newCount: user.capturesCount,
            rankUp: newRank !== previousRank ? newRank : null,
            previousRank,
        };
    }

    resetStreak(userId: string): void {
        const user = this.users.get(userId);
        if (user) user.streak = 0;
    }

    resetRoundCaptures(): void {
        this.users.forEach(user => {
            user.roundCaptures = 0;
        });
    }

    getUserStats(userId: string): UserStats | null {
        const user = this.users.get(userId);
        if (!user) return null;

        return {
            userId: user.id,
            username: user.username,
            capturesCount: user.capturesCount,
            connectedDuration: Date.now() - user.connectedAt,
        };
    }

    getLeaderboard(limit: number = 10): LeaderboardEntry[] {
        const sortedUsers = Array.from(this.users.values())
            .sort((a, b) => b.roundCaptures - a.roundCaptures || b.capturesCount - a.capturesCount)
            .slice(0, limit);

        return sortedUsers.map((user, index) => ({
            username: user.username,
            color: user.color,
            faction: user.faction,
            capturesCount: user.capturesCount,
            roundCaptures: user.roundCaptures,
            streak: user.streak,
            rank: user.rank,
            position: index + 1,
        }));
    }

    /**
     * All-time leaderboard from DB.
     */
    async getAllTimeLeaderboard(limit: number = 20): Promise<any[]> {
        try {
            const res = await query<any>(
                `SELECT p.username, p.color, p.faction, p.rank, p.total_captures,
                        ps.total_wins, ps.total_rounds_played, ps.best_round_score
                 FROM players p
                 LEFT JOIN player_stats ps ON p.id = ps.player_id
                 ORDER BY p.total_captures DESC
                 LIMIT $1`,
                [limit]
            );
            return res.rows;
        } catch (err: any) {
            console.error('⚠️ Failed to fetch all-time leaderboard:', err.message);
            return [];
        }
    }

    getOnlineCount(): number {
        return this.users.size;
    }

    getAllUsers(): User[] {
        return Array.from(this.users.values());
    }

    setUsername(userId: string, username: string): boolean {
        const user = this.users.get(userId);
        if (user && username.length >= 3 && username.length <= 20) {
            user.username = username;
            console.log(`✏️ User renamed to: ${username}`);
            return true;
        }
        return false;
    }

    /**
     * Sync a player's current state to the database.
     */
    async syncPlayerToDB(user: User): Promise<void> {
        try {
            await query(
                `UPDATE players SET
                    rank = $2,
                    total_captures = $3,
                    last_seen_at = NOW()
                 WHERE id = $1`,
                [user.id, user.rank, user.capturesCount]
            );

            await query(
                `UPDATE player_stats SET
                    total_captures = $2,
                    highest_rank = CASE
                        WHEN $3 = 'Neon' THEN 'Neon'
                        WHEN $3 = 'Diamond' AND highest_rank NOT IN ('Neon') THEN 'Diamond'
                        WHEN $3 = 'Gold' AND highest_rank NOT IN ('Neon', 'Diamond') THEN 'Gold'
                        WHEN $3 = 'Silver' AND highest_rank NOT IN ('Neon', 'Diamond', 'Gold') THEN 'Silver'
                        ELSE highest_rank
                    END
                 WHERE player_id = $1`,
                [user.id, user.capturesCount, user.rank]
            );
        } catch (err: any) {
            console.error(`⚠️ Failed to sync player ${user.username} to DB:`, err.message);
        }
    }

    /**
     * Sync ALL online players to DB (used at round end / shutdown).
     */
    async syncAllToDB(): Promise<void> {
        const promises = Array.from(this.users.values()).map(user => this.syncPlayerToDB(user));
        await Promise.allSettled(promises);
        console.log(`💾 Synced ${this.users.size} players to database`);
    }

    private generateUserId(): string {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateUsername(): string {
        const prefixes = ['Neon', 'Cyber', 'Shadow', 'Quantum', 'Void', 'Plasma', 'Dark', 'Zero', 'Nova', 'Flux'];
        const suffixes = ['Runner', 'Blade', 'Storm', 'Fang', 'Core', 'Pulse', 'Shift', 'Wraith', 'Byte', 'Spark'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        return `${prefix}${suffix}${Math.floor(Math.random() * 100)}`;
    }

    private getNextColor(): string {
        const color = this.colorPalette[this.colorIndex];
        this.colorIndex = (this.colorIndex + 1) % this.colorPalette.length;
        return color;
    }

    private getNextFaction(): Faction {
        const faction = FACTIONS[this.factionIndex];
        this.factionIndex = (this.factionIndex + 1) % FACTIONS.length;
        return faction;
    }

    cleanupInactiveUsers(inactiveThresholdMs: number = 300000): number {
        const now = Date.now();
        let removedCount = 0;

        this.users.forEach((user, userId) => {
            if (now - user.lastActivity > inactiveThresholdMs) {
                this.users.delete(userId);
                removedCount++;
            }
        });

        if (removedCount > 0) {
            console.log(`🧹 Cleaned up ${removedCount} inactive users`);
        }

        return removedCount;
    }
}
