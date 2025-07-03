-- Migração para remover referências de user_id do sistema (single-user)
-- Remove colunas user_id das tabelas whatsapp_integrations e notification_settings

ALTER TABLE "whatsapp_integrations" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "notification_settings" DROP COLUMN IF EXISTS "user_id";

-- Remove tabela users se não estiver sendo usada
DROP TABLE IF EXISTS "users";