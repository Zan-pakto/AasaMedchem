import { neon, Pool } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL environment variable is missing.');
}

// HTTP client - best for simple queries, works on Edge/Serverless with zero overhead
export const sql = neon(databaseUrl || '');

// WebSocket Pool client - best for transactions and connection pooling
let poolInstance: Pool | null = null;

export function getPool() {
  if (!databaseUrl) {
    throw new Error('Cannot initialize connection pool: DATABASE_URL is missing.');
  }
  if (!poolInstance) {
    poolInstance = new Pool({ connectionString: databaseUrl });
  }
  return poolInstance;
}

/**
 * Executes a set of database operations inside a transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 */
export async function runTransaction<T>(
  callback: (client: { query: (text: string, params?: any[]) => Promise<any> }) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
