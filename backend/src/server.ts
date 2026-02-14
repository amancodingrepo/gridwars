import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GridService } from './services/GridService';
import { UserService } from './services/UserService';
import { EnergyService } from './services/EnergyService';
import { GameRoundService } from './services/GameRoundService';
import { RateLimiter } from './middleware/RateLimiter';
import { SocketHandler } from './websocket/SocketHandler';
import { ServerToClientEvents, ClientToServerEvents } from './types';
import { initDB, closeDB } from './db/db';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,https://gridwars-m8oe23z37-aman-manhars-projects.vercel.app').split(',');

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// Initialize services
const gridWidth = parseInt(process.env.GRID_WIDTH || '100');
const gridHeight = parseInt(process.env.GRID_HEIGHT || '100');
const cooldownMs = parseInt(process.env.CAPTURE_COOLDOWN_MS || '5000');
const maxCapturesPerSecond = parseInt(process.env.MAX_CAPTURES_PER_SECOND || '10');
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000');
const roundDurationMs = parseInt(process.env.ROUND_DURATION_MS || '300000'); // 5 min

const gridService = new GridService(gridWidth, gridHeight, cooldownMs);
const userService = new UserService();
const energyService = new EnergyService(100, 5, 1); // 100 max, 5 cost, 1/sec regen
const gameRoundService = new GameRoundService(roundDurationMs, 10000);
const rateLimiter = new RateLimiter();
const socketHandler = new SocketHandler(
    io as any,
    gridService,
    userService,
    energyService,
    gameRoundService,
    rateLimiter,
    maxCapturesPerSecond,
    rateLimitWindowMs
);

// REST API endpoints
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        database: process.env.DATABASE_URL ? 'connected' : 'none',
    });
});

app.get('/api/stats', (_req, res) => {
    const gridStats = gridService.getStats();
    const onlineUsers = userService.getOnlineCount();
    const leaderboard = userService.getLeaderboard(10);
    const round = gameRoundService.getState();

    res.json({
        grid: gridStats,
        users: { online: onlineUsers, leaderboard },
        round,
    });
});

app.get('/api/grid', (_req, res) => {
    const gridState = gridService.getAllCells();
    res.json(gridState);
});

app.get('/api/leaderboard', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = userService.getLeaderboard(limit);
    res.json(leaderboard);
});

// ==========================================
// NEW: Neon DB-Powered Endpoints
// ==========================================

// All-time leaderboard (from database)
app.get('/api/leaderboard/alltime', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const leaderboard = await userService.getAllTimeLeaderboard(limit);
        res.json(leaderboard);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Player profile (from database)
app.get('/api/player/:username', async (req, res) => {
    try {
        const { query: dbQuery } = await import('./db/db');
        const result = await dbQuery(
            `SELECT p.*, ps.total_rounds_played, ps.total_wins, ps.best_round_score, ps.highest_rank
             FROM players p
             LEFT JOIN player_stats ps ON p.id = ps.player_id
             WHERE p.username = $1`,
            [req.params.username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Round history (from database)
app.get('/api/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const history = await gameRoundService.getRoundHistory(limit);
        res.json(history);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// WebSocket connection handling
io.on('connection', (socket: Socket) => {
    socketHandler.handleConnection(socket as any);
});

// ==========================================
// Server startup with DB initialization
// ==========================================

async function startServer() {
    const PORT = process.env.PORT || 3001;

    // Initialize database
    try {
        await initDB();
        console.log('✅ Neon DB connected and schema ready');
    } catch (err: any) {
        console.error('⚠️ Database initialization failed:', err.message);
        console.log('   Server will continue without persistence (in-memory only)');
    }

    // Start first round
    gameRoundService.startRound();

    // Periodic tasks
    setInterval(() => {
        rateLimiter.cleanup();
        socketHandler.broadcastGridStats();
    }, 60000);

    // Broadcast round timer every second
    setInterval(() => {
        socketHandler.broadcastRoundTimer();
    }, 1000);

    // Start listening
    httpServer.listen(PORT, () => {
        console.log('\n⚡ NEON DOMINION Server Started\n');
        console.log(`📡 Port: ${PORT}`);
        console.log(`🗺️  Grid: ${gridWidth}×${gridHeight} (${gridWidth * gridHeight} cells)`);
        console.log(`⭐ Core zones: ${gridService.getCoreZones().length}`);
        console.log(`⏱️  Round: ${roundDurationMs / 1000}s`);
        console.log(`🔋 Energy: 100 max, 5/capture, +1/sec`);
        console.log(`🚦 Rate limit: ${maxCapturesPerSecond}/${rateLimitWindowMs}ms`);
        console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Neon DB ✅' : 'None (in-memory)'}`);
        console.log('\n✅ Ready for battle\n');
    });
}

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    gameRoundService.destroy();

    // Sync all players to DB
    try {
        await userService.syncAllToDB();
        console.log('💾 All players synced to database');
    } catch (err: any) {
        console.error('⚠️ Failed to sync players:', err.message);
    }

    const snapshot = gridService.exportSnapshot();
    console.log(`💾 Grid snapshot: ${snapshot.claimedCells} cells claimed`);

    // Close DB pool
    await closeDB();

    httpServer.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('⚠️ Forced shutdown');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Run
startServer();
