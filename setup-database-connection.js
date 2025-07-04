#!/usr/bin/env node

/**
 * Script para configurar conexão de banco de dados
 * Testa conectividade e configura automaticamente
 */

import { Pool } from 'pg';

async function testDatabaseConnection(connectionString) {
  console.log('🔍 Testando conexão com:', connectionString.replace(/:[^:]*@/, ':***@'));
  
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Conexão bem-sucedida!');
    return true;
  } catch (error) {
    console.log('❌ Falha na conexão:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function setupDatabaseSchema(connectionString) {
  console.log('🔧 Configurando schema do banco de dados...');
  
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    
    // Criar todas as tabelas
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
        log_type TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        enable_daily_report BOOLEAN DEFAULT true,
        daily_report_time TEXT DEFAULT '09:00',
        enable_weekly_report BOOLEAN DEFAULT true,
        weekly_report_day INTEGER DEFAULT 1,
        enable_deadline_reminders BOOLEAN DEFAULT true,
        reminder_hours_before INTEGER DEFAULT 24,
        enable_timer_reminders BOOLEAN DEFAULT false,
        timer_reminder_interval INTEGER DEFAULT 60,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Schema configurado com sucesso!');
    
    // Inserir dados de exemplo se não existirem
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
    return true;
    
  } catch (error) {
    console.error('❌ Erro configurando schema:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL não configurado!');
    process.exit(1);
  }
  
  console.log('🚀 Configurando banco de dados...');
  
  // Testar conexão
  const isConnected = await testDatabaseConnection(connectionString);
  
  if (!isConnected) {
    console.error('❌ Não foi possível conectar ao banco de dados.');
    console.log('💡 Para resolver:');
    console.log('1. Render: Configure um novo banco PostgreSQL');
    console.log('2. Local: Use Docker PostgreSQL');
    console.log('3. Aguarde se usando Neon (pode hibernar)');
    process.exit(1);
  }
  
  // Configurar schema
  const schemaSetup = await setupDatabaseSchema(connectionString);
  
  if (schemaSetup) {
    console.log('🎉 Banco de dados configurado com sucesso!');
    console.log('✅ Sistema pronto para uso');
  } else {
    console.error('❌ Falha na configuração do schema');
    process.exit(1);
  }
}

main().catch(console.error);