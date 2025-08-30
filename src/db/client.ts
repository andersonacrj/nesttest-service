import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { cfg } from '../config/config';
const pool = new pg.Pool({ connectionString: cfg().databaseUrl });
export const db = drizzle(pool);
export { pool };
