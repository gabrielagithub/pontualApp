# Roteiro de Teste - WhatsApp Pontual

## 📋 Pré-requisitos
- [ ] Evolution API configurada e funcionando
- [ ] Webhook configurado no Pontual
- [ ] Integração WhatsApp ativa na interface web
- [ ] Grupo/chat de teste configurado (se usar filtro por grupo)

---

## 🚀 Teste 1: Comandos Básicos

### 1.1 Comando de Ajuda
**Comando:** `ajuda`
**Resultado esperado:**
- Lista completa de comandos
- Exemplos de seleção interativa
- Formatação com negrito e emojis

### 1.2 Status do Sistema
**Comando:** `status`
**Resultado esperado:**
- Status atual dos timers
- Tempo trabalhado hoje/semana
- Lista de timers ativos (se houver)

---

## 📝 Teste 2: Criação de Tarefas

### 2.1 Tarefa Simples
**Comando:** `nova Reunião com Cliente`
**Resultado esperado:**
- Confirmação de criação
- ID da tarefa gerada
- Instruções para iniciar timer

### 2.2 Tarefa Completa com Parâmetros
**Comando:** `nova Desenvolvimento API --desc "Criar endpoints REST" --tempo 4h --prazo 2025-07-10 --cor azul`
**Resultado esperado:**
- Tarefa criada com todos os dados
- Exibição da descrição, tempo estimado e prazo
- Confirmação da cor aplicada

### 2.3 Validação de Parâmetros
**Comandos de teste:**
- `nova Tarefa Teste --tempo 2h30min`
- `nova Projeto X --cor verde --prazo 2025-12-31`
- `nova Task --desc "Descrição com espaços"`

---

## 📋 Teste 3: Listagem e Seleção Interativa

### 3.1 Listar Tarefas
**Comando:** `tarefas`
**Resultado esperado:**
- Lista numerada (1, 2, 3...)
- Tempo trabalhado por tarefa
- Indicador de timer ativo (⏱️)
- Prazos próximos destacados
- Instruções de seleção interativa

### 3.2 Seleção por Número (Menu)
**Comando:** `1` (após listar tarefas)
**Resultado esperado:**
- Menu detalhado da tarefa selecionada
- Informações completas (nome, descrição, tempo, prazo)
- Lista de ações disponíveis
- Exemplos de uso

### 3.3 Ação Direta - Iniciar Timer
**Comando:** `1 iniciar` (após listar tarefas)
**Resultado esperado:**
- Timer iniciado para a tarefa
- Confirmação com nome da tarefa
- Instruções para parar

### 3.4 Ação Direta - Lançar Tempo
**Comando:** `2 lancamento 1h30min` (após listar tarefas)
**Resultado esperado:**
- Tempo lançado na tarefa
- Confirmação do valor adicionado
- Tempo total atualizado

---

## ⏱️ Teste 4: Controle de Tempo

### 4.1 Iniciar Timer
**Comando:** `iniciar 1` (usando ID da tarefa)
**Resultado esperado:**
- Timer iniciado
- Verificação de conflitos (não permitir múltiplos timers)
- Mensagem de confirmação

### 4.2 Parar Timer
**Comando:** `parar 1`
**Resultado esperado:**
- Timer parado
- Tempo total atualizado
- Confirmação da duração da sessão

### 4.3 Pausar e Retomar
**Comandos sequenciais:**
1. `pausar 1`
2. `retomar 1`
**Resultado esperado:**
- Pause mantém sessão ativa
- Retomar continua de onde parou
- Tempo acumulado corretamente

---

## 📊 Teste 5: Lançamentos de Tempo

### 5.1 Lançamento Manual
**Comando:** `lancamento 1 2h`
**Resultado esperado:**
- Tempo adicionado à tarefa
- Confirmação do valor
- Atualização do total

### 5.2 Formatos de Tempo
**Comandos de teste:**
- `lancamento 1 90min`
- `lancamento 1 1h30min`
- `lancamento 1 2.5h`
**Resultado esperado:**
- Todos os formatos aceitos
- Conversão correta para segundos
- Exibição formatada na confirmação

---

## ✅ Teste 6: Conclusão de Tarefas

### 6.1 Concluir Tarefa
**Comando:** `2 concluir` (após listar tarefas)
**Resultado esperado:**
- Tarefa marcada como concluída
- Remoção da lista de ativas
- Timer parado automaticamente (se ativo)

### 6.2 Reabrir Tarefa
**Comando:** `reabrir 1`
**Resultado esperado:**
- Tarefa reativada
- Retorna à lista de ativas
- Mantém histórico de tempo

### 6.3 Lançar e Concluir
**Comando:** `lancar-concluir 1 1h`
**Resultado esperado:**
- Tempo lançado
- Tarefa finalizada
- Operação atômica (tudo ou nada)

---

## 📈 Teste 7: Relatórios

### 7.1 Relatório Diário
**Comando:** `relatorio`
**Resultado esperado:**
- Tempo total do dia
- Breakdown por tarefa
- Tarefas concluídas/ativas

### 7.2 Relatório Semanal
**Comando:** `relatorio semanal`
**Resultado esperado:**
- Dados da semana atual
- Comparativo de produtividade
- Lista de tarefas trabalhadas

### 7.3 Relatório Mensal
**Comando:** `relatorio mensal`
**Resultado esperado:**
- Visão geral do mês
- Estatísticas consolidadas
- Trends de produtividade

---

## 🛡️ Teste 8: Validações e Tratamento de Erros

### 8.1 Comandos Inválidos
**Comandos de teste:**
- `comandoInexistente`
- `iniciar`
- `lancamento`
**Resultado esperado:**
- Mensagens de erro claras
- Sugestões de correção
- Redirecionamento para ajuda

### 8.2 IDs Inexistentes
**Comandos de teste:**
- `iniciar 999`
- `concluir 888`
**Resultado esperado:**
- Erro informativo
- Sugestão para listar tarefas
- Não quebrar o sistema

### 8.3 Conflitos de Timer
**Teste:**
1. Iniciar timer na tarefa 1
2. Tentar iniciar timer na tarefa 2
**Resultado esperado:**
- Segundo comando bloqueado
- Informação sobre timer ativo
- Instruções para parar primeiro

---

## 🎯 Teste 9: Contexto Conversacional

### 9.1 Expiração de Contexto
**Teste:**
1. Listar tarefas com `tarefas`
2. Aguardar 11 minutos
3. Tentar usar `1`
**Resultado esperado:**
- Comando numérico não reconhecido após expiração
- Necessidade de listar tarefas novamente

### 9.2 Sobreposição de Contexto
**Teste:**
1. Listar tarefas
2. Criar nova tarefa
3. Listar tarefas novamente
4. Usar seleção numérica
**Resultado esperado:**
- Contexto atualizado com nova lista
- Números correspondem à lista mais recente

---

## 🔒 Teste 10: Filtros e Permissões

### 10.1 Filtro por Grupo (se configurado)
**Teste:**
- Enviar comando de grupo autorizado
- Enviar comando de grupo não autorizado
**Resultado esperado:**
- Resposta apenas para grupo autorizado
- Silêncio total para grupos não autorizados

### 10.2 Mensagens Diretas vs Grupo
**Teste:**
- Testar comandos em chat direto
- Testar comandos em grupo
**Resultado esperado:**
- Funcionamento conforme configuração
- Logs corretos no sistema

---

## ✅ Checklist de Validação Final

### Funcionalidade Básica
- [ ] Todos os comandos respondem
- [ ] Formatação correta (negrito, emojis)
- [ ] Tempos calculados corretamente
- [ ] Dados persistidos no banco

### Interface do Usuário
- [ ] Mensagens claras e intuitivas
- [ ] Exemplos úteis nas respostas
- [ ] Navegação fácil entre comandos
- [ ] Feedback adequado para erros

### Performance e Confiabilidade
- [ ] Respostas rápidas (< 3 segundos)
- [ ] Sistema não quebra com comandos inválidos
- [ ] Contexto gerenciado corretamente
- [ ] Logs completos para debugging

### Integração
- [ ] Webhook recebe mensagens
- [ ] API Evolution funciona
- [ ] Dados sincronizados com interface web
- [ ] Backup de dados funcionando

---

## 🐛 Problemas Comuns e Soluções

### Bot Não Responde
1. Verificar webhook URL
2. Confirmar API Key
3. Checar logs do servidor
4. Validar filtro de grupo

### Comandos Não Reconhecidos
1. Verificar formatação (sem acentos especiais)
2. Testar comando "ajuda"
3. Conferir contexto conversacional
4. Reiniciar contexto listando tarefas

### Tempos Incorretos
1. Verificar formatos aceitos
2. Confirmar timezone
3. Checar logs de lançamento
4. Validar cálculos no banco

---

## 📝 Registro de Testes

**Data do Teste:** _____________
**Testador:** _________________
**Versão:** ___________________

### Resultados:
- [ ] ✅ Todos os testes passaram
- [ ] ⚠️ Alguns problemas encontrados
- [ ] ❌ Falhas críticas detectadas

**Observações:**
_________________________________
_________________________________
_________________________________

**Próximos Passos:**
_________________________________
_________________________________
_________________________________