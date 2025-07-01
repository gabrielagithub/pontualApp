#!/usr/bin/env node

/**
 * Script de migração do SQLite para PostgreSQL
 * Use este script quando configurar PostgreSQL no Render
 */

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

async function migrateToPostgreSQL() {
  console.log('🔄 Iniciando migração SQLite → PostgreSQL...');
  
  // Verificar se DATABASE_URL está configurada
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada. Configure no Render e tente novamente.');
    process.exit(1);
  }
  
  try {
    // Conectar ao PostgreSQL
    const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log('✅ Conectado ao PostgreSQL');
    
    // Conectar ao SQLite
    const sqlitePath = path.join(process.cwd(), 'data', 'database.sqlite');
    const sqlite = new Database(sqlitePath);
    console.log('✅ Conectado ao SQLite');
    
    // Criar tabelas no PostgreSQL
    await createPostgreSQLTables(pgPool);
    console.log('✅ Tabelas criadas no PostgreSQL');
    
    // Migrar dados
    await migrateUsers(sqlite, pgPool);
    await migrateTasks(sqlite, pgPool);
    await migrateTaskItems(sqlite, pgPool);
    await migrateTimeEntries(sqlite, pgPool);
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log('📝 Agora você pode configurar DATABASE_URL no Render');
    
    sqlite.close();
    await pgPool.end();
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

async function createPostgreSQLTables(pool) {
  const client = await pool.connect();
  
  try {
    // Criar tabelas seguindo o schema do Drizzle
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
        estimated_hours INTEGER,
        deadline TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_items (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration INTEGER,
        is_running BOOLEAN NOT NULL DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
  } finally {
    client.release();
  }
}

async function migrateUsers(sqlite, pgPool) {
  const users = sqlite.prepare('SELECT * FROM users').all();
  console.log(`📊 Migrando ${users.length} usuários...`);
  
  for (const user of users) {
    await pgPool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      [user.username, user.password]
    );
  }
}

async function migrateTasks(sqlite, pgPool) {
  const tasks = sqlite.prepare('SELECT * FROM tasks').all();
  console.log(`📊 Migrando ${tasks.length} tarefas...`);
  
  for (const task of tasks) {
    await pgPool.query(`
      INSERT INTO tasks (id, name, description, color, estimated_hours, deadline, is_active, is_completed, completed_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [
      task.id,
      task.name,
      task.description,
      task.color,
      task.estimated_hours,
      task.deadline,
      task.is_active,
      task.is_completed,
      task.completed_at,
      task.created_at
    ]);
  }
  
  // Atualizar sequence
  await pgPool.query('SELECT setval(\'tasks_id_seq\', COALESCE((SELECT MAX(id) FROM tasks), 1))');
}

async function migrateTaskItems(sqlite, pgPool) {
  const items = sqlite.prepare('SELECT * FROM task_items').all();
  console.log(`📊 Migrando ${items.length} itens de tarefa...`);
  
  for (const item of items) {
    await pgPool.query(`
      INSERT INTO task_items (id, task_id, title, completed, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [
      item.id,
      item.task_id,
      item.title,
      item.completed,
      item.created_at
    ]);
  }
  
  await pgPool.query('SELECT setval(\'task_items_id_seq\', COALESCE((SELECT MAX(id) FROM task_items), 1))');
}

async function migrateTimeEntries(sqlite, pgPool) {
  const entries = sqlite.prepare('SELECT * FROM time_entries').all();
  console.log(`📊 Migrando ${entries.length} apontamentos...`);
  
  for (const entry of entries) {
    await pgPool.query(`
      INSERT INTO time_entries (id, task_id, start_time, end_time, duration, is_running, notes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [
      entry.id,
      entry.task_id,
      entry.start_time,
      entry.end_time,
      entry.duration,
      entry.is_running,
      entry.notes,
      entry.created_at
    ]);
  }
  
  await pgPool.query('SELECT setval(\'time_entries_id_seq\', COALESCE((SELECT MAX(id) FROM time_entries), 1))');
}

// Executar migração se chamado diretamente
if (require.main === module) {
  migrateToPostgreSQL();
}

module.exports = { migrateToPostgreSQL };