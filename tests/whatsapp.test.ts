import { WhatsappService } from '../server/whatsapp-service';
import { MemStorage } from '../server/storage';

// Mock fetch para testes
global.fetch = jest.fn();

describe('WhatsApp Service Tests', () => {
  let whatsappService: WhatsappService;
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
    whatsappService = new WhatsappService(storage);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Message Processing', () => {
    it('should process help command', async () => {
      const messageData = {
        key: { fromMe: false, id: 'test123' },
        message: { conversation: 'ajuda' },
        messageTimestamp: Date.now(),
        pushName: 'Test User'
      };

      const response = await whatsappService.processMessage(messageData, 1);
      
      expect(response).toBeTruthy();
      expect(response).toContain('🤖 *PONTUAL - COMANDOS DISPONÍVEIS*');
      expect(response).toContain('📋 TAREFAS');
      expect(response).toContain('⏱️ CRONÔMETRO');
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