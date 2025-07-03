#!/usr/bin/env node

/**
 * Script para corrigir schema WhatsApp no Render
 * Aplica as colunas faltantes na tabela whatsapp_integrations
 */

import { Pool } from '@neondatabase/serverless';

async function fixSchema() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL não encontrada');
    process.exit(0);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔧 Corrigindo schema WhatsApp no Render...');

    // Verificar se as colunas já existem
    const checkColumns = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_integrations'
      AND column_name IN ('authorized_numbers', 'restrict_to_numbers', 'response_mode');
    `;
    
    const existingColumns = await pool.query(checkColumns);
    const columnNames = existingColumns.rows.map(row => row.column_name);

    // Adicionar colunas que não existem
    if (!columnNames.includes('authorized_numbers')) {
      await pool.query('ALTER TABLE whatsapp_integrations ADD COLUMN authorized_numbers text;');
      console.log('✅ Coluna authorized_numbers adicionada');
    }

    if (!columnNames.includes('restrict_to_numbers')) {
      await pool.query('ALTER TABLE whatsapp_integrations ADD COLUMN restrict_to_numbers boolean DEFAULT true NOT NULL;');
      console.log('✅ Coluna restrict_to_numbers adicionada');
    }

    if (!columnNames.includes('response_mode')) {
      await pool.query('ALTER TABLE whatsapp_integrations ADD COLUMN response_mode text DEFAULT \'individual\' NOT NULL;');
      console.log('✅ Coluna response_mode adicionada');
    }

    console.log('🎉 Schema corrigido com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao corrigir schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixSchema();