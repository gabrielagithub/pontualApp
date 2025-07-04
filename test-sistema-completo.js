/**
 * Teste Completo do Sistema Pontual
 * Testa todas as funcionalidades: API, WhatsApp, Timer, Tarefas, etc.
 */

const BASE_URL = 'https://db5526d1-39d7-4465-aa3c-8fff59a35924-00-28kinqyzkeuy7.janeway.replit.dev';

// Cores para output colorido
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.blue}${colors.bold}🧪 Testando: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let result;
    
    try {
      result = JSON.parse(text);
    } catch (e) {
      result = text;
    }
    
    return {
      status: response.status,
      data: result,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: error.message,
      success: false
    };
  }
}

// ========================================
// TESTES DE API BÁSICA
// ========================================

async function testHealthCheck() {
  logTest("Health Check");
  const result = await makeRequest('GET', '/health');
  
  if (result.success) {
    logSuccess(`Health check OK (${result.status})`);
    return true;
  } else {
    logError(`Health check failed: ${result.status}`);
    return false;
  }
}

async function testGetTasks() {
  logTest("Listar Tarefas");
  const result = await makeRequest('GET', '/api/tasks');
  
  if (result.success && Array.isArray(result.data)) {
    logSuccess(`${result.data.length} tarefas encontradas`);
    
    // Verificar estrutura das tarefas
    if (result.data.length > 0) {
      const task = result.data[0];
      const requiredFields = ['id', 'name', 'isActive', 'isCompleted'];
      const hasAllFields = requiredFields.every(field => task.hasOwnProperty(field));
      
      if (hasAllFields) {
        logSuccess("Estrutura das tarefas válida");
      } else {
        logWarning("Estrutura das tarefas incompleta");
      }
    }
    
    return { success: true, tasks: result.data };
  } else {
    logError(`Erro ao listar tarefas: ${result.status}`);
    return { success: false, tasks: [] };
  }
}

async function testCreateTask() {
  logTest("Criar Nova Tarefa");
  const taskData = {
    name: "Teste Automatizado",
    description: "Tarefa criada pelo teste automático",
    color: "#FF5733",
    estimatedHours: 2
  };
  
  const result = await makeRequest('POST', '/api/tasks', taskData);
  
  if (result.success) {
    logSuccess(`Tarefa criada com ID: ${result.data.id}`);
    return { success: true, taskId: result.data.id };
  } else {
    logError(`Erro ao criar tarefa: ${result.status} - ${JSON.stringify(result.data)}`);
    return { success: false, taskId: null };
  }
}

async function testCompleteTask(taskId) {
  logTest("Concluir Tarefa");
  const result = await makeRequest('POST', `/api/tasks/${taskId}/complete`);
  
  if (result.success) {
    logSuccess(`Tarefa ${taskId} concluída`);
    
    // Verificar se tarefa foi marcada como inativa
    const checkResult = await makeRequest('GET', `/api/tasks/${taskId}`);
    if (checkResult.success) {
      const task = checkResult.data;
      if (!task.isActive && task.isCompleted) {
        logSuccess("Tarefa marcada corretamente como inativa e concluída");
      } else {
        logWarning(`Status incorreto: isActive=${task.isActive}, isCompleted=${task.isCompleted}`);
      }
    }
    
    return true;
  } else {
    logError(`Erro ao concluir tarefa: ${result.status}`);
    return false;
  }
}

async function testReopenTask(taskId) {
  logTest("Reabrir Tarefa");
  const result = await makeRequest('POST', `/api/tasks/${taskId}/reopen`);
  
  if (result.success) {
    logSuccess(`Tarefa ${taskId} reaberta`);
    
    // Verificar se tarefa foi marcada como ativa
    const checkResult = await makeRequest('GET', `/api/tasks/${taskId}`);
    if (checkResult.success) {
      const task = checkResult.data;
      if (task.isActive && !task.isCompleted) {
        logSuccess("Tarefa marcada corretamente como ativa e não concluída");
      } else {
        logWarning(`Status incorreto: isActive=${task.isActive}, isCompleted=${task.isCompleted}`);
      }
    }
    
    return true;
  } else {
    logError(`Erro ao reabrir tarefa: ${result.status}`);
    return false;
  }
}

// ========================================
// TESTES DE TIME ENTRIES
// ========================================

async function testCreateTimeEntry(taskId) {
  logTest("Criar Time Entry");
  const timeEntryData = {
    taskId: taskId,
    startTime: new Date(Date.now() - 3600000), // 1 hora atrás
    endTime: new Date(),
    duration: 3600, // 1 hora em segundos
    notes: "Teste automatizado de time entry"
  };
  
  const result = await makeRequest('POST', '/api/time-entries', timeEntryData);
  
  if (result.success) {
    logSuccess(`Time entry criado com ID: ${result.data.id}`);
    return { success: true, entryId: result.data.id };
  } else {
    logError(`Erro ao criar time entry: ${result.status} - ${JSON.stringify(result.data)}`);
    return { success: false, entryId: null };
  }
}

async function testGetTimeEntries() {
  logTest("Listar Time Entries");
  const result = await makeRequest('GET', '/api/time-entries');
  
  if (result.success && Array.isArray(result.data)) {
    logSuccess(`${result.data.length} time entries encontrados`);
    return { success: true, entries: result.data };
  } else {
    logError(`Erro ao listar time entries: ${result.status}`);
    return { success: false, entries: [] };
  }
}

async function testStartTimer(taskId) {
  logTest("Iniciar Timer");
  const result = await makeRequest('POST', `/api/start-timer`, { taskId });
  
  if (result.success) {
    logSuccess(`Timer iniciado para tarefa ${taskId}`);
    return { success: true, entryId: result.data.id };
  } else {
    logError(`Erro ao iniciar timer: ${result.status} - ${JSON.stringify(result.data)}`);
    return { success: false, entryId: null };
  }
}

async function testStopTimer(taskId) {
  logTest("Parar Timer");
  const result = await makeRequest('POST', `/api/stop-timer`, { taskId });
  
  if (result.success) {
    logSuccess(`Timer parado para tarefa ${taskId}`);
    return true;
  } else {
    logError(`Erro ao parar timer: ${result.status} - ${JSON.stringify(result.data)}`);
    return false;
  }
}

// ========================================
// TESTES DE DASHBOARD
// ========================================

async function testDashboardStats() {
  logTest("Dashboard Stats");
  const result = await makeRequest('GET', '/api/dashboard/stats');
  
  if (result.success) {
    const stats = result.data;
    logSuccess(`Stats obtidas: ${stats.activeTasks} tarefas ativas, ${Math.floor(stats.todayTime/3600)}h hoje`);
    
    // Verificar estrutura dos stats
    const requiredFields = ['todayTime', 'activeTasks', 'weekTime', 'monthTime', 'completedTasks'];
    const hasAllFields = requiredFields.every(field => stats.hasOwnProperty(field));
    
    if (hasAllFields) {
      logSuccess("Estrutura dos stats válida");
    } else {
      logWarning("Estrutura dos stats incompleta");
    }
    
    return true;
  } else {
    logError(`Erro ao obter stats: ${result.status}`);
    return false;
  }
}

// ========================================
// TESTES DE WHATSAPP
// ========================================

async function testWhatsAppIntegration() {
  logTest("WhatsApp Integration");
  
  // Testar primeiro endpoint (single integration)
  let result = await makeRequest('GET', '/api/whatsapp/integration');
  
  if (result.success && result.data) {
    logSuccess("Integração WhatsApp encontrada");
    
    const integration = result.data;
    if (integration.hasApiKey) {
      logSuccess("API Key configurada");
    } else {
      logWarning("API Key não configurada");
    }
    
    return { success: true, integration };
  }
  
  // Testar endpoint alternativo (multiple integrations)
  result = await makeRequest('GET', '/api/whatsapp/integrations');
  
  if (result.success && Array.isArray(result.data) && result.data.length > 0) {
    logSuccess(`${result.data.length} integrações WhatsApp encontradas`);
    
    const integration = result.data[0];
    if (integration.hasApiKey) {
      logSuccess("API Key configurada");
    } else {
      logWarning("API Key não configurada");
    }
    
    return { success: true, integration };
  } else {
    logError(`Erro ao obter integrações WhatsApp: ${result.status} - ${JSON.stringify(result.data)}`);
    return { success: false, integration: null };
  }
}

async function testWhatsAppWebhook() {
  logTest("WhatsApp Webhook");
  
  // Simular mensagem webhook autorizada
  const webhookData = {
    key: {
      remoteJid: "553195343133@c.us",
      fromMe: false,
      id: "TEST_AUTOMATION_123",
      participant: null
    },
    pushName: "Teste Automatizado",
    message: {
      conversation: "status"
    },
    messageType: "conversation",
    messageTimestamp: Date.now(),
    instanceId: "355fc24f-bb65-4d68-9cc4-08f360e75186",
    source: "test"
  };
  
  const result = await makeRequest('POST', '/api/whatsapp/webhook/replit', webhookData);
  
  if (result.success) {
    logSuccess("Webhook processado com sucesso");
    return true;
  } else {
    logError(`Erro no webhook: ${result.status} - ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testWhatsAppCommands(integration) {
  if (!integration || !integration.hasApiKey) {
    logWarning("Pulando teste de comandos WhatsApp - API Key não configurada");
    return false;
  }
  
  logTest("Comandos WhatsApp");
  
  const commands = [
    { command: "ajuda", expected: "ajuda" },
    { command: "tarefas", expected: "tarefas" },
    { command: "status", expected: "status" }
  ];
  
  let successCount = 0;
  
  for (const cmd of commands) {
    const webhookData = {
      key: {
        remoteJid: "553195343133@c.us",
        fromMe: false,
        id: `TEST_${cmd.command.toUpperCase()}_${Date.now()}`,
        participant: null
      },
      pushName: "Teste Automatizado",
      message: {
        conversation: cmd.command
      },
      messageType: "conversation",
      messageTimestamp: Date.now(),
      instanceId: "355fc24f-bb65-4d68-9cc4-08f360e75186",
      source: "test"
    };
    
    const result = await makeRequest('POST', '/api/whatsapp/webhook/replit', webhookData);
    
    if (result.success) {
      logSuccess(`Comando "${cmd.command}" processado`);
      successCount++;
    } else {
      logError(`Comando "${cmd.command}" falhou: ${result.status}`);
    }
    
    // Pequeno delay entre comandos
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  log(`Comandos testados: ${successCount}/${commands.length}`, successCount === commands.length ? 'green' : 'yellow');
  return successCount === commands.length;
}

// ========================================
// TESTE PRINCIPAL
// ========================================

async function runCompleteTest() {
  console.log(`${colors.bold}${colors.blue}=================================`);
  console.log(`🧪 TESTE COMPLETO DO SISTEMA PONTUAL`);
  console.log(`==================================${colors.reset}\n`);
  
  const results = {
    healthCheck: false,
    getTasks: false,
    createTask: false,
    completeTask: false,
    reopenTask: false,
    createTimeEntry: false,
    getTimeEntries: false,
    startTimer: false,
    stopTimer: false,
    dashboardStats: false,
    whatsappIntegration: false,
    whatsappWebhook: false,
    whatsappCommands: false
  };
  
  let createdTaskId = null;
  let createdEntryId = null;
  let timerEntryId = null;
  let whatsappIntegration = null;
  
  try {
    // 1. Testes básicos da API
    results.healthCheck = await testHealthCheck();
    
    const tasksResult = await testGetTasks();
    results.getTasks = tasksResult.success;
    
    // 2. Testes de CRUD de tarefas
    const createResult = await testCreateTask();
    results.createTask = createResult.success;
    createdTaskId = createResult.taskId;
    
    if (createdTaskId) {
      results.completeTask = await testCompleteTask(createdTaskId);
      results.reopenTask = await testReopenTask(createdTaskId);
    }
    
    // 3. Testes de time entries
    if (createdTaskId) {
      const entryResult = await testCreateTimeEntry(createdTaskId);
      results.createTimeEntry = entryResult.success;
      createdEntryId = entryResult.entryId;
      
      const timerResult = await testStartTimer(createdTaskId);
      results.startTimer = timerResult.success;
      timerEntryId = timerResult.entryId;
      
      if (timerResult.success) {
        // Aguardar um pouco antes de parar o timer
        await new Promise(resolve => setTimeout(resolve, 2000));
        results.stopTimer = await testStopTimer(createdTaskId);
      }
    }
    
    const entriesResult = await testGetTimeEntries();
    results.getTimeEntries = entriesResult.success;
    
    // 4. Testes de dashboard
    results.dashboardStats = await testDashboardStats();
    
    // 5. Testes de WhatsApp
    const whatsappResult = await testWhatsAppIntegration();
    results.whatsappIntegration = whatsappResult.success;
    whatsappIntegration = whatsappResult.integration;
    
    results.whatsappWebhook = await testWhatsAppWebhook();
    results.whatsappCommands = await testWhatsAppCommands(whatsappIntegration);
    
  } catch (error) {
    logError(`Erro durante os testes: ${error.message}`);
  }
  
  // ========================================
  // RELATÓRIO FINAL
  // ========================================
  
  console.log(`\n${colors.bold}${colors.blue}=================================`);
  console.log(`📊 RELATÓRIO FINAL DOS TESTES`);
  console.log(`==================================${colors.reset}\n`);
  
  let successCount = 0;
  let totalTests = 0;
  
  for (const [testName, success] of Object.entries(results)) {
    totalTests++;
    if (success) {
      successCount++;
      logSuccess(`${testName}: PASSOU`);
    } else {
      logError(`${testName}: FALHOU`);
    }
  }
  
  console.log(`\n${colors.bold}${colors.blue}=================================`);
  const percentage = Math.round((successCount / totalTests) * 100);
  const color = percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red';
  
  log(`RESULTADO GERAL: ${successCount}/${totalTests} testes passaram (${percentage}%)`, color);
  
  if (percentage >= 90) {
    log("🎉 SISTEMA FUNCIONANDO PERFEITAMENTE!", 'green');
  } else if (percentage >= 70) {
    log("⚠️  SISTEMA FUNCIONANDO COM ALGUNS PROBLEMAS", 'yellow');
  } else {
    log("❌ SISTEMA COM PROBLEMAS CRÍTICOS", 'red');
  }
  
  console.log(`==================================${colors.reset}\n`);
  
  // Cleanup - deletar tarefa de teste se foi criada
  if (createdTaskId) {
    logTest("Limpeza - Deletando Tarefa de Teste");
    const deleteResult = await makeRequest('DELETE', `/api/tasks/${createdTaskId}`);
    if (deleteResult.success) {
      logSuccess("Tarefa de teste deletada");
    } else {
      logWarning("Não foi possível deletar tarefa de teste");
    }
  }
  
  return {
    totalTests,
    successCount,
    percentage,
    results
  };
}

// Executar o teste
if (typeof window === 'undefined') {
  // Node.js environment
  import('node-fetch').then(fetchModule => {
    global.fetch = fetchModule.default;
    return runCompleteTest();
  }).then(result => {
    process.exit(result.percentage >= 70 ? 0 : 1);
  }).catch(error => {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  });
} else {
  // Browser environment
  window.runCompleteTest = runCompleteTest;
}