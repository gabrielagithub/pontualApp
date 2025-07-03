/**
 * Script de migração específico para Docker
 * Usa PostgreSQL padrão ao invés de Neon
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function runDockerMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL não definida");
    process.exit(1);
  }

  console.log("🐳 Executando migrations do banco (Docker)...");
  
  try {
    // Configuração para PostgreSQL padrão (Docker)
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });

    const db = drizzle(pool, { schema: {} });

    // Executar migrations
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log("✅ Migrations executadas com sucesso!");
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migrations:", error.message);
    process.exit(1);
  }
}

runDockerMigrations();