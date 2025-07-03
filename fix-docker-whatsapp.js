/**
 * Script para corrigir WhatsApp integration no Docker local
 * Remove e recria as tabelas com constraints corretas
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixWhatsappTables() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('🔄 Conectando ao PostgreSQL...');
    
    // Verificar conexão
    const client = await pool.connect();
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar se usuário existe
    const userCheck = await client.query('SELECT id, username FROM users WHERE id = 1');
    if (userCheck.rows.length === 0) {
      console.log('🔄 Criando usuário padrão...');
      await client.query(`
        INSERT INTO users (id, username, password) 
        VALUES (1, 'admin', '$2b$10$abcdef123456789') 
        ON CONFLICT (id) DO NOTHING
      `);
    }
    console.log('✅ Usuário existente:', userCheck.rows[0] || 'criado');

    // Remover tabelas WhatsApp se existirem
    console.log('🔄 Removendo tabelas WhatsApp existentes...');
    await client.query('DROP TABLE IF EXISTS whatsapp_logs CASCADE');
    await client.query('DROP TABLE IF EXISTS whatsapp_integrations CASCADE');
    
    // Recriar tabela whatsapp_integrations
    console.log('🔄 Criando tabela whatsapp_integrations...');
    await client.query(`
      CREATE TABLE whatsapp_integrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        instance_name TEXT NOT NULL,
        api_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        webhook_url TEXT,
        authorized_numbers TEXT,
        restrict_to_numbers BOOLEAN NOT NULL DEFAULT true,
        allowed_group_jid TEXT,
        response_mode TEXT NOT NULL DEFAULT 'individual',
        last_connection TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Recriar tabela whatsapp_logs
    console.log('🔄 Criando tabela whatsapp_logs...');
    await client.query(`
      CREATE TABLE whatsapp_logs (
        id SERIAL PRIMARY KEY,
        integration_id INTEGER NOT NULL REFERENCES whatsapp_integrations(id) ON DELETE CASCADE,
        log_type TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Verificar constraints
    console.log('🔍 Verificando constraints criadas...');
    const constraints = await client.query(`
      SELECT 
        constraint_name, 
        table_name, 
        constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name IN ('whatsapp_integrations', 'whatsapp_logs') 
        AND constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('✅ Constraints criadas:', constraints.rows);
    
    // Teste de inserção
    console.log('🔄 Testando inserção...');
    const testResult = await client.query(`
      INSERT INTO whatsapp_integrations (
        user_id, instance_name, api_url, api_key, phone_number, authorized_numbers
      ) VALUES (
        1, 'teste', 'https://test.com', 'key123', '5511999999999', '[]'
      ) RETURNING id
    `);
    
    console.log('✅ Teste de inserção bem-sucedido:', testResult.rows[0]);
    
    // Remover teste
    await client.query('DELETE FROM whatsapp_integrations WHERE instance_name = $1', ['teste']);
    console.log('🧹 Dados de teste removidos');
    
    client.release();
    console.log('🎉 Fix completo! Tabelas WhatsApp recriadas com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao executar fix:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixWhatsappTables();