#!/usr/bin/env node

/**
 * Script para migrar para novo PostgreSQL
 * Cria um banco PostgreSQL funcional no Replit
 */

import { Pool } from 'pg';

async function migrateToNewPostgreSQL() {
  console.log('🚀 Migrando para novo PostgreSQL...');
  
  // Usar o novo banco PostgreSQL do Replit com SSL
  const newConnectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?sslmode=require`;
  
  console.log('📊 Conectando ao novo PostgreSQL...');
  
  const pool = new Pool({
    connectionString: newConnectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Testar conexão
    const client = await pool.connect();
    console.log('✅ Conexão com novo PostgreSQL estabelecida!');
    
    // Executar migrations do Drizzle
    console.log('🔄 Aplicando schema do banco...');
    
    // Criar todas as tabelas conforme o schema atual
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3b82f6',
        estimated_hours INTEGER,
        deadline TIMESTAMP,
        is_completed BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_items (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration INTEGER DEFAULT 0,
        description TEXT,
        is_running BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_integrations (
        id SERIAL PRIMARY KEY,
        instance_name TEXT,
        api_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        webhook_url TEXT,
        authorized_numbers TEXT,
        restrict_to_numbers BOOLEAN DEFAULT true,
        allowed_group_jid TEXT,
        response_mode TEXT DEFAULT 'individual',
        last_connection TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        integration_id INTEGER REFERENCES whatsapp_integrations(id) ON DELETE CASCADE,
        event_type TEXT,
        phone_number TEXT,
        message_text TEXT,
        response_text TEXT,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        notifications_enabled BOOLEAN DEFAULT true,
        daily_reminder_time TIME DEFAULT '09:00',
        weekly_report_enabled BOOLEAN DEFAULT true,
        deadline_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Schema criado com sucesso!');
    
    // Criar dados de exemplo
    const taskCount = await client.query('SELECT COUNT(*) FROM tasks');
    if (parseInt(taskCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO tasks (name, description, color, estimated_hours, is_active) 
        VALUES 
        ('Sistema PostgreSQL', 'Configuração completa do PostgreSQL', '#10b981', 1, true),
        ('Teste WhatsApp', 'Testar integração WhatsApp com PostgreSQL', '#3b82f6', 2, true)
      `);
      console.log('✅ Tarefas de exemplo criadas!');
    }
    
    client.release();
    
    console.log('🎉 Migração para PostgreSQL concluída!');
    console.log('🔗 Connection String:', newConnectionString);
    
    return newConnectionString;
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateToNewPostgreSQL()
  .then((connectionString) => {
    console.log('✅ Migração concluída. Use esta connection string:', connectionString);
  })
  .catch((error) => {
    console.error('❌ Falha na migração:', error);
    process.exit(1);
  });