#!/usr/bin/env node

/**
 * Script para aplicar apenas a migração 0001_fix_whatsapp_schema
 * Usado para corrigir o schema no Render sem reexecutar migração inicial
 */

import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL não encontrada');
    process.exit(0);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔧 Aplicando migração 0001_fix_whatsapp_schema...');

    // Verificar se a tabela de controle de migrações existe
    const checkDrizzleTable = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      );
    `;
    
    const drizzleTableExists = await pool.query(checkDrizzleTable);
    
    if (!drizzleTableExists.rows[0].exists) {
      // Criar tabela de controle se não existir
      await pool.query(`
        CREATE TABLE __drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        );
      `);
      console.log('✅ Tabela de controle de migrações criada');
    }

    // Verificar se migração já foi aplicada
    const checkMigration = `
      SELECT * FROM __drizzle_migrations 
      WHERE hash = '0001_fix_whatsapp_schema';
    `;
    
    const migrationExists = await pool.query(checkMigration);
    
    if (migrationExists.rows.length > 0) {
      console.log('⏭️ Migração 0001_fix_whatsapp_schema já aplicada');
      return;
    }

    // Ler e executar a migração
    const migrationSQL = readFileSync(join(process.cwd(), 'migrations', '0001_fix_whatsapp_schema.sql'), 'utf8');
    
    // Remover comentários e executar comandos
    const commands = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim())
      .join('\n')
      .split(';')
      .filter(cmd => cmd.trim());

    for (const command of commands) {
      if (command.trim()) {
        await pool.query(command);
      }
    }

    // Registrar migração como aplicada
    await pool.query(`
      INSERT INTO __drizzle_migrations (hash, created_at) 
      VALUES ('0001_fix_whatsapp_schema', ${Date.now()});
    `);

    console.log('✅ Migração 0001_fix_whatsapp_schema aplicada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();