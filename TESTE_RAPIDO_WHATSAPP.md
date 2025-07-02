# 🚀 Teste Rápido WhatsApp - 5 Minutos

## Sequência de Comandos para Testar Agora

### 1. Verificar Sistema (30 segundos)
```
ajuda
```
**Esperado:** Lista completa de comandos com formatação

### 2. Criar Tarefas (1 minuto)
```
nova Teste Básico
nova Projeto Avançado --desc "Teste completo" --tempo 2h --cor verde
```
**Esperado:** 2 tarefas criadas com confirmação

### 3. Testar Seleção Interativa (2 minutos)
```
tarefas
```
**Esperado:** Lista numerada com instruções de seleção

Depois:
```
1
```
**Esperado:** Menu detalhado da primeira tarefa

Depois:
```
2 iniciar
```
**Esperado:** Timer iniciado na segunda tarefa

### 4. Controlar Tempo (1 minuto)
```
status
```
**Esperado:** Status com timer ativo

```
2 parar
```
**Esperado:** Timer parado com duração

### 5. Lançar Tempo (30 segundos)
```
1 lancamento 30min
```
**Esperado:** Tempo adicionado à primeira tarefa

### 6. Validar Resultado Final
```
tarefas
relatorio
```
**Esperado:** Lista atualizada com tempos e relatório do dia

---

## ✅ Checklist Rápido
- [ ] Bot responde a todos comandos
- [ ] Seleção por números funciona
- [ ] Timer inicia/para corretamente
- [ ] Tempo é lançado e calculado
- [ ] Relatórios mostram dados corretos

## 🐛 Se Algo Der Errado
1. **Bot não responde:** Verificar webhook na interface web
2. **Comando não reconhecido:** Tentar `ajuda` primeiro
3. **Seleção numérica falha:** Listar tarefas novamente com `tarefas`

---

**Tempo estimado:** 5 minutos
**Comandos testados:** 9 comandos essenciais
**Recursos validados:** Criação, seleção, timer, lançamento, relatórios