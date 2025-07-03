import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detectar ambiente: Docker vs Render/Cloud
const isDocker = process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('postgres:5432');

let db: any;

if (isDocker) {
  // Configuração para Docker com PostgreSQL padrão
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  db = drizzle(pool, { schema });
  console.log('✅ PostgreSQL configurado para Docker (node-postgres)');
  
} else {
  // Configuração para Render/Cloud com Neon
  const { neon, neonConfig } = require('@neondatabase/serverless');
  const { drizzle } = require('drizzle-orm/neon-http');
  
  neonConfig.fetchConnectionCache = true;
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
  console.log('✅ PostgreSQL configurado via Neon HTTP para cloud');
}

export { db };