import { Cell, GridSnapshot, CaptureResult } from '../types';

const NUM_CORE_ZONES = 8;

export class GridService {
    private grid: Map<string, Cell> = new Map();
    private readonly gridWidth: number;
    private readonly gridHeight: number;
    private readonly cooldownMs: number;
    private coreZones: Set<string> = new Set();

    constructor(width: number = 100, height: number = 100, cooldownMs: number = 5000) {
        this.gridWidth = width;
        this.gridHeight = height;
        this.cooldownMs = cooldownMs;
        this.initializeGrid();
    }

    private initializeGrid(): void {
        this.grid.clear();
        this.coreZones.clear();

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const cellId = `${x}-${y}`;
                this.grid.set(cellId, {
                    id: cellId,
                    ownerId: null,
                    color: null,
                    lastCapturedAt: 0,
                    isCore: false,
                });
            }
        }

        // Generate core zones
        this.generateCoreZones();

        console.log(`✅ Grid initialized: ${this.gridWidth}x${this.gridHeight} = ${this.grid.size} cells`);
        console.log(`⭐ Core zones: ${Array.from(this.coreZones).join(', ')}`);
    }

    private generateCoreZones(): void {
        const margin = Math.floor(Math.min(this.gridWidth, this.gridHeight) * 0.15);
        const placed = new Set<string>();

        while (placed.size < NUM_CORE_ZONES) {
            const x = margin + Math.floor(Math.random() * (this.gridWidth - 2 * margin));
            const y = margin + Math.floor(Math.random() * (this.gridHeight - 2 * margin));
            const cellId = `${x}-${y}`;

            // Don't cluster cores too close together (min 10 cells apart)
            let tooClose = false;
            for (const existing of placed) {
                const [ex, ey] = existing.split('-').map(Number);
                const dist = Math.abs(x - ex) + Math.abs(y - ey);
                if (dist < 10) { tooClose = true; break; }
            }

            if (!tooClose && !placed.has(cellId)) {
                placed.add(cellId);
                this.coreZones.add(cellId);
                const cell = this.grid.get(cellId);
                if (cell) cell.isCore = true;
            }
        }
    }

    captureCell(cellId: string, userId: string, userColor: string): CaptureResult {
        const cell = this.grid.get(cellId);

        if (!cell) {
            return { success: false, reason: 'Invalid cell ID' };
        }

        const now = Date.now();

        // Cooldown check
        if (cell.lastCapturedAt && (now - cell.lastCapturedAt < this.cooldownMs)) {
            const remainingTime = Math.ceil((this.cooldownMs - (now - cell.lastCapturedAt)) / 1000);
            return {
                success: false,
                reason: `Cell on cooldown (${remainingTime}s remaining)`
            };
        }

        // Capture the cell
        cell.ownerId = userId;
        cell.color = userColor;
        cell.lastCapturedAt = now;

        const pointsAwarded = cell.isCore ? 5 : 1;

        return {
            success: true,
            cell: { ...cell },
            pointsAwarded,
            isCore: cell.isCore,
        };
    }

    getCellState(cellId: string): Cell | null {
        const cell = this.grid.get(cellId);
        return cell ? { ...cell } : null;
    }

    getAllCells(): Record<string, Cell> {
        const cellsObj: Record<string, Cell> = {};
        this.grid.forEach((cell, id) => {
            cellsObj[id] = { ...cell };
        });
        return cellsObj;
    }

    getCoreZones(): string[] {
        return Array.from(this.coreZones);
    }

    getUserCellCount(userId: string): number {
        let count = 0;
        this.grid.forEach((cell) => {
            if (cell.ownerId === userId) count++;
        });
        return count;
    }

    // Returns the largest cluster size for a user and its cells
    findLargestCluster(userId: string): { size: number; cells: string[] } {
        const visited: Set<string> = new Set();
        let maxCluster: string[] = [];

        this.grid.forEach((cell, cellId) => {
            if (cell.ownerId === userId && !visited.has(cellId)) {
                const cluster = this.getConnectedCluster(cellId, userId, visited);
                if (cluster.length > maxCluster.length) {
                    maxCluster = cluster;
                }
            }
        });

        return { size: maxCluster.length, cells: maxCluster };
    }

    private getConnectedCluster(startCellId: string, userId: string, visited: Set<string>): string[] {
        const stack: string[] = [startCellId];
        const cluster: string[] = [];

        while (stack.length > 0) {
            const cellId = stack.pop()!;
            if (visited.has(cellId)) continue;

            const cell = this.grid.get(cellId);
            if (!cell || cell.ownerId !== userId) continue;

            visited.add(cellId);
            cluster.push(cellId);

            const [x, y] = cellId.split('-').map(Number);
            const adjacent = [
                `${x - 1}-${y}`, `${x + 1}-${y}`,
                `${x}-${y - 1}`, `${x}-${y + 1}`,
            ];

            adjacent.forEach((adjId) => {
                if (!visited.has(adjId)) stack.push(adjId);
            });
        }

        return cluster;
    }

    // Reset grid for new round
    resetGrid(): void {
        this.initializeGrid();
        console.log('🔄 Grid reset for new round');
    }

    exportSnapshot(): GridSnapshot {
        const claimedCells = Array.from(this.grid.values()).filter(cell => cell.ownerId !== null).length;
        return {
            cells: new Map(this.grid),
            timestamp: Date.now(),
            totalCells: this.grid.size,
            claimedCells,
        };
    }

    loadSnapshot(snapshot: GridSnapshot): void {
        this.grid = new Map(snapshot.cells);
        console.log(`✅ Grid loaded from snapshot: ${snapshot.claimedCells}/${snapshot.totalCells} cells claimed`);
    }

    getStats() {
        const claimedCells = Array.from(this.grid.values()).filter(cell => cell.ownerId !== null).length;
        return {
            totalCells: this.grid.size,
            claimedCells,
            percentClaimed: ((claimedCells / this.grid.size) * 100).toFixed(2),
        };
    }
}
