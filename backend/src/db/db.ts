import { Pool, QueryResult, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let pool: Pool | null = null;

/**
 * Get or create the connection pool.
 * Uses DATABASE_URL from environment.
 */
export function getPool(): Pool {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        pool.on('error', (err) => {
            console.error('❌ Unexpected database pool error:', err.message);
        });
    }
    return pool;
}

/**
 * Type-safe query helper.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: (string | number | boolean | null | Date)[]
): Promise<QueryResult<T>> {
    const p = getPool();
    return p.query<T>(text, params);
}

/**
 * Initialize the database — run schema.sql to create tables.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
export async function initDB(): Promise<void> {
    console.log('🗄️  Initializing database...');

    try {
        const p = getPool();

        // Test connection
        const res = await p.query('SELECT NOW()');
        console.log(`✅ Database connected: ${res.rows[0].now}`);

        // Run schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        await p.query(schemaSql);

        console.log('✅ Database schema initialized (4 tables)');

        // Log table counts
        const tables = ['players', 'game_rounds', 'round_results', 'player_stats'];
        for (const table of tables) {
            const count = await p.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   📊 ${table}: ${count.rows[0].count} rows`);
        }
    } catch (err: any) {
        console.error('❌ Database initialization failed:', err.message);
        throw err;
    }
}

/**
 * Gracefully close the pool.
 */
export async function closeDB(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('🗄️  Database pool closed');
    }
}
