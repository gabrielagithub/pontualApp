import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuração otimizada para Render - usando HTTP ao invés de WebSocket
neonConfig.fetchConnectionCache = true;

// Usar conexão HTTP que é mais estável no Render
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

console.log('✅ PostgreSQL configurado via HTTP para máxima compatibilidade Render');