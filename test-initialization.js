/**
 * Script para testar a inicialização do sistema
 * Para usar no Render ou qualquer ambiente de produção
 */

async function testInitialization() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  
  console.log(`🔍 Testando inicialização do sistema em: ${baseUrl}`);
  
  try {
    // 1. Verificar se sistema está inicializado
    console.log('\n1. Verificando status de inicialização...');
    const checkResponse = await fetch(`${baseUrl}/api/auth/is-initialized`);
    const checkResult = await checkResponse.json();
    
    console.log(`Status: ${checkResponse.status}`);
    console.log(`Inicializado: ${checkResult.initialized}`);
    
    if (checkResult.initialized) {
      console.log('✅ Sistema já foi inicializado');
      return;
    }
    
    // 2. Tentar inicializar sistema
    console.log('\n2. Inicializando sistema...');
    const initData = {
      fullName: 'Administrador Teste',
      email: 'admin@teste.com',
      username: 'admin',
      password: 'senha123'
    };
    
    const initResponse = await fetch(`${baseUrl}/api/auth/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(initData)
    });
    
    console.log(`Status da inicialização: ${initResponse.status}`);
    
    if (initResponse.ok) {
      const initResult = await initResponse.json();
      console.log('✅ Sistema inicializado com sucesso!');
      console.log(`Token gerado: ${initResult.token.substring(0, 20)}...`);
      console.log(`Usuário: ${initResult.user.username} (${initResult.user.role})`);
    } else {
      const errorText = await initResponse.text();
      console.log('❌ Erro na inicialização:');
      console.log(errorText);
    }
    
    // 3. Verificar novamente se foi inicializado
    console.log('\n3. Verificando novamente...');
    const recheckResponse = await fetch(`${baseUrl}/api/auth/is-initialized`);
    const recheckResult = await recheckResponse.json();
    
    console.log(`Status final: ${recheckResponse.status}`);
    console.log(`Inicializado: ${recheckResult.initialized}`);
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testInitialization();
}

export default testInitialization;