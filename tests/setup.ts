import { beforeEach, afterEach } from '@jest/globals';

// Configuração global para os testes
beforeEach(() => {
  // Reset de estado entre testes se necessário
  jest.clearAllMocks();
});

afterEach(() => {
  // Limpeza após cada teste
});

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only';