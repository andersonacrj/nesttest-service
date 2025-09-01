// import pg from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { cfg } from '../config/config';
// const pool = new pg.Pool({ connectionString: cfg().databaseUrl });
// export const db = drizzle(pool);
// export { pool };




// import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// import postgres from 'postgres';
// import { cfg } from '../config/config';

// // Create postgres client
// const postgresClient = postgres(cfg().databaseUrl);

// // Create drizzle instance
// export const db: PostgresJsDatabase = drizzle(postgresClient);

// // Export the postgres client for connection management
// export { postgresClient as pool };


import { sql } from 'drizzle-orm';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cfg } from 'src/config/config';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

console.log('Database URL:', cfg().databaseUrl);
// Create postgres client
const postgresClient = postgres(cfg().databaseUrl);

// Create drizzle instance
export const db: PostgresJsDatabase = drizzle(postgresClient);

// Export the postgres client for connection management
export { postgresClient as pool };

// Initialize connection (test it)
let isInitialized = false;

export const initializeDb = async (): Promise<void> => {
  if (isInitialized) return;
  
  try {
    await db.execute(sql`SELECT 1`);
    console.log('Database connection established successfully');
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    throw error;
  }
};

// Auto-initialize on import (optional)
initializeDb().catch(console.error);
