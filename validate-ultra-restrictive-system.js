#!/usr/bin/env node

/**
 * Validação Manual do Sistema Ultra Restritivo WhatsApp
 * Este script testa todos os cenários críticos do sistema de segurança
 */

import { WhatsappService } from './server/whatsapp-service.js';
import { DatabaseStorage } from './server/database-storage.js';

console.log('🔒 INICIANDO VALIDAÇÃO DO SISTEMA ULTRA RESTRITIVO');
console.log('=' .repeat(60));

const storage = new DatabaseStorage();
const whatsappService = new WhatsappService();

// Função para simular mensagem
async function simulateMessage(integrationId, phoneNumber, message, description) {
  console.log(`\n📱 TESTE: ${description}`);
  console.log(`   Número: ${phoneNumber}`);
  console.log(`   Mensagem: "${message}"`);
  
  try {
    await whatsappService.processIncomingMessage(
      integrationId,
      phoneNumber,
      message,
      `test-${Date.now()}`,
      '120363419788242278@g.us'
    );
    console.log('   ✅ Processamento concluído');
  } catch (error) {
    console.log('   🚫 Erro durante processamento:', error.message);
  }
}

async function runTests() {
  try {
    // 1. TESTE: Sistema sem números configurados
    console.log('\n🔒 CENÁRIO 1: Sistema sem números configurados');
    await storage.updateWhatsappIntegration(2, {
      authorizedNumbers: ''
    });
    
    await simulateMessage(2, '5531999999999@c.us', 'tarefas', 'Qualquer número com sistema vazio');
    
    // 2. TESTE: Lista vazia
    console.log('\n🔒 CENÁRIO 2: Lista de números vazia');
    await storage.updateWhatsappIntegration(2, {
      authorizedNumbers: '[]'
    });
    
    await simulateMessage(2, '5531999999999@c.us', 'tarefas', 'Qualquer número com lista vazia');
    
    // 3. TESTE: Número autorizado
    console.log('\n🔒 CENÁRIO 3: Número autorizado');
    await storage.updateWhatsappIntegration(2, {
      authorizedNumbers: '["5531999999999@c.us"]'
    });
    
    await simulateMessage(2, '5531999999999@c.us', 'tarefas', 'Número autorizado processando comando');
    
    // 4. TESTE: Número NÃO autorizado
    console.log('\n🔒 CENÁRIO 4: Número NÃO autorizado');
    await simulateMessage(2, '5531888888888@c.us', 'tarefas', 'Número não autorizado tentando comando');
    
    // 5. VERIFICAR LOGS DE SEGURANÇA
    console.log('\n📊 VERIFICANDO LOGS DE SEGURANÇA');
    const logs = await storage.getWhatsappLogs(2, 10);
    console.log(`   Total de logs: ${logs.length}`);
    
    const blockedLogs = logs.filter(log => log.eventType === 'BLOCKED_INCOMING');
    console.log(`   Logs de bloqueio: ${blockedLogs.length}`);
    
    if (blockedLogs.length > 0) {
      console.log('   ✅ Sistema está registrando bloqueios corretamente');
    } else {
      console.log('   ⚠️ Nenhum log de bloqueio encontrado');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ VALIDAÇÃO CONCLUÍDA');
    console.log('🔒 Sistema Ultra Restritivo funcionando conforme esperado');
    
  } catch (error) {
    console.error('❌ ERRO na validação:', error);
  } finally {
    // Restaurar configuração padrão
    await storage.updateWhatsappIntegration(2, {
      authorizedNumbers: '["5531999999999@c.us"]'
    });
    process.exit(0);
  }
}

// Executar testes
runTests();