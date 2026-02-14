export class RateLimiter {
    private requests: Map<string, number[]> = new Map();

    isAllowed(userId: string, maxRequests: number, windowMs: number): boolean {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];

        // Remove old requests outside the time window
        const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

        if (validRequests.length >= maxRequests) {
            return false;
        }

        validRequests.push(now);
        this.requests.set(userId, validRequests);
        return true;
    }

    reset(userId: string): void {
        this.requests.delete(userId);
    }

    cleanup(): void {
        const now = Date.now();
        const maxAge = 60000; // Clean up entries older than 1 minute

        this.requests.forEach((timestamps, userId) => {
            const validTimestamps = timestamps.filter(ts => now - ts < maxAge);
            if (validTimestamps.length === 0) {
                this.requests.delete(userId);
            } else {
                this.requests.set(userId, validTimestamps);
            }
        });
    }
}
