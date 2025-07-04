#!/usr/bin/env node

/**
 * Script para configurar PostgreSQL local no Replit
 * Cria um banco PostgreSQL independente do Neon
 */

import { Pool } from 'pg';

async function setupLocalPostgreSQL() {
  console.log('🚀 Configurando PostgreSQL local no Replit...');
  
  // Configuração para PostgreSQL local no Replit
  const localConnectionString = 'postgresql://postgres:password@localhost:5432/pontual';
  
  console.log('📊 Conectando ao PostgreSQL local:', localConnectionString);
  
  const pool = new Pool({
    connectionString: localConnectionString,
    ssl: false
  });

  try {
    // Testar conexão
    const client = await pool.connect();
    console.log('✅ Conexão com PostgreSQL local estabelecida!');
    
    // Criar banco se não existir
    await client.query(`CREATE DATABASE IF NOT EXISTS pontual`);
    
    // Criar todas as tabelas
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
        api_url VARCHAR(255) NOT NULL,
        api_key VARCHAR(500) NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        authorized_numbers TEXT[],
        restrict_to_numbers BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        webhook_url VARCHAR(255),
        allowed_group_jid VARCHAR(100),
        response_mode VARCHAR(20) DEFAULT 'individual',
        last_connection TIMESTAMP,
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
    
    // Inserir dados de exemplo
    const taskCheck = await client.query('SELECT COUNT(*) FROM tasks');
    if (parseInt(taskCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO tasks (name, description, color, estimated_hours) 
        VALUES 
        ('Configuração PostgreSQL', 'Configurar banco PostgreSQL local', '#10b981', 1),
        ('Teste do Sistema', 'Testar todas as funcionalidades', '#3b82f6', 2)
      `);
      console.log('✅ Tarefas de exemplo criadas!');
    }
    
    client.release();
    
    console.log('🎉 PostgreSQL local configurado com sucesso!');
    console.log('🔧 Para usar este banco, configure DATABASE_URL:', localConnectionString);
    
  } catch (error) {
    console.error('❌ Erro ao configurar PostgreSQL local:', error.message);
    console.log('💡 Para resolver, você precisa:');
    console.log('1. Configurar um banco PostgreSQL no Render ou outro provedor');
    console.log('2. Atualizar a variável DATABASE_URL com a nova connection string');
    console.log('3. Por enquanto, a aplicação funciona com MemStorage');
  } finally {
    await pool.end();
  }
}

setupLocalPostgreSQL();