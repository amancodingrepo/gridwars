# ⚡ GridWars — Real-Time Multiplayer Territory Control

A real-time multiplayer grid game where players compete to capture and control territory on a shared board. Built with Next.js, Socket.io, and PostgreSQL.

## 🎮 Gameplay

- Join the arena and claim tiles by clicking on the grid
- Every capture costs energy — manage it wisely
- Compete against other players in timed rounds
- Dominate the leaderboard before the round ends

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| **Backend** | Node.js, Express, Socket.io, TypeScript |
| **Database** | PostgreSQL (Neon) |
| **Real-Time** | WebSocket via Socket.io |

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or a [Neon](https://neon.tech) account)

### 1. Clone & Install

```bash
git clone https://github.com/amancodingrepo/gridwars.git
cd gridwars
```

```bash
# Backend
cd backend
npm install

# Frontend
cd ../app
npm install
```

### 2. Configure Environment

**Backend** — create `backend/.env`:
```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://user:password@host/dbname
GRID_WIDTH=100
GRID_HEIGHT=100
CAPTURE_COOLDOWN_MS=5000
MAX_CAPTURES_PER_SECOND=10
RATE_LIMIT_WINDOW_MS=1000
SNAPSHOT_INTERVAL_MS=30000
```

**Frontend** — create `app/.env.local`:
```env
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GRID_SIZE=100
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd app
npm run dev
```

Open **http://localhost:3000**

## 🏗️ Architecture

```
Next.js Frontend ←→ Socket.io ←→ Node.js Backend ←→ PostgreSQL
                                        ↕
                                 In-Memory Grid State
```

- **Server-authoritative** — all game logic runs on the backend
- **In-memory grid** — O(1) cell access for real-time performance
- **Periodic snapshots** — grid state persisted to PostgreSQL every 30s
- **Conflict resolution** — cooldown-based capture protection

## ✨ Features

- ⚡ Real-time multiplayer with <100ms latency
- 🏆 Live leaderboard with rank progression
- 🔋 Energy system with regeneration
- ⏱️ Timed rounds with game-over summary
- 🛡️ Rate limiting & anti-spam protection
- 🔄 Automatic reconnection with state sync
- 🎨 Cyberpunk-themed UI with glassmorphism

## 📄 License

MIT
