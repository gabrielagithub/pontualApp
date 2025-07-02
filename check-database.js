import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'database.sqlite');

console.log('🔍 Verificando dados do banco SQLite...');

const db = new Database(dbPath);

// Consultar a integração atual
const integration = db.prepare('SELECT * FROM whatsapp_integrations WHERE user_id = 1 AND is_active = 1').get();

if (integration) {
  console.log('📋 Integração encontrada:');
  console.log('- ID:', integration.id);
  console.log('- Instance Name:', integration.instance_name);
  console.log('- Restrict to Group:', integration.restrict_to_group);
  console.log('- Allowed Group Name:', integration.allowed_group_name);
  console.log('- Allowed Group JID:', integration.allowed_group_jid);
  console.log('- Tipo do JID:', typeof integration.allowed_group_jid);
  
  // Se o JID estiver nulo ou vazio, vamos definir um valor de teste
  if (!integration.allowed_group_jid || integration.allowed_group_jid === 'null') {
    console.log('⚠️  JID está nulo, atualizando com valor correto...');
    
    const updateResult = db.prepare(`
      UPDATE whatsapp_integrations 
      SET allowed_group_jid = ? 
      WHERE id = ?
    `).run('120363403778516269@g.us', integration.id);
    
    console.log('✅ Atualização resultado:', updateResult);
    
    // Verificar novamente
    const updatedIntegration = db.prepare('SELECT * FROM whatsapp_integrations WHERE id = ?').get(integration.id);
    console.log('📋 Após atualização - JID:', updatedIntegration.allowed_group_jid);
  }
} else {
  console.log('❌ Nenhuma integração encontrada');
}

db.close();
console.log('✅ Verificação concluída');