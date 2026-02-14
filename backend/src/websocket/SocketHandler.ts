import { Server, Socket } from 'socket.io';
import { GridService } from '../services/GridService';
import { UserService } from '../services/UserService';
import { EnergyService } from '../services/EnergyService';
import { GameRoundService } from '../services/GameRoundService';
import { RateLimiter } from '../middleware/RateLimiter';
import {
    ServerToClientEvents, ClientToServerEvents, CaptureRequest,
    ActivityEvent, RoundState,
} from '../types';

export class SocketHandler {
    private io: Server<ClientToServerEvents, ServerToClientEvents>;
    private gridService: GridService;
    private userService: UserService;
    private energyService: EnergyService;
    private gameRoundService: GameRoundService;
    private rateLimiter: RateLimiter;
    private maxCapturesPerSecond: number;
    private rateLimitWindowMs: number;

    constructor(
        io: Server<ClientToServerEvents, ServerToClientEvents>,
        gridService: GridService,
        userService: UserService,
        energyService: EnergyService,
        gameRoundService: GameRoundService,
        rateLimiter: RateLimiter,
        maxCapturesPerSecond: number = 10,
        rateLimitWindowMs: number = 1000
    ) {
        this.io = io;
        this.gridService = gridService;
        this.userService = userService;
        this.energyService = energyService;
        this.gameRoundService = gameRoundService;
        this.rateLimiter = rateLimiter;
        this.maxCapturesPerSecond = maxCapturesPerSecond;
        this.rateLimitWindowMs = rateLimitWindowMs;

        // Setup game round callbacks
        this.gameRoundService.setCallbacks(
            (state: RoundState) => this.onRoundStart(state),
            (state: RoundState) => this.onRoundEnd(state),
        );
    }

    async handleConnection(socket: Socket): Promise<void> {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Register user (now async — checks DB for returning players)
        const user = await this.userService.registerUser(socket.id);
        const energy = this.energyService.initUserEnergy(user.id);

        // Send welcome with user info and energy
        socket.emit('welcome', { user, energy });

        // Send full game state
        const gridState = this.gridService.getAllCells();
        const coreZones = this.gridService.getCoreZones();
        const round = this.gameRoundService.getState();
        socket.emit('full_sync', { cells: gridState, coreZones, round });

        // Broadcast online count
        this.io.emit('user_connected', {
            user,
            onlineCount: this.userService.getOnlineCount(),
        });

        // Send leaderboard
        socket.emit('leaderboard_update', this.userService.getLeaderboard());

        // Send round state
        socket.emit('round_update', this.gameRoundService.getState());

        // --- Event listeners ---

        socket.on('capture', (data: CaptureRequest) => {
            this.handleCaptureRequest(socket, data);
        });

        socket.on('request_full_sync', () => {
            const gridState = this.gridService.getAllCells();
            const coreZones = this.gridService.getCoreZones();
            const round = this.gameRoundService.getState();
            socket.emit('full_sync', { cells: gridState, coreZones, round });
        });

        socket.on('set_username', (username: string) => {
            const u = this.userService.getUserBySocket(socket.id);
            if (u && this.userService.setUsername(u.id, username)) {
                this.io.emit('leaderboard_update', this.userService.getLeaderboard());
            }
        });

        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });
    }

    private handleCaptureRequest(socket: Socket, data: CaptureRequest): void {
        const user = this.userService.getUserBySocket(socket.id);

        if (!user) {
            socket.emit('capture_rejected', { cellId: data.cellId, reason: 'User not found' });
            return;
        }

        // Check if round is active
        if (!this.gameRoundService.isActive()) {
            socket.emit('capture_rejected', { cellId: data.cellId, reason: 'Round not active. Wait for next round!' });
            return;
        }

        // Rate limiting
        if (!this.rateLimiter.isAllowed(user.id, this.maxCapturesPerSecond, this.rateLimitWindowMs)) {
            socket.emit('rate_limited', { message: 'Too fast! Slow down.' });
            return;
        }

        // Energy check
        const energyResult = this.energyService.consumeEnergy(user.id);
        if (!energyResult.success) {
            socket.emit('capture_rejected', { cellId: data.cellId, reason: 'Not enough energy!' });
            socket.emit('energy_update', energyResult.newState);
            return;
        }

        // Update user activity
        this.userService.updateUserActivity(user.id);

        // Attempt capture
        const result = this.gridService.captureCell(data.cellId, user.id, user.color);

        if (result.success && result.cell) {
            const points = result.pointsAwarded || 1;

            // Increment captures
            const { rankUp, previousRank } = this.userService.incrementCaptureCount(user.id, points);

            // Broadcast cell update
            this.io.emit('cell_updated', { cellId: data.cellId, cell: result.cell });

            // Send energy update to this user
            socket.emit('energy_update', energyResult.newState);

            // Activity feed
            const activityType = result.isCore ? 'core_capture' : 'capture';
            const message = result.isCore
                ? `⭐ ${user.username} captured a CORE ZONE! (+${points})`
                : `${user.username} → ${data.cellId}`;

            this.broadcastActivity({
                type: activityType,
                username: user.username,
                color: user.color,
                cellId: data.cellId,
                message,
                timestamp: Date.now(),
            });

            // Check cluster bonus
            const cluster = this.gridService.findLargestCluster(user.id);
            if (cluster.size >= 5 && cluster.size % 5 === 0) {
                const bonusPoints = Math.floor(cluster.size / 5);
                this.userService.incrementCaptureCount(user.id, bonusPoints);

                this.io.emit('cluster_bonus', {
                    userId: user.id,
                    username: user.username,
                    color: user.color,
                    clusterSize: cluster.size,
                    bonusPoints,
                });

                this.broadcastActivity({
                    type: 'cluster_bonus',
                    username: user.username,
                    color: user.color,
                    message: `🔥 ${user.username} formed a ${cluster.size}-cell cluster! (+${bonusPoints} bonus)`,
                    timestamp: Date.now(),
                });
            }

            // Rank up notification
            if (rankUp) {
                this.io.emit('rank_up', {
                    username: user.username,
                    newRank: rankUp,
                    previousRank: previousRank,
                });

                this.broadcastActivity({
                    type: 'rank_up',
                    username: user.username,
                    color: user.color,
                    message: `🏆 ${user.username} reached ${rankUp} rank!`,
                    timestamp: Date.now(),
                });
            }

            // Update leaderboard
            this.io.emit('leaderboard_update', this.userService.getLeaderboard());

            console.log(`✓ ${user.username} captured ${data.cellId}${result.isCore ? ' ⭐CORE' : ''} (+${points})`);
        } else {
            socket.emit('capture_rejected', {
                cellId: data.cellId,
                reason: result.reason || 'Capture failed',
            });
        }
    }

    private async handleDisconnection(socket: Socket): Promise<void> {
        const user = await this.userService.disconnectUser(socket.id);

        if (user) {
            this.energyService.removeUser(user.id);

            this.io.emit('user_disconnected', {
                userId: user.id,
                onlineCount: this.userService.getOnlineCount(),
            });

            this.io.emit('leaderboard_update', this.userService.getLeaderboard());
        }

        console.log(`🔌 Client disconnected: ${socket.id}`);
    }

    private broadcastActivity(event: ActivityEvent): void {
        this.io.emit('activity_feed', event);
    }

    // --- Round lifecycle ---

    private onRoundStart(state: RoundState): void {
        // Reset grid and energy
        this.gridService.resetGrid();
        this.energyService.resetAll();
        this.userService.resetRoundCaptures();

        // Broadcast
        this.io.emit('round_update', state);

        const gridState = this.gridService.getAllCells();
        const coreZones = this.gridService.getCoreZones();
        this.io.emit('full_sync', { cells: gridState, coreZones, round: state });

        this.broadcastActivity({
            type: 'round_start',
            username: 'System',
            color: '#FFD700',
            message: `🏁 Round ${state.roundNumber} started! Fight for the Neon Core!`,
            timestamp: Date.now(),
        });

        console.log(`📢 Round ${state.roundNumber} broadcasted to all clients`);
    }

    private async onRoundEnd(state: RoundState): Promise<void> {
        const topPlayers = this.userService.getLeaderboard(5);

        this.io.emit('game_over', { round: state, topPlayers });
        this.io.emit('round_update', state);

        // Sync all players to DB at round end
        await this.userService.syncAllToDB();

        this.broadcastActivity({
            type: 'round_end',
            username: 'System',
            color: '#FFD700',
            message: state.winner
                ? `🏆 Round ${state.roundNumber} over! Winner: ${state.winner.username} (${state.winner.score} pts)`
                : `⏱️ Round ${state.roundNumber} ended!`,
            timestamp: Date.now(),
        });
    }

    broadcastGridStats(): void {
        const stats = this.gridService.getStats();
        console.log(`📊 Grid stats:`, stats);
    }

    broadcastRoundTimer(): void {
        this.io.emit('round_update', this.gameRoundService.getState());
    }
}
