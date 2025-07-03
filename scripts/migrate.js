#!/usr/bin/env node

/**
 * Script de migração para aplicar migrations do Drizzle
 * Usado no deploy do Render para configurar o banco PostgreSQL
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '../shared/schema.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Configure WebSocket para o Neon
neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada');
    console.log('Configure a variável de ambiente DATABASE_URL com a connection string do PostgreSQL');
    process.exit(1);
  }

  console.log('🐘 Conectando ao PostgreSQL...');
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });

    console.log('🔄 Aplicando migrations...');
    
    const migrationsFolder = path.join(__dirname, '../migrations');
    
    // Verificar se pasta de migrations existe
    if (!fs.existsSync(migrationsFolder)) {
      console.log('⚠️  Pasta de migrations não encontrada. Nenhuma migration para aplicar.');
      return;
    }

    await migrate(db, { migrationsFolder });
    
    console.log('✅ Migrations aplicadas com sucesso!');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migrations:', error);
    process.exit(1);
  }
}

runMigrations();