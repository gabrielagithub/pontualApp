import { MemStorage } from '../server/storage';

export default async () => {
  // Configuração global antes de todos os testes
  console.log('🧪 Iniciando configuração global de testes...');
  
  // Garantir que usamos armazenamento em memória para testes
  process.env.NODE_ENV = 'test';
  
  // Configurar outras variáveis necessárias
  process.env.SESSION_SECRET = 'test-secret-key-for-testing-only';
  
  console.log('✅ Configuração global de testes concluída');
};