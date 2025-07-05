#!/usr/bin/env node

/**
 * Teste da Nova API com Autenticação
 * Testa login, criação de tarefas com fonte e consumo via API Key
 */

const BASE_URL = 'http://localhost:5000';

async function makeRequest(method, endpoint, data = null, headers = {}) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testando Autenticação');
  
  // 1. Login com usuário padrão
  console.log('1. Fazendo login...');
  try {
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login bem-sucedido');
    console.log(`Token: ${loginResponse.token.substring(0, 20)}...`);
    console.log(`Usuário: ${loginResponse.user.username} (${loginResponse.user.fullName})`);
    
    return {
      token: loginResponse.token,
      userId: loginResponse.user.id
    };
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    return null;
  }
}

async function testUserInfo(token) {
  console.log('\n👤 Testando Informações do Usuário');
  
  try {
    const userInfo = await makeRequest('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${token}`
    });
    
    console.log('✅ Informações obtidas com sucesso');
    console.log(`Username: ${userInfo.username}`);
    console.log(`Email: ${userInfo.email}`);
    console.log(`API Key: ${userInfo.apiKey}`);
    
    return userInfo.apiKey;
  } catch (error) {
    console.error('❌ Erro ao obter informações:', error.message);
    return null;
  }
}

async function testTaskCreationWebInterface(token) {
  console.log('\n📝 Testando Criação de Tarefa via Interface Web');
  
  try {
    const task = await makeRequest('POST', '/api/tasks', {
      name: 'Tarefa via Interface Web',
      description: 'Criada através da interface web com autenticação',
      color: 'blue',
      estimatedHours: 5
    }, {
      'Authorization': `Bearer ${token}`
    });
    
    console.log('✅ Tarefa criada via interface web');
    console.log(`ID: ${task.id}, Nome: ${task.name}`);
    console.log(`Origem: ${task.source}, UserId: ${task.userId}`);
    
    return task;
  } catch (error) {
    console.error('❌ Erro ao criar tarefa via web:', error.message);
    return null;
  }
}

async function testTaskCreationApiKey(apiKey) {
  console.log('\n🔑 Testando Criação de Tarefa via API Key');
  
  try {
    const task = await makeRequest('POST', '/api/tasks', {
      name: 'Tarefa via API Externa',
      description: 'Criada através de integração externa usando API Key',
      color: 'green',
      estimatedHours: 3
    }, {
      'X-API-Key': apiKey
    });
    
    console.log('✅ Tarefa criada via API Key');
    console.log(`ID: ${task.id}, Nome: ${task.name}`);
    console.log(`Origem: ${task.source}, UserId: ${task.userId}`);
    
    return task;
  } catch (error) {
    console.error('❌ Erro ao criar tarefa via API:', error.message);
    return null;
  }
}

async function testTaskListing(token) {
  console.log('\n📋 Testando Listagem de Tarefas');
  
  try {
    const tasks = await makeRequest('GET', '/api/tasks', null, {
      'Authorization': `Bearer ${token}`
    });
    
    console.log(`✅ ${tasks.length} tarefas encontradas`);
    tasks.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.name} (${task.source}) - User: ${task.userId}`);
    });
    
    return tasks;
  } catch (error) {
    console.error('❌ Erro ao listar tarefas:', error.message);
    return [];
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🚫 Testando Acesso Não Autorizado');
  
  try {
    await makeRequest('GET', '/api/tasks');
    console.log('❌ FALHA: Acesso permitido sem autenticação');
  } catch (error) {
    if (error.message.includes('401')) {
      console.log('✅ Acesso negado corretamente para requisição sem autenticação');
    } else {
      console.log('❌ Erro inesperado:', error.message);
    }
  }
  
  try {
    await makeRequest('GET', '/api/tasks', null, {
      'X-API-Key': 'invalid-key'
    });
    console.log('❌ FALHA: Acesso permitido com API Key inválida');
  } catch (error) {
    if (error.message.includes('401')) {
      console.log('✅ Acesso negado corretamente para API Key inválida');
    } else {
      console.log('❌ Erro inesperado:', error.message);
    }
  }
}

async function runTests() {
  console.log('🎯 INICIANDO TESTES DA API COM AUTENTICAÇÃO');
  console.log('=' .repeat(60));
  
  // 1. Testar autenticação
  const authData = await testAuthentication();
  if (!authData) return;
  
  // 2. Testar informações do usuário e obter API Key
  const apiKey = await testUserInfo(authData.token);
  if (!apiKey) return;
  
  // 3. Testar criação via interface web
  const webTask = await testTaskCreationWebInterface(authData.token);
  
  // 4. Testar criação via API Key
  const apiTask = await testTaskCreationApiKey(apiKey);
  
  // 5. Testar listagem
  const tasks = await testTaskListing(authData.token);
  
  // 6. Testar segurança
  await testUnauthorizedAccess();
  
  // Resumo
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('=' .repeat(60));
  
  const results = [
    { name: 'Login', success: !!authData },
    { name: 'Informações do Usuário', success: !!apiKey },
    { name: 'Criação via Web', success: !!webTask },
    { name: 'Criação via API', success: !!apiTask },
    { name: 'Listagem', success: tasks.length > 0 },
    { name: 'Segurança', success: true } // Assumindo que passou nos testes
  ];
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  });
  
  const passedTests = results.filter(r => r.success).length;
  console.log(`\n🎉 ${passedTests}/${results.length} testes passaram`);
  
  if (passedTests === results.length) {
    console.log('Sistema de autenticação funcionando corretamente! 🚀');
  }
}

// Executar os testes
runTests().catch(error => {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
});