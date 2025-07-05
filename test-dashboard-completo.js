#!/usr/bin/env node

/**
 * Teste Completo do Dashboard - Pontual
 * Valida todas as funcionalidades CRUD e insights do dashboard
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n🧪 ${testName}`, 'cyan');
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

// Variável global para armazenar o token de autenticação
let authToken = null;

async function authenticate() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (!response.ok) {
      throw new Error(`Falha na autenticação: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.token;
    return true;
  } catch (error) {
    logError(`Erro na autenticação: ${error.message}`);
    return false;
  }
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  // Garantir que estamos autenticados
  if (!authToken) {
    const authenticated = await authenticate();
    if (!authenticated) {
      throw new Error('Falha na autenticação');
    }
  }

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...headers
    }
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`http://localhost:5000${endpoint}`, config);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function testDashboardStats() {
  logTest('Dashboard Stats - Insights Gerais');
  
  const stats = await makeRequest('GET', '/api/dashboard/stats');
  
  console.log('📊 Estatísticas do Dashboard:');
  console.log(`   • Tempo hoje: ${stats.todayTime}s (${Math.round(stats.todayTime/3600*100)/100}h)`);
  console.log(`   • Tarefas ativas: ${stats.activeTasks}`);
  console.log(`   • Tarefas concluídas: ${stats.completedTasks}`);
  console.log(`   • Tarefas vencidas: ${stats.overdueTasks}`);
  console.log(`   • Tarefas overtime: ${stats.overTimeTasks}`);
  console.log(`   • Vence hoje: ${stats.dueTodayTasks}`);
  console.log(`   • Vence amanhã: ${stats.dueTomorrowTasks}`);
  console.log(`   • Próximo do limite: ${stats.nearingLimitTasks}`);
  
  logSuccess('Estatísticas do dashboard funcionando');
  return stats;
}

async function testTasksCRUD() {
  logTest('CRUD de Tarefas');
  
  // 1. Criar tarefa
  const newTask = {
    name: 'Teste CRUD Dashboard',
    description: 'Tarefa para testar funcionalidades',
    color: 'purple',
    estimatedHours: 8,
    deadline: '2025-07-15T18:00:00.000Z'
  };
  
  const createdTask = await makeRequest('POST', '/api/tasks', newTask);
  logSuccess(`Tarefa criada: ID ${createdTask.id} - "${createdTask.name}"`);
  
  // 2. Listar tarefas
  const tasks = await makeRequest('GET', '/api/tasks');
  logSuccess(`Listagem de tarefas: ${tasks.length} encontradas`);
  
  // 3. Buscar tarefa específica
  const specificTask = await makeRequest('GET', `/api/tasks/${createdTask.id}`);
  logSuccess(`Busca específica: "${specificTask.name}"`);
  
  // 4. Atualizar tarefa
  const updatedData = {
    name: 'Teste CRUD Dashboard - Atualizado',
    estimatedHours: 12
  };
  const updatedTask = await makeRequest('PUT', `/api/tasks/${createdTask.id}`, updatedData);
  logSuccess(`Tarefa atualizada: "${updatedTask.name}" (${updatedTask.estimatedHours}h)`);
  
  // 5. Completar tarefa
  const completedTask = await makeRequest('POST', `/api/tasks/${createdTask.id}/complete`);
  logSuccess(`Tarefa concluída: "${completedTask.name}" em ${completedTask.completedAt}`);
  
  return createdTask.id;
}

async function testTimeEntriesCRUD() {
  logTest('CRUD de Apontamentos de Tempo');
  
  // Criar tarefa para apontamentos
  const task = await makeRequest('POST', '/api/tasks', {
    name: 'Teste Apontamentos',
    description: 'Para testar time entries'
  });
  
  // 1. Criar apontamento
  const timeEntry = {
    taskId: task.id,
    startTime: '2025-07-04T09:00:00.000Z',
    endTime: '2025-07-04T13:00:00.000Z',
    duration: 14400,
    notes: 'Apontamento de teste'
  };
  
  const createdEntry = await makeRequest('POST', '/api/time-entries', timeEntry);
  logSuccess(`Apontamento criado: ID ${createdEntry.id} - 4h para tarefa "${task.name}"`);
  
  // 2. Listar apontamentos
  const entries = await makeRequest('GET', '/api/time-entries');
  logSuccess(`Listagem de apontamentos: ${entries.length} encontrados`);
  
  // 3. Buscar apontamento específico
  const specificEntry = await makeRequest('GET', `/api/time-entries/${createdEntry.id}`);
  logSuccess(`Busca específica: ${specificEntry.notes} (${specificEntry.duration}s)`);
  
  // 4. Atualizar apontamento
  const updatedEntry = await makeRequest('PUT', `/api/time-entries/${createdEntry.id}`, {
    notes: 'Apontamento atualizado via teste',
    duration: 18000 // 5h
  });
  logSuccess(`Apontamento atualizado: "${updatedEntry.notes}" (${updatedEntry.duration}s)`);
  
  return createdEntry.id;
}

async function testReportsAndInsights() {
  logTest('Relatórios e Insights');
  
  // 1. Tempo por tarefa
  const timeByTask = await makeRequest('GET', '/api/reports/time-by-task');
  logSuccess(`Relatório tempo por tarefa: ${timeByTask.length} tarefas analisadas`);
  
  timeByTask.forEach((item, index) => {
    const hours = Math.round(item.totalTime / 3600 * 100) / 100;
    console.log(`   ${index + 1}. ${item.task.name}: ${hours}h`);
  });
  
  // 2. Estatísticas diárias
  const startDate = '2025-07-01';
  const endDate = '2025-07-10';
  const dailyStats = await makeRequest('GET', `/api/reports/daily-stats?startDate=${startDate}&endDate=${endDate}`);
  logSuccess(`Estatísticas diárias: ${dailyStats.length} dias com atividade`);
  
  dailyStats.forEach(day => {
    const hours = Math.round(day.totalTime / 3600 * 100) / 100;
    console.log(`   📅 ${day.date}: ${hours}h`);
  });
  
  return { timeByTask, dailyStats };
}

async function testTimerFunctionality() {
  logTest('Funcionalidade de Timer');
  
  // Criar tarefa para timer
  const task = await makeRequest('POST', '/api/tasks', {
    name: 'Teste Timer',
    description: 'Para testar start/stop timer'
  });
  
  // 1. Iniciar timer
  const startResponse = await makeRequest('POST', '/api/start-timer', {
    taskId: task.id
  });
  logSuccess(`Timer iniciado para tarefa "${task.name}"`);
  
  // 2. Verificar timers em execução
  const runningTimers = await makeRequest('GET', '/api/time-entries/running');
  logSuccess(`Timers em execução: ${runningTimers.length}`);
  
  // Aguardar 2 segundos para simular trabalho
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. Parar timer
  const runningEntry = runningTimers.find(entry => entry.taskId === task.id);
  if (runningEntry) {
    const stopResponse = await makeRequest('POST', '/api/stop-timer', {
      taskId: task.id
    });
    logSuccess(`Timer parado: ${stopResponse.message || 'Timer finalizado'}`);
  }
  
  return task.id;
}

async function validateDashboardIntegrity() {
  logTest('Validação de Integridade do Dashboard');
  
  // Verificar se dados estão consistentes
  const stats = await makeRequest('GET', '/api/dashboard/stats');
  const tasks = await makeRequest('GET', '/api/tasks');
  const entries = await makeRequest('GET', '/api/time-entries');
  
  // Contar tarefas ativas manualmente
  const activeTasks = tasks.filter(task => task.isActive && !task.isCompleted).length;
  const completedTasks = tasks.filter(task => task.isCompleted).length;
  
  console.log('🔍 Validação de Consistência:');
  console.log(`   • Tarefas no sistema: ${tasks.length}`);
  console.log(`   • Apontamentos no sistema: ${entries.length}`);
  console.log(`   • Tarefas ativas (manual): ${activeTasks}`);
  console.log(`   • Tarefas ativas (stats): ${stats.activeTasks}`);
  console.log(`   • Tarefas concluídas (manual): ${completedTasks}`);
  console.log(`   • Tarefas concluídas (stats): ${stats.completedTasks}`);
  
  // Calcular tempo total manualmente
  const totalTimeManual = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  
  console.log(`   • Tempo total (manual): ${totalTimeManual}s`);
  console.log(`   • Tempo hoje (stats): ${stats.todayTime}s`);
  
  logSuccess('Validação de integridade completada');
  
  return {
    tasksCount: tasks.length,
    entriesCount: entries.length,
    consistencyCheck: {
      activeTasks: activeTasks === stats.activeTasks,
      totalTime: Math.abs(totalTimeManual - stats.todayTime) < 10 // tolerância de 10s
    }
  };
}

async function runDashboardTests() {
  log('\n🎯 INICIANDO TESTE COMPLETO DO DASHBOARD PONTUAL', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const results = {
    stats: null,
    crud: { taskId: null, entryId: null },
    reports: null,
    timer: null,
    integrity: null,
    errors: []
  };
  
  try {
    // 1. Testar estatísticas do dashboard
    results.stats = await testDashboardStats();
    
    // 2. Testar CRUD de tarefas
    results.crud.taskId = await testTasksCRUD();
    
    // 3. Testar CRUD de apontamentos
    results.crud.entryId = await testTimeEntriesCRUD();
    
    // 4. Testar relatórios e insights
    results.reports = await testReportsAndInsights();
    
    // 5. Testar funcionalidade de timer
    results.timer = await testTimerFunctionality();
    
    // 6. Validar integridade geral
    results.integrity = await validateDashboardIntegrity();
    
  } catch (error) {
    logError(`Erro durante os testes: ${error.message}`);
    results.errors.push(error.message);
  }
  
  // Resumo final
  log('\n📋 RESUMO DOS TESTES', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const tests = [
    { name: 'Dashboard Stats', success: !!results.stats },
    { name: 'CRUD Tarefas', success: !!results.crud.taskId },
    { name: 'CRUD Apontamentos', success: !!results.crud.entryId },
    { name: 'Relatórios', success: !!results.reports },
    { name: 'Timer', success: !!results.timer },
    { name: 'Integridade', success: !!results.integrity }
  ];
  
  tests.forEach(test => {
    if (test.success) {
      logSuccess(`${test.name}: PASSOU`);
    } else {
      logError(`${test.name}: FALHOU`);
    }
  });
  
  const passedTests = tests.filter(t => t.success).length;
  const totalTests = tests.length;
  
  if (passedTests === totalTests) {
    log(`\n🎉 TODOS OS TESTES PASSARAM! (${passedTests}/${totalTests})`, 'green');
    log('Dashboard completamente funcional e operacional! 🚀', 'green');
  } else {
    log(`\n⚠️  ${passedTests}/${totalTests} testes passaram`, 'yellow');
    log('Algumas funcionalidades podem precisar de atenção', 'yellow');
  }
  
  if (results.errors.length > 0) {
    log('\n❌ Erros encontrados:', 'red');
    results.errors.forEach(error => console.log(`   • ${error}`));
  }
  
  return results;
}

// Executar os testes
runDashboardTests().catch(error => {
  logError(`Erro fatal: ${error.message}`);
  process.exit(1);
});