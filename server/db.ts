import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuração WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Configurações para ambiente serverless
if (process.env.NODE_ENV === 'production') {
  neonConfig.fetchConnectionCache = true;
  neonConfig.pipelineConnect = false;
  neonConfig.poolQueryViaFetch = true;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuração de conexão otimizada para Render
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10, // máximo de conexões no pool
  idleTimeoutMillis: 30000, // timeout para conexões idle
  connectionTimeoutMillis: 2000, // timeout para estabelecer conexão
};

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });