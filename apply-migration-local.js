/**
 * Script para aplicar migração 0002 no ambiente local
 * Use este script para ajustar o banco local ao sistema single-user
 */

const fs = require('fs');
const path = require('path');

async function applyLocalMigration() {
  try {
    // Detectar se é ambiente Docker ou local
    const isDocker = process.env.IS_DOCKER === 'true';
    
    let db;
    
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql://')) {
      // PostgreSQL (local ou Docker)
      console.log('🐘 Usando PostgreSQL local/Docker');
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });
      
      // Ler arquivo de migração
      const migrationPath = path.join(__dirname, 'migrations', '0002_remove_user_references.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      console.log('📋 Aplicando migração 0002_remove_user_references.sql...');
      
      // Aplicar migração
      await pool.query(migrationSQL);
      
      console.log('✅ Migração aplicada com sucesso!');
      
      // Verificar estrutura final
      const result = await pool.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_name IN ('whatsapp_integrations', 'notification_settings')
        ORDER BY table_name, ordinal_position;
      `);
      
      console.log('📊 Estrutura final das tabelas:');
      console.table(result.rows);
      
      await pool.end();
      
    } else {
      console.log('❌ DATABASE_URL não encontrada ou não é PostgreSQL');
      console.log('Configure a variável DATABASE_URL para sua instância PostgreSQL local');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyLocalMigration();
}

module.exports = { applyLocalMigration };