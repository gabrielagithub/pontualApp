#!/usr/bin/env node

/**
 * Script de migração para Render
 * Executa as migrations do Drizzle quando DATABASE_URL está disponível
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runMigrations() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ DATABASE_URL não definida, pulando migrations');
      process.exit(0);
    }

    console.log('🐘 Executando migrations do banco...');
    
    // Instalar drizzle-kit se não estiver disponível
    await execAsync('npm install drizzle-kit');
    
    const { stdout, stderr } = await execAsync('npx drizzle-kit push');
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('❌ Erro nas migrations:', stderr);
      process.exit(1);
    }
    
    console.log('✅ Migrations executadas com sucesso!');
    console.log(stdout);
    
  } catch (error) {
    console.error('❌ Falha ao executar migrations:', error.message);
    process.exit(1);
  }
}

runMigrations();