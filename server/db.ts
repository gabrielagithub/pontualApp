import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detectar se está usando Neon e se ele está hibernando
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech');
const isProductionReady = !isNeonDatabase || process.env.NODE_ENV === 'production';

// Imports para PostgreSQL padrão
import { Pool } from 'pg';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';

// Detectar ambiente: Docker vs Render/Cloud
const isDocker = process.env.DATABASE_URL?.includes('postgres:5432') || 
                 process.env.DATABASE_URL?.includes('localhost:5432') ||
                 process.env.DATABASE_URL?.includes('db:5432');

let db: any;

console.log('🔍 Detectando ambiente:');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.slice(0, 50) + '...');
console.log('isDocker:', isDocker);

if (isDocker) {
  // Configuração para Docker com PostgreSQL padrão
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  db = drizzleNodePg(pool, { schema });
  console.log('✅ PostgreSQL configurado para Docker (node-postgres)');
  
} else {
  // Configuração para Cloud/Render com PostgreSQL padrão
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  db = drizzleNodePg(pool, { schema });
  console.log('✅ PostgreSQL configurado via node-postgres para Render/Cloud');
}

export { db };