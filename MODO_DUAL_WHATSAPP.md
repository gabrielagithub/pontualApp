# Sistema Dual de Resposta WhatsApp

## Comportamento Implementado

### 📱 MODO INDIVIDUAL
**Configuração**: `responseMode: "individual"`

**Validação de Entrada:**
- ✅ Aceita: Mensagens enviadas diretamente para o número da instância
- ❌ Ignora: Comandos vindos de grupos (mesmo de números autorizados)

**Destino de Resposta:**
- ✅ Sempre responde no privado do remetente autorizado
- ❌ Nunca envia para grupos

**Exemplo:**
```
Cenário: Número autorizado 5599999999999@c.us envia "tarefas" em grupo
Resultado: Sistema ignora completamente (não processa nem responde)

Cenário: Número autorizado 5599999999999@c.us envia "tarefas" diretamente
Resultado: Sistema processa e responde no privado
```

### 📢 MODO GRUPO
**Configuração**: `responseMode: "group"` + `allowedGroupJid: "120363419788242278@g.us"`

**Validação de Entrada:**
- ✅ Aceita: Comandos de números autorizados (individual OU grupo)
- ✅ Aceita: Mensagens de qualquer origem se remetente estiver na lista

**Destino de Resposta:**
- ✅ Responde APENAS no grupo configurado (`allowedGroupJid`)
- ❌ Nunca envia para grupos diferentes
- ❌ Se `allowedGroupJid` não configurado, não envia para nenhum grupo

**Exemplo:**
```
Cenário: Número autorizado envia "tarefas" em qualquer lugar
Resultado: Sistema responde no grupo configurado (120363419788242278@g.us)

Cenário: Tentativa de envio para grupo diferente
Resultado: BLOQUEADO com log de segurança
```

## Validações de Segurança

### ⛔ BLOQUEIOS ABSOLUTOS

1. **Grupos não configurados**
   - Se modo grupo ativo mas sem JID: BLOQUEIA tudo

2. **Grupos não autorizados**
   - Se destino for grupo diferente do configurado: BLOQUEIA com log

3. **Modo individual + grupo**
   - Se modo individual e destino for grupo: BLOQUEIA com log

4. **Números não autorizados**
   - Se remetente não estiver na lista: BLOQUEIA

### 🔒 LOGS DE SEGURANÇA

Todos os bloqueios são registrados:
- `BLOCKED_NO_GROUP_CONFIGURED`
- `BLOCKED_UNAUTHORIZED_GROUP`
- `BLOCKED_GROUP_IN_INDIVIDUAL_MODE`

## Interface de Configuração

**Campo "Modo de Resposta":**
- Individual: Resposta privada para cada usuário
- Grupo: Resposta no grupo configurado

**Campo "JID do Grupo":**
- Aparece apenas se modo "Grupo" selecionado
- Formato: `120363419788242278@g.us`
- Obrigatório no modo grupo

**Campo "Números Autorizados":**
- Funciona nos dois modos
- Lista quem pode enviar comandos
- Formato: `["5599999999999@c.us"]`

## Resumo das Regras

| Modo | Origem da Mensagem | Destino da Resposta | Status |
|------|-------------------|-------------------|---------|
| Individual | Direta autorizada | Privado remetente | ✅ Processa |
| Individual | Grupo (mesmo autorizado) | - | ❌ Ignora |
| Grupo | Qualquer (se autorizado) | Grupo configurado | ✅ Processa |
| Grupo | Não autorizado | - | ❌ Bloqueia |

**Garantia de Segurança**: Sistema NUNCA enviará para grupo não configurado.