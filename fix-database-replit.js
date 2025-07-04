#!/usr/bin/env node

/**
 * Script para configurar o banco PostgreSQL padrão no Replit
 * Remove dependência do Neon e configura PostgreSQL local
 */

import { Pool } from 'pg';

async function setupDatabase() {
  console.log('🔧 Configurando banco PostgreSQL padrão no Replit...');
  
  // Usar as variáveis de ambiente do PostgreSQL criado no Replit
  const connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  
  console.log('📊 Conectando ao PostgreSQL:', process.env.PGHOST + ':' + process.env.PGPORT);
  
  const pool = new Pool({
    connectionString,
    ssl: false // PostgreSQL local não precisa de SSL
  });

  try {
    // Testar conexão
    const client = await pool.connect();
    console.log('✅ Conexão com PostgreSQL estabelecida!');
    
    // Criar tabelas se não existirem
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3b82f6',
        estimated_hours INTEGER DEFAULT 0,
        due_date TIMESTAMP,
        is_completed BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
        instance_name VARCHAR(255),
        api_key VARCHAR(500),
        base_url VARCHAR(255),
        authorized_numbers TEXT[],
        restrict_to_numbers BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        integration_id INTEGER REFERENCES whatsapp_integrations(id) ON DELETE CASCADE,
        event_type VARCHAR(50),
        phone_number VARCHAR(50),
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
    
    console.log('✅ Todas as tabelas criadas com sucesso!');
    
    // Inserir uma tarefa de exemplo se não existir nenhuma
    const taskCheck = await client.query('SELECT COUNT(*) FROM tasks');
    if (parseInt(taskCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO tasks (name, description, color, estimated_hours) 
        VALUES ('Tarefa de Exemplo', 'Esta é uma tarefa de exemplo para testar o sistema', '#3b82f6', 2)
      `);
      console.log('✅ Tarefa de exemplo criada!');
    }
    
    client.release();
    
    console.log('🎉 Banco PostgreSQL configurado com sucesso!');
    console.log('📝 Nova connection string:', connectionString);
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();