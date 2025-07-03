# Correção do Schema WhatsApp no Render

## Problema Identificado

O erro 500 ao criar integração WhatsApp no Render ocorre porque o schema da tabela `whatsapp_integrations` está desatualizado. A migração inicial não incluiu os campos novos necessários.

## Campos Faltantes

A tabela no Render tem:
```sql
-- Campos antigos (migração inicial)
allowed_group_name text
allowed_group_jid text  
restrict_to_group boolean
```

Mas o código atual espera:
```sql
-- Campos novos (schema atual)
authorized_numbers text
restrict_to_numbers boolean
response_mode text
```

## Solução

### Opção 1: Migração Automática (Recomendado)

O sistema agora tem migração Drizzle adequada:
- Migração `0001_fix_whatsapp_schema.sql` criada
- Script `migrate.js` atualizado para aplicar automaticamente
- Fallback para migração manual se drizzle-kit falhar

**No próximo deploy do Render:**
```bash
node migrate.js
```

### Opção 2: Migração Manual

Se a migração automática falhar:
```bash
node apply-migration.js
```

### Opção 3: SQL Direto

Execute no banco PostgreSQL do Render:
```sql
ALTER TABLE whatsapp_integrations ADD COLUMN authorized_numbers text;
ALTER TABLE whatsapp_integrations ADD COLUMN restrict_to_numbers boolean DEFAULT true NOT NULL;
ALTER TABLE whatsapp_integrations ADD COLUMN response_mode text DEFAULT 'individual' NOT NULL;
```

## Verificação

Após aplicar a correção, teste criando uma nova integração WhatsApp. O erro 500 deve ser resolvido.

## Logs de Debug

O sistema agora inclui logging detalhado para diagnosticar problemas:
- Frontend: dados enviados do formulário
- Backend: validação e criação no banco
- Database: operações SQL com detalhes do erro

## Para Desenvolvedores

Esta correção resolve a incompatibilidade entre o schema definido em `shared/schema.ts` e a estrutura real da tabela no PostgreSQL do Render.