'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartScreenProps {
    onStart: () => void;
    isConnected: boolean;
    onlineCount: number;
}

export function StartScreen({ onStart, isConnected, onlineCount }: StartScreenProps) {
    const [isHovering, setIsHovering] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);

    // Animated background particles
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let t = 0;

        const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 1.5 + 0.3,
                alpha: Math.random() * 0.15 + 0.03,
            });
        }

        const render = () => {
            t += 0.008;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Deep void background
            ctx.fillStyle = '#030508';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Nebula glow
            const cx = canvas.width * 0.5;
            const cy = canvas.height * 0.45;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.5);
            grad.addColorStop(0, 'rgba(0, 245, 212, 0.03)');
            grad.addColorStop(0.3, 'rgba(90, 50, 180, 0.02)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Particles
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                const breathe = p.alpha + Math.sin(t + p.x * 0.01) * p.alpha * 0.4;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 245, 212, ${breathe})`;
                ctx.fill();
            }

            // Grid lines (subtle)
            ctx.strokeStyle = 'rgba(0, 245, 212, 0.015)';
            ctx.lineWidth = 0.5;
            const spacing = 60;
            for (let x = 0; x < canvas.width; x += spacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += spacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Vignette
            const vig = ctx.createRadialGradient(cx, cy, canvas.width * 0.15, cx, cy, canvas.width * 0.7);
            vig.addColorStop(0, 'transparent');
            vig.addColorStop(1, 'rgba(3, 5, 8, 0.7)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            animRef.current = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
            {/* Animated background */}
            <canvas ref={canvasRef} className="absolute inset-0" />

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative z-10 flex flex-col items-center gap-8"
            >
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, #00F5D4, #00C9A7)',
                            boxShadow: '0 0 40px rgba(0, 245, 212, 0.2), 0 0 80px rgba(0, 245, 212, 0.08)',
                        }}
                    >
                        <span className="text-2xl font-black text-white">N</span>
                    </div>
                    <div className="text-center">
                        <h1
                            className="text-3xl font-bold text-white tracking-[0.15em] leading-none"
                            style={{ textShadow: '0 0 20px rgba(0, 245, 212, 0.15)' }}
                        >
                            NEON DOMINION
                        </h1>
                        <p className="text-[10px] text-[#4A5578] tracking-[0.4em] mt-2 font-mono-game">
                            TACTICAL GRID ARENA
                        </p>
                    </div>
                </div>

                {/* Connection status */}
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-3 h-3">
                        <div
                            className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#00F5D4]' : 'bg-[#FF3B5C]'}`}
                            style={{
                                boxShadow: isConnected
                                    ? '0 0 4px rgba(0, 245, 212, 0.4)'
                                    : '0 0 4px rgba(255, 59, 92, 0.4)',
                            }}
                        />
                        {isConnected && (
                            <div className="absolute w-2.5 h-2.5 rounded-full bg-[#00F5D4]/10 animate-ping" />
                        )}
                    </div>
                    <span className="text-[10px] text-[#4A5578] tracking-wider font-mono-game">
                        {isConnected
                            ? `SERVER CONNECTED · ${onlineCount} ONLINE`
                            : 'CONNECTING TO SERVER...'}
                    </span>
                </div>

                {/* Start button */}
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onHoverStart={() => setIsHovering(true)}
                    onHoverEnd={() => setIsHovering(false)}
                    onClick={() => isConnected && onStart()}
                    disabled={!isConnected}
                    className="relative group cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {/* Glow ring on hover */}
                    <AnimatePresence>
                        {isHovering && isConnected && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute -inset-3 rounded-2xl"
                                style={{
                                    background: 'radial-gradient(ellipse, rgba(0, 245, 212, 0.08) 0%, transparent 70%)',
                                }}
                            />
                        )}
                    </AnimatePresence>

                    <div
                        className="relative px-14 py-4 rounded-xl border transition-all duration-200"
                        style={{
                            background: isConnected
                                ? 'linear-gradient(135deg, rgba(0, 245, 212, 0.08), rgba(0, 245, 212, 0.03))'
                                : 'rgba(10, 15, 30, 0.5)',
                            borderColor: isConnected
                                ? 'rgba(0, 245, 212, 0.2)'
                                : 'rgba(74, 85, 120, 0.2)',
                            boxShadow: isConnected
                                ? '0 0 30px rgba(0, 245, 212, 0.06), inset 0 1px 0 rgba(255,255,255,0.03)'
                                : 'none',
                        }}
                    >
                        <span
                            className="text-sm font-bold tracking-[0.3em] font-mono-game"
                            style={{
                                color: isConnected ? '#00F5D4' : '#4A5578',
                                textShadow: isConnected ? '0 0 8px rgba(0, 245, 212, 0.3)' : 'none',
                            }}
                        >
                            {isConnected ? 'ENTER ARENA' : 'CONNECTING...'}
                        </span>
                    </div>
                </motion.button>

                {/* Instructions hint */}
                <div className="text-center space-y-1.5 mt-2">
                    <p className="text-[9px] text-[#2D3548] tracking-[0.15em]">
                        CLICK CELLS TO CAPTURE · SCROLL TO ZOOM · SHIFT+DRAG TO PAN
                    </p>
                    <p className="text-[8px] text-[#2D3548]/60 tracking-[0.1em]">
                        CAPTURE CORE ZONES FOR BONUS POINTS
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
