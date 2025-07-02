const Database = require('better-sqlite3');
const path = require('path');

// Conectar ao banco SQLite
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔧 Atualizando JID do grupo na integração...');

// Atualizar a integração com o JID correto
const jidCorreto = '120363403778516269@g.us';
const result = db.prepare(`
  UPDATE whatsapp_integrations 
  SET allowed_group_jid = ? 
  WHERE id = 1
`).run(jidCorreto);

if (result.changes > 0) {
  console.log(`✅ JID atualizado com sucesso: ${jidCorreto}`);
  
  // Verificar a atualização
  const integration = db.prepare('SELECT * FROM whatsapp_integrations WHERE id = 1').get();
  console.log('📋 Configuração atual:', {
    id: integration.id,
    instanceName: integration.instance_name,
    restrictToGroup: !!integration.restrict_to_group,
    allowedGroupJid: integration.allowed_group_jid,
    allowedGroupName: integration.allowed_group_name
  });
} else {
  console.log('❌ Nenhuma integração encontrada com ID 1');
}

db.close();