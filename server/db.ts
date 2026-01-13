import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Initialize Neon database connection
export const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
};

// Export singleton instance
let dbInstance: ReturnType<typeof getDb> | null = null;

export const db = () => {
  if (!dbInstance) {
    dbInstance = getDb();
  }
  return dbInstance;
};
