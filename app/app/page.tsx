'use client';

import { useSocket } from './hooks/useSocket';
import { Grid } from './components/Grid';
import { Leaderboard } from './components/Leaderboard';
import { ActivityFeed } from './components/ActivityFeed';
import { ConnectionStatus } from './components/ConnectionStatus';
import { EnergyBar } from './components/EnergyBar';
import { MatchTimer } from './components/MatchTimer';
import { GameOverOverlay } from './components/GameOverOverlay';
import { StartScreen } from './components/StartScreen';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { RANK_ICONS } from './types';

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const {
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
  } = useSocket();

  const gridSize = parseInt(process.env.NEXT_PUBLIC_GRID_SIZE || '100');

  const [isTimerUrgent, setIsTimerUrgent] = useState(false);
  const [isTimerCritical, setIsTimerCritical] = useState(false);

  // Score animation state
  const [scorePop, setScorePop] = useState(false);
  const prevScoreRef = useRef(0);

  const stats = useMemo(() => {
    const total = gridSize * gridSize;
    const myCells = currentUser
      ? Object.values(cells).filter((c) => c.color === currentUser.color).length
      : 0;
    return { total, myCells };
  }, [cells, gridSize, currentUser]);

  // Detect score changes for pop animation
  useEffect(() => {
    if (stats.myCells !== prevScoreRef.current && prevScoreRef.current > 0) {
      setScorePop(true);
      const timer = setTimeout(() => setScorePop(false), 350);
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = stats.myCells;
  }, [stats.myCells]);

  const handleUrgencyChange = useCallback((urgent: boolean, critical: boolean) => {
    setIsTimerUrgent(urgent);
    setIsTimerCritical(critical);
  }, []);

  const isLowEnergy = energy.current / energy.max < 0.2;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* ===== START SCREEN — gates gameplay ===== */}
      {!gameStarted && (
        <StartScreen
          onStart={() => setGameStarted(true)}
          isConnected={isConnected}
          onlineCount={onlineCount}
        />
      )}

      {/* GRID — Full viewport canvas background */}
      {isConnected ? (
        <Grid
          cells={cells}
          coreZones={coreZones}
          onCellClick={captureCell}
          gridSize={gridSize}
          lastCapture={lastCapture}
          isLowEnergy={isLowEnergy}
          isTimerUrgent={isTimerUrgent}
        />
      ) : (
        <div className="fixed inset-0 bg-[#030508] flex items-center justify-center z-0">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#00F5D4]/15 border-t-[#00F5D4] animate-spin" />
            <p className="text-[9px] text-[#4A5578] tracking-[0.2em] font-mono-game">CONNECTING TO NEON CORE</p>
          </div>
        </div>
      )}

      {/* Viewport neon frame — urgency reactive */}
      <div className={`viewport-frame ${isTimerUrgent ? 'timer-urgent' : ''}`} />

      {/* Low energy vignette overlay */}
      {isLowEnergy && <div className="low-energy-vignette" />}

      {/* ===== TOP-LEFT — Compact Logo ===== */}
      <div className="fixed top-3 left-3 z-30 pointer-events-none">
        <div className="glass-hud px-3 py-2 pointer-events-auto flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #00F5D4, #00C9A7)',
              boxShadow: '0 0 8px rgba(0, 245, 212, 0.15)',
            }}
          >
            <span className="text-[10px] font-black text-white">N</span>
          </div>
          <div>
            <h1 className="text-[10px] font-bold text-white/80 leading-none tracking-[0.1em]">
              NEON DOMINION
            </h1>
            <p className="text-[7px] text-[#4A5578] tracking-[0.2em] mt-0.5">TACTICAL VIEW</p>
          </div>
        </div>
      </div>

      {/* ===== TOP-CENTER — Timer (Dominant) + Score ===== */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="glass-hud px-6 py-3 pointer-events-auto flex items-center gap-5">
          {/* Timer — DOMINANT element */}
          <MatchTimer round={round} onUrgencyChange={handleUrgencyChange} />

          {/* Subtle divider */}
          <div className="w-px h-7 bg-white/[0.04]" />

          {/* Score — supports timer */}
          <div className="text-center">
            <div className="text-[8px] text-[#4A5578] tracking-[0.15em] mb-0.5">SCORE</div>
            <div
              className={`text-[16px] font-bold text-white font-mono-game tabular-nums leading-none ${scorePop ? 'score-pop' : ''}`}
              style={{
                textShadow: scorePop ? '0 0 12px rgba(0, 245, 212, 0.4)' : undefined,
              }}
            >
              {currentUser ? stats.myCells : 0}
            </div>
          </div>
        </div>
      </div>

      {/* ===== TOP-RIGHT — Connection Status ===== */}
      <div className="fixed top-3 right-3 z-30 pointer-events-none">
        <div className="glass-hud px-3 py-2 pointer-events-auto">
          <ConnectionStatus isConnected={isConnected} onlineCount={onlineCount} />
        </div>
      </div>

      {/* ===== BOTTOM-LEFT — Player State Cluster ===== */}
      <div className="fixed bottom-4 left-3 z-20 space-y-2 pointer-events-auto">
        {/* User badge + Energy */}
        {currentUser && (
          <div className="glass-hud px-3 py-2 flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: currentUser.color,
                boxShadow: `0 0 5px ${currentUser.color}40`,
              }}
            />
            <span className="text-[9px] font-medium text-gray-300">{currentUser.username}</span>
            <span className="text-[7px] text-[#4A5578]">{currentUser.faction}</span>
            <span className={`rank-badge rank-${currentUser.rank.toLowerCase()}`}>
              {RANK_ICONS[currentUser.rank]}
            </span>
            {/* Divider */}
            <div className="w-px h-3.5 bg-white/[0.04]" />
            {/* Inline energy bar */}
            <EnergyBar energy={energy} />
          </div>
        )}
      </div>

      {/* ===== RIGHT SIDE — Contextual Panels (top-aligned) ===== */}
      <div className="fixed top-16 right-3 z-20 w-[220px] space-y-2 pointer-events-auto">
        {/* Activity Feed — auto-fading */}
        <ActivityFeed activities={activityFeed} />

        {/* Leaderboard — collapsible */}
        <Leaderboard entries={leaderboard} currentUser={currentUser} />
      </div>

      {/* Game Over */}
      <GameOverOverlay data={gameOver} />
    </div>
  );
}
