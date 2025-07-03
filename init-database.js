/**
 * Script de inicialização do banco de dados
 * Cria usuário administrativo e dados de exemplo para desenvolvimento
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
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
    const client = await pool.connect();
    console.log('✅ Conectado ao banco de dados');
    
    // 1. Criar usuário administrativo padrão
    console.log('🔄 Criando usuário administrativo...');
    const userResult = await client.query(`
      INSERT INTO users (id, username, password) 
      VALUES (1, 'admin', '$2b$10$abcdef123456789admin') 
      ON CONFLICT (id) DO UPDATE SET 
        username = EXCLUDED.username,
        password = EXCLUDED.password
      RETURNING id, username
    `);
    console.log('✅ Usuário admin criado/atualizado:', userResult.rows[0]);

    // 2. Criar algumas tarefas de exemplo
    console.log('🔄 Criando tarefas de exemplo...');
    const tasks = [
      { name: 'Configurar Sistema', description: 'Configuração inicial do ambiente', color: '#3B82F6' },
      { name: 'Teste WhatsApp', description: 'Testar integração WhatsApp', color: '#10B981' },
      { name: 'Deploy Aplicação', description: 'Fazer deploy da aplicação', color: '#F59E0B' },
      { name: 'Documentação', description: 'Escrever documentação do projeto', color: '#8B5CF6' },
      { name: 'Testes Automáticos', description: 'Implementar testes automáticos', color: '#EF4444' }
    ];

    for (const task of tasks) {
      await client.query(`
        INSERT INTO tasks (name, description, color, is_active, is_completed) 
        VALUES ($1, $2, $3, true, false)
        ON CONFLICT DO NOTHING
      `, [task.name, task.description, task.color]);
    }
    console.log('✅ Tarefas de exemplo criadas');

    // 3. Verificar se há dados no banco
    const taskCount = await client.query('SELECT COUNT(*) as count FROM tasks');
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    
    console.log('📊 Status do banco:');
    console.log(`   👤 Usuários: ${userCount.rows[0].count}`);
    console.log(`   📋 Tarefas: ${taskCount.rows[0].count}`);

    // 4. Mostrar informações de login
    console.log('\n🔐 Informações de acesso:');
    console.log('   Usuário: admin');
    console.log('   ID: 1');
    console.log('   (Use este ID para criar integrações WhatsApp)');

    client.release();
    console.log('\n🎉 Inicialização completa!');
    
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();