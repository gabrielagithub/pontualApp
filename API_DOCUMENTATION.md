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