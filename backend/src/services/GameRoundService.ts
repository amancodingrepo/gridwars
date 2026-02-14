import { RoundState, RoundStatus, LeaderboardEntry } from '../types';
import { query } from '../db/db';

const DEFAULT_ROUND_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_COOLDOWN_MS = 10 * 1000; // 10 seconds between rounds

export class GameRoundService {
    private roundNumber: number = 0;
    private status: RoundStatus = 'waiting';
    private startedAt: number = 0;
    private endsAt: number = 0;
    private durationMs: number;
    private cooldownMs: number;
    private winner: RoundState['winner'] = null;
    private roundTimer: ReturnType<typeof setTimeout> | null = null;
    private cooldownTimer: ReturnType<typeof setTimeout> | null = null;
    private dbRoundId: number | null = null; // DB row ID for current round

    private onRoundEnd: ((state: RoundState) => void) | null = null;
    private onRoundStart: ((state: RoundState) => void) | null = null;

    constructor(durationMs = DEFAULT_ROUND_DURATION_MS, cooldownMs = DEFAULT_COOLDOWN_MS) {
        this.durationMs = durationMs;
        this.cooldownMs = cooldownMs;
    }

    setCallbacks(onRoundStart: (state: RoundState) => void, onRoundEnd: (state: RoundState) => void): void {
        this.onRoundStart = onRoundStart;
        this.onRoundEnd = onRoundEnd;
    }

    startRound(): RoundState {
        this.roundNumber++;
        this.status = 'active';
        this.startedAt = Date.now();
        this.endsAt = this.startedAt + this.durationMs;
        this.winner = null;

        console.log(`\n🏁 Round ${this.roundNumber} started! (${this.durationMs / 1000}s)`);

        // Persist round start to DB
        this.persistRoundStart();

        // Set timer for round end
        if (this.roundTimer) clearTimeout(this.roundTimer);
        this.roundTimer = setTimeout(() => {
            this.endRound();
        }, this.durationMs);

        const state = this.getState();
        if (this.onRoundStart) this.onRoundStart(state);
        return state;
    }

    endRound(topPlayers?: LeaderboardEntry[]): RoundState {
        this.status = 'ended';

        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
            this.roundTimer = null;
        }

        // Determine winner from top players
        if (topPlayers && topPlayers.length > 0) {
            const top = topPlayers[0];
            this.winner = {
                username: top.username,
                color: top.color,
                faction: top.faction,
                score: top.roundCaptures,
            };
        }

        console.log(`\n🏆 Round ${this.roundNumber} ended! Winner: ${this.winner?.username || 'None'}`);

        // Persist round end + results to DB
        this.persistRoundEnd(topPlayers || []);

        const state = this.getState();
        if (this.onRoundEnd) this.onRoundEnd(state);

        // Auto-start next round after cooldown
        this.cooldownTimer = setTimeout(() => {
            this.startRound();
        }, this.cooldownMs);

        return state;
    }

    getState(): RoundState {
        return {
            roundNumber: this.roundNumber,
            status: this.status,
            startedAt: this.startedAt,
            endsAt: this.endsAt,
            durationMs: this.durationMs,
            winner: this.winner,
        };
    }

    isActive(): boolean {
        return this.status === 'active';
    }

    getTimeRemaining(): number {
        if (this.status !== 'active') return 0;
        return Math.max(0, this.endsAt - Date.now());
    }

    destroy(): void {
        if (this.roundTimer) clearTimeout(this.roundTimer);
        if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    }

    // ==========================================
    // Database Persistence
    // ==========================================

    private async persistRoundStart(): Promise<void> {
        try {
            const res = await query<any>(
                `INSERT INTO game_rounds (round_number, started_at, duration_ms, status)
                 VALUES ($1, $2, $3, 'active')
                 RETURNING id`,
                [this.roundNumber, new Date(this.startedAt), this.durationMs]
            );
            this.dbRoundId = res.rows[0]?.id || null;
            console.log(`   💾 Round ${this.roundNumber} persisted (DB id: ${this.dbRoundId})`);
        } catch (err: any) {
            console.error('⚠️ Failed to persist round start:', err.message);
        }
    }

    private async persistRoundEnd(topPlayers: LeaderboardEntry[]): Promise<void> {
        if (!this.dbRoundId) return;

        try {
            // Update round record
            const winnerId = topPlayers.length > 0 ? null : null; // We don't have the user ID here easily
            await query(
                `UPDATE game_rounds SET
                    ended_at = NOW(),
                    winner_username = $2,
                    winner_score = $3,
                    status = 'ended'
                 WHERE id = $1`,
                [
                    this.dbRoundId,
                    this.winner?.username || null,
                    this.winner?.score || null,
                ]
            );

            // Insert round results for all players
            for (let i = 0; i < topPlayers.length; i++) {
                const player = topPlayers[i];
                // Try to find player ID from DB by username
                const playerRes = await query<any>(
                    'SELECT id FROM players WHERE username = $1',
                    [player.username]
                );

                if (playerRes.rows.length > 0) {
                    const playerId = playerRes.rows[0].id;

                    await query(
                        `INSERT INTO round_results (round_id, player_id, captures, rank_achieved, placed)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [this.dbRoundId, playerId, player.roundCaptures, player.rank, i + 1]
                    );

                    // Update player_stats
                    const isWinner = i === 0;
                    await query(
                        `UPDATE player_stats SET
                            total_rounds_played = total_rounds_played + 1,
                            total_wins = total_wins + $2,
                            best_round_score = GREATEST(best_round_score, $3)
                         WHERE player_id = $1`,
                        [playerId, isWinner ? 1 : 0, player.roundCaptures]
                    );
                }
            }

            console.log(`   💾 Round ${this.roundNumber} results saved (${topPlayers.length} players)`);
        } catch (err: any) {
            console.error('⚠️ Failed to persist round end:', err.message);
        }
    }

    /**
     * Get round history from DB.
     */
    async getRoundHistory(limit: number = 10): Promise<any[]> {
        try {
            const res = await query<any>(
                `SELECT id, round_number, started_at, ended_at, duration_ms,
                        winner_username, winner_score, status
                 FROM game_rounds
                 ORDER BY id DESC
                 LIMIT $1`,
                [limit]
            );
            return res.rows;
        } catch (err: any) {
            console.error('⚠️ Failed to fetch round history:', err.message);
            return [];
        }
    }
}
