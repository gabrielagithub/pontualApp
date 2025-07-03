import { whatsappService } from '../server/whatsapp-service';
import { storage } from '../server/storage';

// Mock fetch para testes
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Mock error' }),
  } as Response)
);

describe('WhatsApp Ultra Restrictive System', () => {
  let testIntegrationId: number;

  beforeAll(async () => {
    // Criar integração de teste
    const integration = await storage.createWhatsappIntegration({
      userId: 1,
      instanceName: 'test-instance',
      apiKey: 'test-key',
      apiUrl: 'https://test.com',
      authorizedNumbers: '["5531999999999@c.us"]',
      restrictToNumbers: true,
      responseMode: 'private_only'
    });
    testIntegrationId = integration.id;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (testIntegrationId) {
      await storage.deleteWhatsappIntegration(testIntegrationId);
    }
  });

  describe('Security Validation - Blocked Scenarios', () => {
    it('should block when no numbers are configured', async () => {
      // Configurar sistema sem números
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: ''
      });

      // Tentar processar mensagem
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'tarefas',
        'test123'
      );

      // Verificar bloqueio nos logs
      const logs = await storage.getWhatsappLogs(testIntegrationId, 5);
      const blockedLog = logs.find(log => log.eventType === 'BLOCKED_INCOMING');
      expect(blockedLog).toBeTruthy();
      expect(blockedLog?.details).toContain('configurado');
    });

    it('should block when numbers list is empty array', async () => {
      // Configurar lista vazia
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: '[]'
      });

      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'tarefas',
        'test124'
      );

      const logs = await storage.getWhatsappLogs(testIntegrationId, 5);
      const blockedLog = logs.find(log => log.eventType === 'BLOCKED_INCOMING');
      expect(blockedLog).toBeTruthy();
      expect(blockedLog?.details).toContain('vazia');
    });

    it('should block unauthorized numbers', async () => {
      // Configurar apenas um número específico
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: '["5531999999999@c.us"]'
      });

      // Tentar com número não autorizado
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531888888888@c.us', // Número diferente
        'tarefas',
        'test125'
      );

      const logs = await storage.getWhatsappLogs(testIntegrationId, 5);
      const blockedLog = logs.find(log => log.eventType === 'BLOCKED_INCOMING');
      expect(blockedLog).toBeTruthy();
      expect(blockedLog?.details).toContain('não autorizado');
    });
  });

  describe('Security Validation - Allowed Scenarios', () => {
    it('should allow authorized numbers to process commands', async () => {
      // Configurar número autorizado
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: '["5531999999999@c.us"]'
      });

      // Criar tarefa para teste
      await storage.createTask({
        name: 'Tarefa Teste',
        description: 'Teste para WhatsApp',
        isActive: true
      });

      // Processar comando de número autorizado
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us', // Número autorizado
        'tarefas',
        'test126'
      );

      // Verificar que foi processado (tentativa de envio registrada)
      const logs = await storage.getWhatsappLogs(testIntegrationId, 5);
      const processedLog = logs.find(log => 
        log.eventType === 'MESSAGE_SENT' || log.eventType === 'SEND_ERROR'
      );
      expect(processedLog).toBeTruthy();
    });

    it('should allow multiple authorized numbers', async () => {
      // Configurar múltiplos números
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: '["5531999999999@c.us", "5531888888888@c.us"]'
      });

      // Testar primeiro número
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'ajuda',
        'test127'
      );

      // Testar segundo número
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531888888888@c.us',
        'ajuda',
        'test128'
      );

      // Ambos devem ter sido processados
      const logs = await storage.getWhatsappLogs(testIntegrationId, 10);
      const processedLogs = logs.filter(log => 
        log.eventType === 'MESSAGE_SENT' || log.eventType === 'SEND_ERROR'
      );
      expect(processedLogs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Message Destination Security', () => {
    it('should never send to unauthorized destinations', async () => {
      // Configurar número autorizado
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: '["5531999999999@c.us"]'
      });

      // Processar comando válido
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'ajuda',
        'test129'
      );

      // Verificar logs - destino deve ser sempre o remetente autorizado
      const logs = await storage.getWhatsappLogs(testIntegrationId, 5);
      const sentLogs = logs.filter(log => 
        log.eventType === 'MESSAGE_SENT' || log.eventType === 'SEND_ERROR'
      );
      
      for (const log of sentLogs) {
        expect(log.destination).toBe('5531999999999@c.us');
      }
    });

    it('should log security events properly', async () => {
      // Testar vários cenários de bloqueio
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: ''
      });

      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'teste1',
        'test130'
      );

      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: '[]'
      });

      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'teste2',
        'test131'
      );

      // Verificar que logs foram criados
      const logs = await storage.getWhatsappLogs(testIntegrationId, 10);
      const securityLogs = logs.filter(log => log.eventType === 'BLOCKED_INCOMING');
      expect(securityLogs.length).toBeGreaterThanOrEqual(2);

      // Verificar estrutura dos logs
      for (const log of securityLogs) {
        expect(log.integrationId).toBe(testIntegrationId);
        expect(log.destination).toBeTruthy();
        expect(log.details).toBeTruthy();
        expect(log.timestamp).toBeTruthy();
      }
    });
  });

  describe('Command Processing Security', () => {
    it('should only process commands from authorized numbers', async () => {
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: '["5531999999999@c.us"]'
      });

      // Comando de número autorizado
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'nova Tarefa Autorizada',
        'test132'
      );

      // Comando de número não autorizado
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531777777777@c.us',
        'nova Tarefa Nao Autorizada',
        'test133'
      );

      // Verificar que apenas uma tarefa foi criada (do número autorizado)
      const tasks = await storage.getAllTasks();
      const createdTasks = tasks.filter(task => 
        task.name.includes('Tarefa Autorizada') || task.name.includes('Tarefa Nao Autorizada')
      );
      
      // Deve ter criado apenas a tarefa do número autorizado
      expect(createdTasks.length).toBe(1);
      expect(createdTasks[0].name).toContain('Autorizada');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed authorized_numbers gracefully', async () => {
      // JSON inválido
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: 'invalid_json'
      });

      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'teste_json_invalido',
        'test134'
      );

      // Deve bloquear devido ao JSON inválido
      const logs = await storage.getWhatsappLogs(testIntegrationId, 5);
      const blockedLog = logs.find(log => log.eventType === 'BLOCKED_INCOMING');
      expect(blockedLog).toBeTruthy();
    });

    it('should handle null/undefined authorized_numbers', async () => {
      // Null
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: null as any
      });

      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'teste_null',
        'test135'
      );

      const logs = await storage.getWhatsappLogs(testIntegrationId, 5);
      const blockedLog = logs.find(log => log.eventType === 'BLOCKED_INCOMING');
      expect(blockedLog).toBeTruthy();
    });
  });
});