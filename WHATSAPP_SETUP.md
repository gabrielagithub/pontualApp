# Configuração Manual - Integração WhatsApp com Evolution API

## Visão Geral

Este guia detalha como configurar manualmente a integração entre o Pontual e a Evolution API para controlar tarefas e tempo via WhatsApp.

## Pré-requisitos

1. **Evolution API instalada e funcionando**
2. **WhatsApp conectado na Evolution API**
3. **Acesso ao painel admin da Evolution API**
4. **Aplicação Pontual rodando**

## Passo 1: Configurar Evolution API

### 1.1 Criar Instância

1. Acesse o painel da Evolution API
2. Vá em **Instâncias** → **Criar Nova Instância**
3. Defina um nome para a instância (ex: `pontual-bot`)
4. Anote a **API Key** gerada
5. Conecte seu WhatsApp escaneando o QR Code

### 1.2 Configurar Webhook

1. Na sua instância, vá em **Configurações** → **Webhook**
2. Configure a URL do webhook:
   ```
   https://seu-dominio.com/api/whatsapp/webhook/pontual-bot
   ```
   _(Substitua `seu-dominio.com` pelo seu domínio e `pontual-bot` pelo nome da sua instância)_

3. Marque os eventos:
   - ✅ `messages.upsert`
   - ✅ `send.message`

4. Salve as configurações

## Passo 2: Configurar no Pontual

### 2.1 Acessar Configurações

1. Abra o Pontual no navegador
2. Faça login com suas credenciais
3. Vá no menu **WhatsApp** (ícone de celular)
4. Clique na aba **Configuração**

### 2.2 Preencher Dados da Evolution API

**Campos obrigatórios:**

| Campo | Valor | Exemplo |
|-------|--------|---------|
| Nome da Instância | Nome da instância criada | `pontual-bot` |
| URL da Evolution API | URL base da sua Evolution API | `https://api.evolution.com` |
| API Key | Chave gerada pela Evolution API | `B6D9F2A1-1234-5678-9ABC-DEF123456789` |
| Número do WhatsApp | Número conectado (apenas números) | `5511999999999` |

**URL do Webhook:** (preenchida automaticamente)
```
https://seu-dominio.com/api/whatsapp/webhook/pontual-bot
```

### 2.3 Configurar Filtro de Grupo (Opcional)

Se quiser que o bot responda apenas em um grupo específico:

1. Marque **Restringir a Grupo Específico**
2. Digite o **nome exato do grupo** (case-sensitive)
3. Exemplo: `Equipe Desenvolvimento`

**⚠️ Importante:** O nome deve ser exatamente igual ao nome do grupo no WhatsApp.

### 2.4 Salvar Configurações

1. Clique em **Criar Integração**
2. Aguarde confirmação de sucesso
3. Verifique se o status mostra **Ativo**

## Passo 3: Configurar Notificações (Opcional)

### 3.1 Acessar Configurações de Notificação

1. Vá na aba **Notificações**
2. Configure os relatórios automáticos:

**Relatório Diário:**
- Marque **Relatório Diário**
- Defina o horário (ex: 18:00)

**Relatório Semanal:**
- Marque **Relatório Semanal**
- Escolha o dia da semana (ex: Sexta-feira)

**Lembretes:**
- **Lembretes de Prazo:** Avisos sobre tarefas próximas do vencimento
- **Lembretes de Timer:** Avisos sobre timers ativos há muito tempo

### 3.2 Salvar Notificações

1. Clique em **Criar Configurações**
2. Aguarde confirmação

## Passo 4: Testar Integração

### 4.1 Teste Básico

Envie no WhatsApp (individual ou grupo configurado):
```
ajuda
```

**Resposta esperada:** Lista completa de comandos disponíveis.

### 4.2 Teste de Criação de Tarefa

```
nova Teste de Integração
```

**Resposta esperada:** Confirmação de criação da tarefa com ID.

### 4.3 Teste de Lista de Tarefas

```
tarefas
```

**Resposta esperada:** Lista das tarefas ativas.

### 4.4 Teste de Timer

```
iniciar 1
```

**Resposta esperada:** Confirmação de início do timer.

## Comandos Disponíveis

### 📋 Gestão de Tarefas
- `tarefas` - Listar tarefas ativas
- `nova [nome]` - Criar nova tarefa
- `concluir [tarefa]` - Finalizar tarefa
- `reabrir [tarefa]` - Reativar tarefa concluída

### ⏱️ Controle de Tempo
- `iniciar [tarefa]` - Iniciar timer
- `parar [tarefa]` - Parar timer
- `pausar [tarefa]` - Pausar timer
- `retomar [tarefa]` - Retomar timer

### 📝 Lançamentos
- `lancamento [tarefa] [tempo]` - Lançar horas
- `lancar-concluir [tarefa] [tempo]` - Lançar e finalizar

### 📊 Relatórios
- `relatorio` - Relatório de hoje
- `relatorio semanal` - Relatório da semana
- `relatorio mensal` - Relatório do mês
- `status` - Status dos timers ativos

### ❓ Ajuda
- `ajuda` - Mostrar todos os comandos

## Formatos Aceitos

### Identificação de Tarefas
- **ID numérico:** `iniciar 1`
- **Nome parcial:** `iniciar Reunião`

### Formatos de Tempo
- **Horas:** `2h`, `1.5h`
- **Minutos:** `90min`, `30min`
- **Combinado:** `1h30min`

## Exemplos Práticos

### Fluxo Completo de Trabalho

1. **Criar tarefa:**
   ```
   nova Desenvolver nova funcionalidade
   ```

2. **Listar tarefas:**
   ```
   tarefas
   ```

3. **Iniciar timer:**
   ```
   iniciar 2
   ```

4. **Verificar status:**
   ```
   status
   ```

5. **Parar timer e finalizar:**
   ```
   concluir 2
   ```

### Lançamento Rápido

```
lancar-concluir Reunião com cliente 2h
```

Isso vai:
- Lançar 2 horas na tarefa "Reunião com cliente"
- Marcar a tarefa como concluída

## Troubleshooting

### Problema: Bot não responde

**Verificações:**
1. ✅ Evolution API está online?
2. ✅ WhatsApp está conectado?
3. ✅ Webhook está configurado corretamente?
4. ✅ URL do webhook está acessível?
5. ✅ Dados no Pontual estão corretos?

**Solução:**
- Verifique os logs na aba **Logs** do Pontual
- Teste o webhook manualmente com ferramenta como Postman

### Problema: Bot responde mas comandos não funcionam

**Verificações:**
1. ✅ Comandos estão corretos?
2. ✅ Existe tarefas ativas?
3. ✅ IDs das tarefas estão corretos?

**Solução:**
- Use `tarefas` para verificar IDs corretos
- Use `ajuda` para ver comandos disponíveis

### Problema: Bot responde em todos os grupos

**Solução:**
1. Ative **Restringir a Grupo Específico**
2. Configure o nome exato do grupo
3. Teste enviando mensagem no grupo correto

### Problema: Notificações não chegam

**Verificações:**
1. ✅ Configurações de notificação estão salvas?
2. ✅ Horários estão corretos?
3. ✅ Integration está ativa?

## Logs e Monitoramento

### Acessar Logs

1. Vá na aba **Logs** no Pontual
2. Visualize as últimas interações
3. Verifique sucessos e erros

### Interpretação dos Logs

- ✅ **Sucesso:** Comando processado corretamente
- ❌ **Erro:** Problema na execução do comando
- 📱 **Webhook:** Mensagem recebida da Evolution API

## Segurança

### Boas Práticas

1. **API Key:** Mantenha em local seguro, não compartilhe
2. **Webhook:** Use HTTPS sempre
3. **Grupo:** Configure filtro para evitar uso indevido
4. **Logs:** Monitore regularmente para detectar uso suspeito

### Configurações Recomendadas

- ✅ Usar filtro de grupo para ambientes corporativos
- ✅ Configurar notificações apenas para administradores
- ✅ Revisar logs semanalmente
- ✅ Manter Evolution API atualizada

## Suporte

### Logs para Suporte

Se precisar de ajuda, forneça:

1. **Logs do Pontual** (aba Logs)
2. **Logs da Evolution API**
3. **Configurações usadas** (sem API Key)
4. **Comandos testados**
5. **Respostas recebidas**

### Recursos Adicionais

- **Evolution API Docs:** [Documentação oficial](https://doc.evolution-api.com)
- **WhatsApp Business API:** [Documentação do WhatsApp](https://developers.facebook.com/docs/whatsapp)

---

**📝 Última atualização:** julho de 2025
**✅ Versão:** 1.0
**🔧 Compatível com:** Evolution API v1.x, Pontual v1.x