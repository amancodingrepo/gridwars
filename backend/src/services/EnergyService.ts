import { EnergyState } from '../types';

const DEFAULT_MAX_ENERGY = 100;
const DEFAULT_CAPTURE_COST = 5;
const DEFAULT_REGEN_RATE = 1; // per second

export class EnergyService {
    private energyMap: Map<string, EnergyState> = new Map();
    private readonly maxEnergy: number;
    private readonly captureCost: number;
    private readonly regenRate: number;

    constructor(maxEnergy = DEFAULT_MAX_ENERGY, captureCost = DEFAULT_CAPTURE_COST, regenRate = DEFAULT_REGEN_RATE) {
        this.maxEnergy = maxEnergy;
        this.captureCost = captureCost;
        this.regenRate = regenRate;
    }

    initUserEnergy(userId: string): EnergyState {
        const state: EnergyState = {
            current: this.maxEnergy,
            max: this.maxEnergy,
            regenRate: this.regenRate,
            lastRegenAt: Date.now(),
        };
        this.energyMap.set(userId, state);
        return state;
    }

    getEnergy(userId: string): EnergyState {
        let state = this.energyMap.get(userId);
        if (!state) {
            state = this.initUserEnergy(userId);
        }

        // Apply passive regen
        const now = Date.now();
        const elapsedSec = (now - state.lastRegenAt) / 1000;
        const regenAmount = Math.floor(elapsedSec * state.regenRate);

        if (regenAmount > 0) {
            state.current = Math.min(state.max, state.current + regenAmount);
            state.lastRegenAt = now;
        }

        return { ...state };
    }

    canCapture(userId: string): boolean {
        const state = this.getEnergy(userId);
        return state.current >= this.captureCost;
    }

    consumeEnergy(userId: string): { success: boolean; newState: EnergyState; cost: number } {
        const state = this.energyMap.get(userId);
        if (!state) {
            const newState = this.initUserEnergy(userId);
            return { success: false, newState, cost: this.captureCost };
        }

        // Apply regen first
        const now = Date.now();
        const elapsedSec = (now - state.lastRegenAt) / 1000;
        const regenAmount = Math.floor(elapsedSec * state.regenRate);
        if (regenAmount > 0) {
            state.current = Math.min(state.max, state.current + regenAmount);
            state.lastRegenAt = now;
        }

        if (state.current < this.captureCost) {
            return { success: false, newState: { ...state }, cost: this.captureCost };
        }

        state.current -= this.captureCost;
        state.lastRegenAt = now;

        return { success: true, newState: { ...state }, cost: this.captureCost };
    }

    removeUser(userId: string): void {
        this.energyMap.delete(userId);
    }

    getCaptureCost(): number {
        return this.captureCost;
    }

    resetAll(): void {
        this.energyMap.forEach((state) => {
            state.current = this.maxEnergy;
            state.lastRegenAt = Date.now();
        });
    }
}
