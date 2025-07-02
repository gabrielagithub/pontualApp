# Pontual - API de Apontamentos de Tempo

## Visão Geral

Esta API permite gerenciar apontamentos de tempo, tarefas e relatórios no sistema Pontual. Todos os endpoints retornam dados em formato JSON.

**URL Base**: `http://localhost:5000` (desenvolvimento)

## Endpoints de Apontamentos de Tempo

### 1. Listar todos os apontamentos
```
GET /api/time-entries
```
**Resposta**: Array com todos os apontamentos de tempo incluindo informações da tarefa associada.

### 2. Buscar apontamento específico
```
GET /api/time-entries/:id
```
**Parâmetros**: 
- `id` (number): ID do apontamento

### 3. Criar novo apontamento
```
POST /api/time-entries
```
**Body (JSON)**:
```json
{
  "taskId": 1,
  "startTime": "2025-01-01T10:00:00.000Z",
  "endTime": "2025-01-01T12:00:00.000Z",
  "duration": 7200,
  "isRunning": false,
  "description": "Trabalhando na funcionalidade X"
}
```

**Campos obrigatórios**:
- `taskId`: ID da tarefa associada
- `startTime`: Data/hora de início (ISO string)

**Campos opcionais**:
- `endTime`: Data/hora de fim (ISO string)
- `duration`: Duração em segundos (calculado automaticamente se não fornecido)
- `isRunning`: Se o timer está rodando (default: false)
- `description`: Descrição do trabalho realizado

### 4. Atualizar apontamento
```
PUT /api/time-entries/:id
```
**Body**: Mesmo formato do POST, mas todos os campos são opcionais.

### 5. Excluir apontamento
```
DELETE /api/time-entries/:id
```

### 6. Buscar apontamentos em execução
```
GET /api/time-entries/running
```
**Resposta**: Array com apontamentos que estão atualmente em execução.

## Endpoints de Tarefas

### 1. Listar todas as tarefas
```
GET /api/tasks
```

### 2. Buscar tarefa específica
```
GET /api/tasks/:id
```

### 3. Criar nova tarefa
```
POST /api/tasks
```
**Body (JSON)**:
```json
{
  "name": "Nome da Tarefa",
  "description": "Descrição detalhada",
  "color": "#3B82F6",
  "estimatedHours": 8,
  "deadline": "2025-01-15T23:59:59.000Z",
  "isActive": true
}
```

**Campos obrigatórios**:
- `name`: Nome da tarefa

**Campos opcionais**:
- `description`: Descrição da tarefa
- `color`: Cor em hexadecimal (default: "#3B82F6")
- `estimatedHours`: Horas estimadas para conclusão
- `deadline`: Prazo final (ISO string)
- `isActive`: Se a tarefa está ativa (default: true)

### 4. Atualizar tarefa
```
PUT /api/tasks/:id
```

### 5. Excluir tarefa
```
DELETE /api/tasks/:id
```
**Nota**: Não é possível excluir tarefas que possuem apontamentos de tempo.

### 6. Concluir tarefa
```
PUT /api/tasks/:id/complete
```
**Descrição**: Marca uma tarefa como concluída, definindo `isCompleted: true` e `completedAt` com a data/hora atual.

**Resposta**:
```json
{
  "id": 1,
  "name": "Nome da Tarefa",
  "description": "Descrição",
  "color": "#3B82F6",
  "isActive": true,
  "isCompleted": true,
  "completedAt": "2025-01-01T12:00:00.000Z",
  "totalTime": 7200,
  "activeEntries": 0
}
```

### 7. Reabrir tarefa
```
PUT /api/tasks/:id/reopen
```
**Descrição**: Reativa uma tarefa concluída, definindo `isCompleted: false` e `completedAt: null`.

**Resposta**: Mesmo formato da tarefa atualizada.

## Endpoints de Analytics/Dashboard

### 1. Estatísticas do dashboard
```
GET /api/dashboard/stats
```
**Resposta**:
```json
{
  "todayTime": 14400,
  "activeTasks": 5,
  "weekTime": 86400,
  "monthTime": 432000,
  "completedTasks": 3,
  "overdueTasks": 1,
  "overTimeTasks": 2,
  "dueTodayTasks": 1,
  "dueTomorrowTasks": 0,
  "nearingLimitTasks": 1
}
```

### 2. Tarefas em atraso
```
GET /api/dashboard/overdue-tasks
```

### 3. Tarefas com tempo excedido
```
GET /api/dashboard/overtime-tasks
```

### 4. Tarefas vencendo hoje
```
GET /api/dashboard/due-today-tasks
```

### 5. Tarefas vencendo amanhã
```
GET /api/dashboard/due-tomorrow-tasks
```

## Endpoints de Relatórios

### 1. Tempo por tarefa
```
GET /api/reports/time-by-task
```
**Parâmetros de query opcionais**:
- `startDate`: Data de início (YYYY-MM-DD)
- `endDate`: Data de fim (YYYY-MM-DD)

**Resposta**:
```json
[
  {
    "task": {
      "id": 1,
      "name": "Desenvolvimento Frontend",
      "color": "#3B82F6"
    },
    "totalTime": 28800
  }
]
```

### 2. Estatísticas diárias
```
GET /api/reports/daily-stats
```
**Parâmetros de query obrigatórios**:
- `startDate`: Data de início (YYYY-MM-DD)
- `endDate`: Data de fim (YYYY-MM-DD)

**Resposta**:
```json
[
  {
    "date": "2025-01-01",
    "totalTime": 28800
  },
  {
    "date": "2025-01-02", 
    "totalTime": 21600
  }
]
```

### 3. Exportar dados (CSV)
```
GET /api/export/csv
```
**Parâmetros de query opcionais**:
- `startDate`: Data de início (YYYY-MM-DD)
- `endDate`: Data de fim (YYYY-MM-DD)
- `taskId`: ID específico da tarefa

**Resposta**: Arquivo CSV para download com apontamentos de tempo.

## Endpoints de Timer Avançado

### 1. Finalizar timer e concluir tarefa
```
POST /api/timer/finish-and-complete
```
**Body (JSON)**:
```json
{
  "entryId": 123,
  "taskId": 1
}
```

**Descrição**: Para um timer ativo, calcula a duração final e marca a tarefa como concluída em uma única operação.

**Resposta**:
```json
{
  "message": "Timer finalizado e tarefa concluída com sucesso",
  "timeEntry": { ... },
  "task": { ... }
}
```

### 2. Validação de exclusão de apontamentos
```
DELETE /api/time-entries/:id
```
**Nota**: Implementa validação para prevenir exclusão de apontamentos ativos (com `endTime: null` ou `isRunning: true`). Retorna erro 400 se tentar excluir entrada ativa.

## Exemplos de Uso

### Criar um apontamento de tempo simples
```bash
curl -X POST http://localhost:5000/api/time-entries \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": 1,
    "startTime": "2025-01-01T09:00:00.000Z",
    "endTime": "2025-01-01T17:00:00.000Z",
    "duration": 28800,
    "description": "Desenvolvimento da funcionalidade de relatórios"
  }'
```

### Iniciar um timer (apontamento em execução)
```bash
curl -X POST http://localhost:5000/api/time-entries \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": 1,
    "startTime": "2025-01-01T09:00:00.000Z",
    "isRunning": true,
    "description": "Iniciando trabalho na tarefa"
  }'
```

### Parar um timer
```bash
curl -X PUT http://localhost:5000/api/time-entries/1 \
  -H "Content-Type: application/json" \
  -d '{
    "endTime": "2025-01-01T17:00:00.000Z",
    "isRunning": false,
    "duration": 28800
  }'
```

## Códigos de Resposta

- **200**: Sucesso
- **201**: Criado com sucesso
- **400**: Dados inválidos
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

## Validação de Dados

Todos os endpoints validam os dados usando esquemas Zod. Em caso de erro de validação, a resposta será:
```json
{
  "message": "Invalid data",
  "errors": [
    {
      "path": ["field"],
      "message": "Error description"
    }
  ]
}
```

## Endpoints Simplificados para Integração Externa

### 1. Criação rápida de apontamento
```
POST /api/quick-entry
```
**Body (JSON)**:
```json
{
  "taskName": "Desenvolvimento Frontend",
  "startTime": "2025-01-01T09:00:00.000Z",
  "endTime": "2025-01-01T17:00:00.000Z",
  "duration": 28800,
  "description": "Trabalhando na interface de usuário"
}
```

**Campos obrigatórios**:
- `taskName`: Nome da tarefa (será criada automaticamente se não existir)

**Campos opcionais**:
- `startTime`: Data/hora de início (padrão: agora)
- `endTime`: Data/hora de fim
- `duration`: Duração em segundos (calculado automaticamente se não fornecido)
- `description`: Descrição do trabalho

**Resposta**:
```json
{
  "message": "Apontamento criado com sucesso",
  "entry": { ... },
  "task": { ... }
}
```

### 2. Iniciar timer
```
POST /api/start-timer
```
**Body (JSON)**:
```json
{
  "taskName": "Reunião de Planejamento",
  "description": "Reunião semanal da equipe"
}
```

**Alternativa com ID**:
```json
{
  "taskId": 1,
  "description": "Trabalhando na tarefa X"
}
```

### 3. Parar timer
```
POST /api/stop-timer
```
**Body (JSON)**:
```json
{
  "taskName": "Reunião de Planejamento",
  "description": "Finalizando discussão sobre sprints"
}
```

### 4. Status atual do sistema
```
GET /api/status
```
**Resposta**:
```json
{
  "currentTime": "2025-01-01T12:00:00.000Z",
  "runningTimers": 1,
  "runningEntries": [
    {
      "id": 1,
      "taskName": "Desenvolvimento",
      "startTime": "2025-01-01T10:00:00.000Z",
      "currentDuration": 7200,
      "description": "Implementando nova funcionalidade"
    }
  ],
  "todayStats": {
    "totalTime": 14400,
    "activeTasks": 3,
    "completedTasks": 2
  }
}
```

## Exemplos de Uso com curl

### Criar apontamento rapidamente
```bash
curl -X POST http://localhost:5000/api/quick-entry \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "Codificação",
    "startTime": "2025-01-01T08:00:00.000Z",
    "endTime": "2025-01-01T12:00:00.000Z",
    "description": "Desenvolvendo nova funcionalidade"
  }'
```

### Iniciar um timer
```bash
curl -X POST http://localhost:5000/api/start-timer \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "Reunião",
    "description": "Reunião de alinhamento"
  }'
```

### Parar um timer
```bash
curl -X POST http://localhost:5000/api/stop-timer \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "Reunião",
    "description": "Reunião finalizada"
  }'
```

### Verificar status
```bash
curl http://localhost:5000/api/status
```

## Formatos de Data

Todas as datas devem ser fornecidas no formato ISO 8601:
- `2025-01-01T10:00:00.000Z`
- `2025-12-31T23:59:59.000Z`

## Durações

As durações são sempre em segundos:
- 1 hora = 3600 segundos
- 8 horas = 28800 segundos
- 1 minuto = 60 segundos

---

# WhatsApp Integration API

## Endpoints de Integração WhatsApp

### 1. Criar Integração WhatsApp
```
POST /api/whatsapp/integration
```
**Body (JSON)**:
```json
{
  "instanceName": "pontual-bot",
  "apiUrl": "https://api.evolution.com",
  "apiKey": "B6D9F2A1-1234-5678-9ABC-DEF123456789",
  "phoneNumber": "5511999999999",
  "restrictToGroup": true,
  "allowedGroupName": "Equipe Desenvolvimento"
}
```

**Resposta (200)**:
```json
{
  "id": 1,
  "userId": 1,
  "instanceName": "pontual-bot",
  "apiUrl": "https://api.evolution.com",
  "phoneNumber": "5511999999999",
  "webhookUrl": "https://seu-dominio.com/api/whatsapp/webhook/pontual-bot",
  "isActive": true,
  "restrictToGroup": true,
  "allowedGroupName": "Equipe Desenvolvimento",
  "createdAt": "2025-07-02T00:00:00.000Z"
}
```

### 2. Listar Integrações WhatsApp
```
GET /api/whatsapp/integration
```

**Resposta (200)**:
```json
{
  "id": 1,
  "instanceName": "pontual-bot",
  "apiUrl": "https://api.evolution.com",
  "phoneNumber": "5511999999999",
  "webhookUrl": "https://seu-dominio.com/api/whatsapp/webhook/pontual-bot",
  "isActive": true,
  "restrictToGroup": true,
  "allowedGroupName": "Equipe Desenvolvimento"
}
```

### 3. Atualizar Integração WhatsApp
```
PUT /api/whatsapp/integration/:id
```
**Body (JSON)**:
```json
{
  "apiUrl": "https://nova-url.com",
  "restrictToGroup": false,
  "allowedGroupName": null
}
```

### 4. Deletar Integração WhatsApp
```
DELETE /api/whatsapp/integration/:id
```

**Resposta (200)**:
```json
{
  "message": "Integração WhatsApp deletada com sucesso"
}
```

### 5. Webhook WhatsApp
```
POST /api/whatsapp/webhook/:instanceName
```
**Body (JSON)** - Formato Evolution API:
```json
{
  "event": "messages.upsert",
  "instance": "pontual-bot",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "message-id"
    },
    "message": {
      "conversation": "tarefas"
    },
    "messageTimestamp": 1672531200,
    "pushName": "João Silva"
  }
}
```

**Resposta (200)**:
```json
{
  "success": true,
  "message": "Mensagem processada com sucesso"
}
```

## Configurações de Notificação

### 1. Criar Configurações de Notificação
```
POST /api/whatsapp/notifications
```
**Body (JSON)**:
```json
{
  "dailyReport": true,
  "dailyReportTime": "18:00",
  "weeklyReport": true,
  "weeklyReportDay": "friday",
  "weeklyReportTime": "17:00",
  "deadlineReminders": true,
  "timerReminders": true
}
```

### 2. Listar Configurações de Notificação
```
GET /api/whatsapp/notifications
```

### 3. Atualizar Configurações de Notificação
```
PUT /api/whatsapp/notifications
```

## Logs do WhatsApp

### 1. Listar Logs WhatsApp
```
GET /api/whatsapp/logs?limit=50
```

**Resposta (200)**:
```json
[
  {
    "id": 1,
    "integrationId": 1,
    "messageId": "message-id-123",
    "phoneNumber": "5511999999999",
    "groupName": "Equipe Desenvolvimento",
    "message": "tarefas",
    "response": "📋 Tarefas Ativas:\n\n1. Desenvolvimento Frontend (2h30min trabalhado)",
    "success": true,
    "error": null,
    "createdAt": "2025-07-02T10:30:00.000Z"
  }
]
```

## Comandos WhatsApp Disponíveis

### Gestão de Tarefas
- `tarefas` - Listar tarefas ativas
- `nova [nome]` - Criar tarefa simples
- `nova [nome] --desc "descrição" --tempo 2h --prazo 2025-07-05 --cor verde` - Criar tarefa completa
- `concluir [tarefa]` - Finalizar tarefa
- `reabrir [tarefa]` - Reativar tarefa

### Controle de Tempo
- `iniciar [tarefa]` - Iniciar timer
- `parar [tarefa]` - Parar timer
- `pausar [tarefa]` - Pausar timer
- `retomar [tarefa]` - Retomar timer

### Lançamentos
- `lancamento [tarefa] [tempo]` - Lançar horas
- `lancar-concluir [tarefa] [tempo]` - Lançar e finalizar

### Relatórios
- `relatorio` - Relatório de hoje
- `relatorio semanal` - Relatório da semana
- `relatorio mensal` - Relatório do mês
- `status` - Status dos timers ativos

### Ajuda
- `ajuda` - Mostrar todos os comandos

## Formatos de Tempo Aceitos no WhatsApp

- **Horas:** `2h`, `1.5h`
- **Minutos:** `90min`, `30min`
- **Combinado:** `1h30min`

## Parâmetros para Criação de Tarefas Completas

### Comando: `nova [nome] --desc "descrição" --tempo 2h --prazo 2025-07-05 --cor verde`

**Parâmetros disponíveis:**
- `--desc` ou `--descricao`: Descrição detalhada da tarefa
- `--tempo` ou `--time`: Tempo estimado (formatos: 2h, 90min, 1h30min)
- `--prazo` ou `--deadline`: Data limite (formato: AAAA-MM-DD)
- `--cor` ou `--color`: Cor da tarefa (azul, verde, amarelo, vermelho, roxo)

**Exemplos:**
```
nova Reunião Cliente
nova Projeto X --desc "Desenvolvimento da API REST" --tempo 4h --cor azul
nova Entrega Final --desc "Finalizar documentação" --tempo 2h30min --prazo 2025-07-15 --cor verde
```

## Códigos de Erro WhatsApp

### 400 - Bad Request
```json
{
  "error": "Dados inválidos",
  "details": "Nome da instância é obrigatório"
}
```

### 404 - Not Found
```json
{
  "error": "Integração não encontrada"
}
```

### 500 - Internal Server Error
```json
{
  "error": "Erro interno do servidor",
  "details": "Falha ao conectar com Evolution API"
}
```

## Estrutura de Resposta dos Comandos WhatsApp

### Comando: `tarefas`
```
📋 Suas Tarefas Ativas:

1. Desenvolvimento Frontend ⏱️
   └ 2h30min trabalhadas
   ⚠️ Prazo: 03/07/2025

2. Reunião com Cliente
   └ 1h15min trabalhadas

🎯 Seleção Interativa:
• Digite 1, 2, 3... para ver ações da tarefa
• 1 iniciar - Iniciar timer da tarefa 1
• 2 concluir - Finalizar tarefa 2
• 3 lancamento 2h - Lançar tempo na tarefa 3
```

### Seleção Interativa por Número
Após listar tarefas, você pode usar:

**Comando: `1`** (ver menu da tarefa)
```
📋 Desenvolvimento Frontend
ID: 15
📝 Criar interface responsiva
⏱️ Tempo trabalhado: 2h 30min
📅 Prazo: 03/07/2025

🎯 Ações disponíveis:
• 15 iniciar - Iniciar timer
• 15 lancamento [tempo] - Lançar horas
• 15 concluir - Finalizar tarefa

💡 Exemplo: 15 lancamento 1h30min
```

**Comando: `2 iniciar`** (ação direta)
```
✅ Timer iniciado para "Reunião com Cliente"!

⏱️ Cronômetro rodando...

Use parar 16 para finalizar.
```

### Comando: `status`
```
⏱️ Status dos Timers:

🟢 Timer Ativo:
• Desenvolvimento Frontend (iniciado às 14:30)
  Tempo decorrido: 1h45min

📊 Hoje: 3h20min trabalhado
📈 Semana: 18h45min trabalhado
```

### Comando: `relatorio`
```
📊 Relatório de Hoje - 02/07/2025

⏱️ Tempo Total: 6h30min

📋 Por Tarefa:
• Desenvolvimento Frontend: 4h15min
• Reunião com Cliente: 2h15min

✅ Tarefas Concluídas: 1
🔄 Tarefas Ativas: 2
```

## Autenticação WhatsApp

A autenticação é feita via API Key da Evolution API. Cada integração deve ter sua própria API Key válida.

**Headers necessários para Evolution API:**
```
Content-Type: application/json
apikey: sua-api-key-aqui
```

## Configuração de Webhook

O webhook deve ser configurado na Evolution API apontando para:
```
https://seu-dominio.com/api/whatsapp/webhook/{instanceName}
```

**Eventos requeridos:**
- `messages.upsert`
- `send.message`

## Filtros de Grupo

Quando `restrictToGroup` é `true`:
- Bot responde apenas no grupo especificado em `allowedGroupName`
- Mensagens individuais são ignoradas
- Nome do grupo deve ser exatamente igual (case-sensitive)

Quando `restrictToGroup` é `false`:
- Bot responde em mensagens individuais
- Bot responde em qualquer grupo
- Usar com cuidado em ambientes corporativos