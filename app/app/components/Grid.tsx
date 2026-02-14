'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Cell } from '../types';

interface GridProps {
    cells: Record<string, Cell>;
    coreZones: string[];
    onCellClick: (cellId: string) => void;
    gridSize: number;
    lastCapture: { cellId: string; color: string } | null;
    isLowEnergy?: boolean;
    isTimerUrgent?: boolean;
}

interface Ripple {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    color: string;
}

// Camera state
interface Camera {
    x: number; // top-left X in world coords
    y: number;
    zoom: number; // 1.0 = default
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5;
const ZOOM_SPEED = 0.1;

export function Grid({ cells, coreZones, onCellClick, gridSize, lastCapture, isLowEnergy = false, isTimerUrgent = false }: GridProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const ripplesRef = useRef<Ripple[]>([]);
    const animRef = useRef<number>(0);
    const timeRef = useRef(0);

    // Camera
    const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const dragCamStart = useRef({ x: 0, y: 0 });

    const coreSet = useMemo(() => new Set(coreZones), [coreZones]);

    // Base cell size (how big one cell is in world coordinates)
    const baseCellSize = useMemo(() => {
        return Math.max(window.innerWidth, window.innerHeight) / gridSize;
    }, [gridSize]);

    // Ripple on capture
    useEffect(() => {
        if (!lastCapture) return;
        const [x, y] = lastCapture.cellId.split('-').map(Number);
        ripplesRef.current.push({
            x: (x + 0.5) * baseCellSize,
            y: (y + 0.5) * baseCellSize,
            radius: baseCellSize * 0.5,
            maxRadius: baseCellSize * 6,
            alpha: 0.45,
            color: lastCapture.color,
        });
    }, [lastCapture, baseCellSize]);

    // Zoom handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const cam = camRef.current;
            const oldZoom = cam.zoom;
            const delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
            const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta * oldZoom));

            // Zoom towards mouse pointer
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            // World position under mouse before zoom
            const worldX = cam.x + mouseX / oldZoom;
            const worldY = cam.y + mouseY / oldZoom;

            // Adjust camera so mouse world point stays under cursor
            cam.x = worldX - mouseX / newZoom;
            cam.y = worldY - mouseY / newZoom;
            cam.zoom = newZoom;
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', onWheel);
    }, []);

    // Drag/pan handlers
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
            // Middle click, right click, or shift+left click = drag
            isDragging.current = true;
            dragStart.current = { x: e.clientX, y: e.clientY };
            dragCamStart.current = { x: camRef.current.x, y: camRef.current.y };
            e.preventDefault();
        }
    }, []);

    const onMouseMoveHandler = useCallback((e: React.MouseEvent) => {
        if (isDragging.current) {
            const cam = camRef.current;
            cam.x = dragCamStart.current.x - (e.clientX - dragStart.current.x) / cam.zoom;
            cam.y = dragCamStart.current.y - (e.clientY - dragStart.current.y) / cam.zoom;
        } else {
            // Hover
            const cam = camRef.current;
            const worldX = cam.x + e.clientX / cam.zoom;
            const worldY = cam.y + e.clientY / cam.zoom;
            const cx = Math.floor(worldX / baseCellSize);
            const cy = Math.floor(worldY / baseCellSize);
            if (cx >= 0 && cx < gridSize && cy >= 0 && cy < gridSize) {
                setHoveredCell(`${cx}-${cy}`);
            } else {
                setHoveredCell(null);
            }
        }
    }, [baseCellSize, gridSize]);

    const onMouseUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    const onClick = useCallback((e: React.MouseEvent) => {
        if (e.shiftKey) return; // shift is for drag
        const cam = camRef.current;
        const worldX = cam.x + e.clientX / cam.zoom;
        const worldY = cam.y + e.clientY / cam.zoom;
        const cx = Math.floor(worldX / baseCellSize);
        const cy = Math.floor(worldY / baseCellSize);
        if (cx >= 0 && cx < gridSize && cy >= 0 && cy < gridSize) {
            onCellClick(`${cx}-${cy}`);
        }
    }, [baseCellSize, gridSize, onCellClick]);

    // Double click = center
    const onDoubleClick = useCallback((e: React.MouseEvent) => {
        const cam = camRef.current;
        const worldX = cam.x + e.clientX / cam.zoom;
        const worldY = cam.y + e.clientY / cam.zoom;
        // Center camera on this world point
        cam.x = worldX - (window.innerWidth / 2) / cam.zoom;
        cam.y = worldY - (window.innerHeight / 2) / cam.zoom;
    }, []);

    // Main render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
            timeRef.current += 0.016;
            const t = timeRef.current;

            const w = window.innerWidth;
            const h = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;

            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const cam = camRef.current;
            const cs = baseCellSize;

            // Background
            ctx.fillStyle = '#030508';
            ctx.fillRect(0, 0, w, h);

            // Nebula glows (screen-space, before camera transform)
            const nebulaX = w * 0.45;
            const nebulaY = h * 0.35;
            const nebGrad = ctx.createRadialGradient(nebulaX, nebulaY, 0, nebulaX, nebulaY, w * 0.4);
            nebGrad.addColorStop(0, 'rgba(90, 50, 180, 0.06)');
            nebGrad.addColorStop(0.4, 'rgba(30, 80, 180, 0.03)');
            nebGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = nebGrad;
            ctx.fillRect(0, 0, w, h);

            const neb2X = w * 0.7;
            const neb2Y = h * 0.65;
            const nebGrad2 = ctx.createRadialGradient(neb2X, neb2Y, 0, neb2X, neb2Y, w * 0.3);
            nebGrad2.addColorStop(0, 'rgba(0, 150, 180, 0.04)');
            nebGrad2.addColorStop(1, 'transparent');
            ctx.fillStyle = nebGrad2;
            ctx.fillRect(0, 0, w, h);

            // Apply camera transform
            ctx.save();
            ctx.scale(cam.zoom, cam.zoom);
            ctx.translate(-cam.x, -cam.y);

            const gap = Math.max(0.3, cs * 0.04);

            // Visible cell range
            const startX = Math.max(0, Math.floor(cam.x / cs) - 1);
            const startY = Math.max(0, Math.floor(cam.y / cs) - 1);
            const endX = Math.min(gridSize, Math.ceil((cam.x + w / cam.zoom) / cs) + 1);
            const endY = Math.min(gridSize, Math.ceil((cam.y + h / cam.zoom) / cs) + 1);

            // Draw cells
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const cellId = `${x}-${y}`;
                    const cell = cells[cellId];
                    const px = x * cs;
                    const py = y * cs;
                    const isCore = coreSet.has(cellId);
                    const isHovered = cellId === hoveredCell;
                    const ix = px + gap;
                    const iy = py + gap;
                    const iw = cs - gap * 2;
                    const ih = cs - gap * 2;

                    if (cell?.color) {
                        ctx.shadowColor = cell.color;
                        ctx.shadowBlur = 8;
                        ctx.fillStyle = cell.color;
                        ctx.globalAlpha = 0.9;
                        ctx.fillRect(ix, iy, iw, ih);
                        ctx.globalAlpha = 1;
                        ctx.shadowBlur = 0;
                        ctx.shadowColor = 'transparent';

                        ctx.fillStyle = 'rgba(255,255,255,0.08)';
                        ctx.fillRect(ix, iy, iw, ih * 0.3);
                    } else if (isCore) {
                        const pulse = 0.12 + Math.sin(t * 2.5 + x + y) * 0.08;
                        ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
                        ctx.fillRect(ix, iy, iw, ih);

                        ctx.strokeStyle = `rgba(255, 215, 0, ${0.2 + Math.sin(t * 2.5) * 0.15})`;
                        ctx.lineWidth = 0.8;
                        ctx.strokeRect(ix, iy, iw, ih);

                        const cx = px + cs * 0.5;
                        const cy = py + cs * 0.5;
                        const s = cs * 0.15;
                        ctx.fillStyle = `rgba(255, 215, 0, ${0.25 + Math.sin(t * 3) * 0.1})`;
                        ctx.beginPath();
                        ctx.moveTo(cx, cy - s);
                        ctx.lineTo(cx + s, cy);
                        ctx.lineTo(cx, cy + s);
                        ctx.lineTo(cx - s, cy);
                        ctx.closePath();
                        ctx.fill();

                        // Coordinate label (only if zoomed in enough)
                        if (cam.zoom > 0.5) {
                            ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
                            ctx.font = `${Math.max(7, cs * 0.35)}px 'JetBrains Mono', monospace`;
                            ctx.textAlign = 'center';
                            ctx.fillText(`(${x},${y})`, cx, cy + cs * 0.65);
                        }
                    } else {
                        ctx.fillStyle = 'rgba(10, 18, 35, 0.15)';
                        ctx.fillRect(ix, iy, iw, ih);

                        ctx.strokeStyle = 'rgba(0, 200, 167, 0.018)';
                        ctx.lineWidth = 0.2;
                        ctx.strokeRect(ix, iy, iw, ih);
                    }

                    if (isHovered) {
                        ctx.fillStyle = 'rgba(0, 245, 212, 0.08)';
                        ctx.fillRect(ix, iy, iw, ih);
                        ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1);
                    }
                }
            }

            // Ripples (in world space)
            const ripples = ripplesRef.current;
            for (let i = ripples.length - 1; i >= 0; i--) {
                const r = ripples[i];
                r.radius += 2;
                r.alpha *= 0.93;
                if (r.alpha < 0.005 || r.radius > r.maxRadius) { ripples.splice(i, 1); continue; }

                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.strokeStyle = r.color;
                ctx.globalAlpha = r.alpha;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            ctx.restore();

            // Vignette (screen-space) — cinematic depth
            const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.65);
            vigGrad.addColorStop(0, 'transparent');
            vigGrad.addColorStop(0.7, 'rgba(3, 5, 8, 0.35)');
            vigGrad.addColorStop(1, 'rgba(3, 5, 8, 0.65)');
            ctx.fillStyle = vigGrad;
            ctx.fillRect(0, 0, w, h);

            // ===== MINI-MAP (bottom-left corner) =====
            const mmSize = 100;
            const mmPad = 16;
            const mmX = mmPad;
            const mmY = h - mmSize - mmPad;
            const mmScale = mmSize / (gridSize * cs);

            // Mini-map background
            ctx.fillStyle = 'rgba(6, 12, 24, 0.75)';
            ctx.strokeStyle = 'rgba(0, 245, 212, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4, 6);
            ctx.fill();
            ctx.stroke();

            // Mini-map cells
            for (const [cellId, cell] of Object.entries(cells)) {
                if (!cell.color) continue;
                const [cx, cy] = cellId.split('-').map(Number);
                const mpx = mmX + cx * cs * mmScale;
                const mpy = mmY + cy * cs * mmScale;
                const ms = Math.max(1, cs * mmScale);
                ctx.fillStyle = cell.color;
                ctx.globalAlpha = 0.8;
                ctx.fillRect(mpx, mpy, ms, ms);
            }
            ctx.globalAlpha = 1;

            // Core zones on minimap
            for (const coreId of coreZones) {
                const [cx, cy] = coreId.split('-').map(Number);
                const mpx = mmX + cx * cs * mmScale;
                const mpy = mmY + cy * cs * mmScale;
                const ms = Math.max(1.5, cs * mmScale);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
                ctx.fillRect(mpx, mpy, ms, ms);
            }

            // Viewport rect on minimap
            const vpLeft = mmX + cam.x * mmScale;
            const vpTop = mmY + cam.y * mmScale;
            const vpW = (w / cam.zoom) * mmScale;
            const vpH = (h / cam.zoom) * mmScale;
            ctx.strokeStyle = 'rgba(0, 245, 212, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(vpLeft, vpTop, vpW, vpH);

            // Zoom indicator
            ctx.fillStyle = 'rgba(0, 245, 212, 0.4)';
            ctx.font = "9px 'JetBrains Mono', monospace";
            ctx.textAlign = 'left';
            ctx.fillText(`${Math.round(cam.zoom * 100)}%`, mmX + 2, mmY - 6);

            animRef.current = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animRef.current);
    }, [cells, gridSize, hoveredCell, coreSet, baseCellSize, coreZones]);

    // Prevent context menu on right-click
    useEffect(() => {
        const prevent = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', prevent);
        return () => document.removeEventListener('contextmenu', prevent);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0"
            style={{ cursor: isDragging.current ? 'grabbing' : 'crosshair' }}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMoveHandler}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { isDragging.current = false; setHoveredCell(null); }}
        />
    );
}
