# Migração para Sistema Single-User

Este documento explica como aplicar as mudanças para simplificar o sistema de multi-user para single-user no seu ambiente local.

## O que mudou

O sistema foi simplificado para funcionar sem conceito de usuários. As principais mudanças incluem:

- **Removida autenticação**: Não há mais necessidade de login
- **Removidas referências de usuário**: Colunas `user_id` removidas das tabelas
- **Simplificado WhatsApp**: Apenas números individuais autorizados, sem suporte a grupos
- **Limpeza de campos**: Removidos campos obsoletos relacionados a grupos

## Como aplicar no seu ambiente local

### 1. Aplicar Migração do Banco de Dados

Execute o script de migração para ajustar a estrutura do banco:

```bash
node apply-migration-local.js
```

Este script vai:
- Remover colunas `user_id` das tabelas `whatsapp_integrations` e `notification_settings`
- Remover campos relacionados a grupos: `allowed_group_jid`, `response_mode`, etc.
- Limpar estrutura da tabela `whatsapp_logs`
- Remover tabela `users` (se não estiver em uso)

### 2. Verificar Estrutura Final

Após aplicar a migração, a estrutura das tabelas principais deve estar assim:

**whatsapp_integrations:**
- id
- instance_name
- api_url
- api_key
- phone_number
- is_active
- webhook_url
- authorized_numbers
- restrict_to_numbers
- last_connection
- created_at
- updated_at

**notification_settings:**
- id
- enable_daily_report
- daily_report_time
- enable_weekly_report
- weekly_report_day
- enable_deadline_reminders
- reminder_hours_before
- enable_timer_reminders
- timer_reminder_interval
- created_at
- updated_at

## Arquivos de Migração

- **migrations/0002_remove_user_references.sql**: Migração SQL principal
- **apply-migration-local.js**: Script aplicador para ambiente local

## Benefícios da Simplificação

1. **Sem autenticação**: Acesso direto às funcionalidades
2. **Mais simples**: Menos complexidade de código e banco
3. **Foco único**: Sistema otimizado para uso individual
4. **Menos bugs**: Eliminação de pontos de falha relacionados a multi-user

## Teste após Migração

1. Acesse a aplicação
2. Teste criar/iniciar/parar timers (não deve pedir login)
3. Configure integração WhatsApp (apenas campos essenciais)
4. Verifique que tudo funciona sem autenticação

## Troubleshooting

Se encontrar erros após a migração:

1. **Verifique DATABASE_URL**: Certifique-se que aponta para seu PostgreSQL local
2. **Conferir logs**: Execute com `NODE_ENV=development` para ver logs detalhados
3. **Recriar banco**: Se necessário, pode dropar e recriar o banco, aplicando migrations do zero

## Rollback (se necessário)

Se precisar voltar atrás, você pode:
1. Restaurar backup do banco anterior à migração
2. Ou recriar banco do zero com migrations 0000 e 0001 apenas