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

describe('WhatsApp Ultra Restrictive System Tests', () => {
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
    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup
    if (testIntegrationId) {
      await storage.deleteWhatsappIntegration(testIntegrationId);
    }
  });

  describe('Ultra Restrictive Security - Core Validation', () => {
    it('should block messages when no numbers are configured', async () => {
      // Configurar sistema sem números autorizados
      await storage.updateWhatsappIntegration(testIntegrationId, {
        authorizedNumbers: ''
      });

      // Simular processamento de mensagem
      await whatsappService.processIncomingMessage(
        testIntegrationId,
        '5531999999999@c.us',
        'tarefas',
        'test123',
        '120363419788242278@g.us'
      );

      // Verificar se foi registrado como bloqueado
      const logs = await storage.getWhatsappLogs(testIntegrationId, 5);
      const blockedLog = logs.find(log => log.eventType === 'BLOCKED_INCOMING');
      expect(blockedLog).toBeTruthy();
      expect(blockedLog?.details).toContain('número autorizado configurado');
    });

    it('should process task listing command', async () => {
      // Create test tasks first
      await storage.createTask({
        name: 'Tarefa Teste 1',
        description: 'Primeira tarefa de teste',
        isActive: true,
        deadline: null
      });

      await storage.createTask({
        name: 'Tarefa Teste 2', 
        description: 'Segunda tarefa de teste',
        isActive: true,
        deadline: null
      });

      const messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'tarefas' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('📋 *SUAS TAREFAS ATIVAS*');
      expect(response).toContain('1️⃣ Tarefa Teste 1');
      expect(response).toContain('2️⃣ Tarefa Teste 2');
    });

    it('should process task creation command', async () => {
      const messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'nova Tarefa via WhatsApp' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('✅ Tarefa criada');
      expect(response).toContain('Tarefa via WhatsApp');

      // Verify task was created
      const tasks = await storage.getAllTasks();
      expect(tasks.some(task => task.name === 'Tarefa via WhatsApp')).toBe(true);
    });

    it('should process advanced task creation with parameters', async () => {
      const messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { 
          conversation: 'nova Tarefa Complexa --desc "Descrição detalhada" --tempo 3h --cor azul' 
        },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('✅ Tarefa criada');

      // Verify task was created with parameters
      const tasks = await storage.getAllTasks();
      const createdTask = tasks.find(task => task.name === 'Tarefa Complexa');
      expect(createdTask).toBeDefined();
      expect(createdTask?.description).toBe('Descrição detalhada');
      expect(createdTask?.estimatedHours).toBe(3);
      expect(createdTask?.color).toBe('#3B82F6'); // azul color
    });

    it('should process numeric task selection', async () => {
      // Create test task first
      const task = await storage.createTask({
        name: 'Tarefa para Seleção',
        description: 'Tarefa para testar seleção numérica',
        isActive: true,
        deadline: null
      });

      // First, list tasks to set context
      let messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'tarefas' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      await whatsappService.processMessage(messageData, 1);

      // Then select task by number
      messageData = {
        key: { fromMe: false, id: 'test124' },
        message: { conversation: '1' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('📋 *TAREFA SELECIONADA*');
      expect(response).toContain('Tarefa para Seleção');
      expect(response).toContain('iniciar');
      expect(response).toContain('apontar');
    });

    it('should process timer start command', async () => {
      // Create test task first
      const task = await storage.createTask({
        name: 'Tarefa Timer',
        description: 'Tarefa para testar timer',
        isActive: true,
        deadline: null
      });

      // List tasks first to set context
      let messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'tarefas' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      await whatsappService.processMessage(messageData, 1);

      // Start timer for task 1
      messageData = {
        key: { fromMe: false, id: 'test124' },
        message: { conversation: '1 iniciar' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('▶️ Timer iniciado');
      expect(response).toContain('Tarefa Timer');

      // Verify timer entry was created
      const runningEntries = await storage.getRunningTimeEntries();
      expect(runningEntries.length).toBe(1);
      expect(runningEntries[0].isRunning).toBe(true);
    });

    it('should process manual time logging', async () => {
      // Create test task first
      const task = await storage.createTask({
        name: 'Tarefa Apontamento',
        description: 'Tarefa para testar apontamento manual',
        isActive: true,
        deadline: null
      });

      // List tasks first to set context
      let messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'tarefas' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      await whatsappService.processMessage(messageData, 1);

      // Log manual time for task 1
      messageData = {
        key: { fromMe: false, id: 'test124' },
        message: { conversation: '1 apontar 2h' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('⏱️ Tempo apontado');
      expect(response).toContain('2h 0min');

      // Verify time entry was created
      const entries = await storage.getAllTimeEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].duration).toBe(7200); // 2 hours in seconds
      expect(entries[0].isRunning).toBe(false);
    });

    it('should process report commands', async () => {
      // Create test data
      const task = await storage.createTask({
        name: 'Tarefa Relatório',
        description: 'Tarefa para testar relatórios',
        isActive: true,
        deadline: null
      });

      await storage.createTimeEntry({
        taskId: task.id,
        duration: 3600,
        startTime: new Date(),
        endTime: new Date()
      });

      const messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'resumo' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('📊 *RESUMO DE ATIVIDADES*');
      expect(response).toContain('Hoje:');
      expect(response).toContain('Semana:');
      expect(response).toContain('Mês:');
    });

    it('should handle unknown commands gracefully', async () => {
      const messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'comando_inexistente' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('❓ Comando não reconhecido');
      expect(response).toContain('ajuda');
    });

    it('should ignore bot messages', async () => {
      const messageData = {
        key: { fromMe: true, id: 'test123' }, // fromMe: true indicates bot message
        message: { conversation: 'tarefas' },
        messageTimestamp: Date.now(),
        pushName: 'Bot'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBe(''); // Should return empty string for bot messages
    });
  });

  describe('Utility Functions', () => {
    it('should parse time duration correctly', async () => {
      // Test various time formats
      const testCases = [
        { input: '1h', expected: 3600 },
        { input: '30min', expected: 1800 },
        { input: '2h30min', expected: 9000 },
        { input: '45m', expected: 2700 },
        { input: '1.5h', expected: 5400 }
      ];

      for (const testCase of testCases) {
        // Create a simple message to test time parsing
        const messageData = {
          key: { fromMe: false, id: 'test123' },
          message: { conversation: `nova Teste --tempo ${testCase.input}` },
          messageTimestamp: Date.now(),
          pushName: 'Test User'
        };

        await whatsappService.processMessage(messageData, 1);

        const tasks = await storage.getAllTasks();
        const lastTask = tasks[tasks.length - 1];
        
        expect(lastTask.estimatedHours).toBe(testCase.expected / 3600);
        
        // Clean up for next test
        await storage.deleteTask(lastTask.id);
      }
    });

    it('should format time display correctly', async () => {
      // Create task with time entry
      const task = await storage.createTask({
        name: 'Test Time Format',
        isActive: true,
        deadline: null
      });

      await storage.createTimeEntry({
        taskId: task.id,
        duration: 7890, // 2h 11min 30s
        startTime: new Date(),
        endTime: new Date()
      });

      const messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'tarefas' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('2h 11min'); // Should format time correctly
    });
  });

  describe('Ultra Restrictive Security System', () => {
    it('should block messages when no numbers are configured', async () => {
      // Update integration to have empty authorized numbers
      await storage.updateWhatsappIntegration(1, {
        authorizedNumbers: ''
      });

      const result = await whatsappService.processIncomingMessage(
        1, // integrationId
        '5531999999999@c.us', // phoneNumber
        'tarefas', // message
        'test123', // messageId
        '120363419788242278@g.us' // groupJid
      );

      // Should be blocked due to no configured numbers
      expect(result).toBeUndefined(); // No response for blocked messages
    });

    it('should block messages when numbers list is empty', async () => {
      // Update integration to have empty array
      await storage.updateWhatsappIntegration(1, {
        authorizedNumbers: '[]'
      });

      const result = await whatsappService.processIncomingMessage(
        1,
        '5531999999999@c.us',
        'tarefas',
        'test123',
        '120363419788242278@g.us'
      );

      // Should be blocked due to empty numbers list
      expect(result).toBeUndefined();
    });

    it('should allow messages from authorized numbers', async () => {
      // Ensure authorized numbers are set
      await storage.updateWhatsappIntegration(1, {
        authorizedNumbers: '["5531999999999@c.us"]'
      });

      const result = await whatsappService.processIncomingMessage(
        1,
        '5531999999999@c.us',
        'tarefas',
        'test123',
        '120363419788242278@g.us'
      );

      // Should process the message (not undefined)
      expect(result).not.toBeUndefined();
    });

    it('should block messages from unauthorized numbers', async () => {
      // Set specific authorized number
      await storage.updateWhatsappIntegration(1, {
        authorizedNumbers: '["5531999999999@c.us"]'
      });

      const result = await whatsappService.processIncomingMessage(
        1,
        '5531888888888@c.us', // Different unauthorized number
        'tarefas',
        'test123',
        '120363419788242278@g.us'
      );

      // Should be blocked due to unauthorized number
      expect(result).toBeUndefined();
    });

    it('should log security events for blocked messages', async () => {
      // Set empty configuration
      await storage.updateWhatsappIntegration(1, {
        authorizedNumbers: ''
      });

      await whatsappService.processIncomingMessage(
        1,
        '5531999999999@c.us',
        'tarefas',
        'test123',
        '120363419788242278@g.us'
      );

      // Verify security log was created
      const logs = await storage.getWhatsappLogs(1, 10);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].eventType).toBe('BLOCKED_INCOMING');
    });
  });

  describe('Integration Settings', () => {
    it('should handle missing integration settings', async () => {
      const messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'tarefas' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      // This should work even without WhatsApp integration configured
      const response = await whatsappService.processMessage(messageData, 999); // Non-existent user
      
      expect(response).toBeTruthy();
    });
  });
});