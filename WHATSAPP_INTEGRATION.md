# WhatsApp Integration - Pontual App

## Visão Geral

Sistema de integração WhatsApp via Evolution API que permite controlar tarefas e timers através de mensagens. Oferece dois modos de operação para máxima segurança e flexibilidade.

## Configuração da Evolution API

### Pré-requisitos
1. Instância Evolution API ativa
2. WhatsApp conectado à instância
3. API Key da instância

### Configuração no Pontual
1. Acesse `/whatsapp` na aplicação
2. Preencha os dados da Evolution API:
   - **Nome da Instância**: Nome configurado na Evolution API
   - **URL da API**: URL base da sua Evolution API
   - **API Key**: Chave de acesso da instância
   - **Número do WhatsApp**: Número conectado (apenas números)
   - **Webhook URL**: Gerada automaticamente (`/api/whatsapp/webhook/`)

## Modos de Operação

### 📱 Modo Individual
**Configuração**: `responseMode: "individual"`

**Comportamento:**
- ✅ Aceita apenas mensagens enviadas diretamente para o número da instância
- ❌ Ignora completamente comandos vindos de grupos (mesmo de números autorizados)
- ✅ Responde sempre no privado do remetente

**Uso típico**: Controle pessoal individual

### 📢 Modo Grupo
**Configuração**: `responseMode: "group"` + JID do grupo

**Comportamento:**
- ✅ Aceita comandos de números autorizados (individual ou grupo)
- ✅ Responde APENAS no grupo configurado
- ❌ Nunca envia para grupos diferentes do configurado
- ❌ Se JID não configurado, não envia para grupos

**Uso típico**: Equipes/grupos de trabalho

## Controle de Acesso

### Números Autorizados
Configure no formato JSON:
```json
["5599999999999@c.us", "5588888888888@c.us"]
```

**Regras:**
- Formato obrigatório: DDD + número + @c.us
- Apenas números da lista podem enviar comandos
- Lista vazia = sistema bloqueado

### JID do Grupo (modo grupo)
- Formato: `120363419788242278@g.us`
- Obtenha através dos logs do webhook
- Obrigatório no modo grupo

## Comandos Disponíveis

### Comandos Básicos
- `ajuda` - Lista todos os comandos disponíveis
- `tarefas` - Lista tarefas ativas
- `status` - Status dos timers ativos

### Gestão de Tarefas
- `nova [nome]` - Cria tarefa simples
- `nova [nome] --desc [descrição] --tempo [horas] --prazo [data] --cor [cor]` - Cria tarefa completa
- `[número] concluir` - Marca tarefa como concluída
- `[número] reabrir` - Reabre tarefa concluída

### Controle de Timer
- `[número] iniciar` - Inicia timer da tarefa
- `[número] parar` - Para timer da tarefa
- `pausar [nome/número]` - Pausa timer ativo
- `retomar [nome/número]` - Retoma timer pausado

### Apontamento Manual
- `[número] apontar [tempo]` - Registra tempo trabalhado
- `[número] apontar-concluir [tempo]` - Registra tempo e conclui tarefa

### Relatórios
- `resumo` - Relatório do dia atual
- `resumo semanal` - Relatório da semana
- `resumo mensal` - Relatório do mês

## Fluxo Interativo

1. **Listar tarefas**: `tarefas`
2. **Selecionar por número**: `1`, `2`, `3`...
3. **Menu da tarefa**: Mostra opções disponíveis
4. **Executar ação**: `iniciar`, `parar`, `apontar 2h`, etc.

## Validações de Segurança

### Bloqueios Automáticos
- Números não autorizados
- Grupos não configurados (modo grupo)
- Grupos diferentes do configurado
- Mensagens de grupo no modo individual

### Logs de Segurança
Todos os bloqueios são registrados:
- `BLOCKED_UNAUTHORIZED_NUMBER`
- `BLOCKED_NO_GROUP_CONFIGURED`
- `BLOCKED_UNAUTHORIZED_GROUP`
- `BLOCKED_GROUP_IN_INDIVIDUAL_MODE`

## Webhook da Evolution API

### Configuração
1. No Evolution API, configure o webhook:
   ```
   POST /webhook/set/{instance}
   {
     "url": "https://seu-dominio.com/api/whatsapp/webhook/",
     "events": ["message.received"]
   }
   ```

### Estrutura da Mensagem
```json
{
  "data": {
    "message": {
      "conversation": "texto da mensagem"
    },
    "participant": "5599999999999@c.us",
    "key": {
      "remoteJid": "120363419788242278@g.us"
    }
  }
}
```

## API Endpoints

### Configuração
- `GET /api/whatsapp/integration/{userId}` - Obter configuração
- `POST /api/whatsapp/integration` - Criar configuração
- `PUT /api/whatsapp/integration/{id}` - Atualizar configuração

### Webhook
- `POST /api/whatsapp/webhook/` - Receber mensagens da Evolution API

### Logs
- `GET /api/whatsapp/logs` - Obter logs de atividade

## Exemplos de Uso

### Criação de Tarefa Avançada
```
nova Desenvolvimento API --desc "Implementar endpoints REST" --tempo 8 --prazo 2025-07-10 --cor azul
```

### Controle de Timer
```
Usuario: tarefas
Bot: 1. Desenvolvimento API (0h trabalhadas)
     2. Testes unitários (2h trabalhadas)

Usuario: 1
Bot: [Menu da tarefa com opções]

Usuario: iniciar
Bot: ✅ Timer iniciado para "Desenvolvimento API"
```

### Apontamento Manual
```
Usuario: 2 apontar 1h30min
Bot: ✅ 1h 30min registradas para "Testes unitários"
```

## Troubleshooting

### Problemas Comuns
1. **Bot não responde**: Verificar se número está autorizado
2. **Comando ignorado**: Verificar modo (individual vs grupo)
3. **Erro de configuração**: Verificar API Key e URL
4. **Webhook não funciona**: Verificar URL do webhook na Evolution API

### Verificação de Logs
Acesse `/whatsapp` → aba "Logs" para verificar:
- Mensagens recebidas
- Comandos processados
- Bloqueios de segurança
- Erros de API

## Formatos Suportados

### Tempo
- `2h`, `30min`, `1h30min`, `90min`

### Data (prazo)
- `2025-07-10`, `10/07/2025`

### Cores
- `azul`, `verde`, `amarelo`, `vermelho`, `roxo`
- Ou códigos hex: `#FF0000`

## Segurança

### Princípios
- **Nunca** enviar para grupo não configurado
- **Nunca** processar comando de número não autorizado
- **Sempre** validar destino antes de enviar
- **Sempre** registrar tentativas de acesso não autorizado

### Configuração Recomendada
1. Use números fictícios para testes
2. Configure JID específico para grupos
3. Mantenha lista de números atualizada
4. Monitore logs regularmente