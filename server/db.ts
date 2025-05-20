import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Connecting to database...");

// Create connection pool with error handling and better configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduce max connections
  idleTimeoutMillis: 30000, // Longer idle timeout
  connectionTimeoutMillis: 5000, // Connection timeout
  allowExitOnIdle: true
});

// Add error handler
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Create drizzle client
export const db = drizzle({ client: pool, schema });
