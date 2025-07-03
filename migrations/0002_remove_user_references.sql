-- Migração para simplificar sistema para single-user
-- Remove colunas user_id e campos relacionados a grupos

-- Remove colunas user_id das tabelas
ALTER TABLE "whatsapp_integrations" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "notification_settings" DROP COLUMN IF EXISTS "user_id";

-- Remove apenas campos obsoletos, mantém funcionalidade de grupo
ALTER TABLE "whatsapp_integrations" DROP COLUMN IF EXISTS "allowed_group_name";
ALTER TABLE "whatsapp_integrations" DROP COLUMN IF EXISTS "restrict_to_group";

-- Adiciona campos de volta se foram removidos incorretamente
ALTER TABLE "whatsapp_integrations" 
ADD COLUMN IF NOT EXISTS "allowed_group_jid" text,
ADD COLUMN IF NOT EXISTS "response_mode" text DEFAULT 'individual';

-- Remove tabela users se não estiver sendo usada
DROP TABLE IF EXISTS "users";

-- Limpar dados antigos da tabela whatsapp_logs que podem ter estrutura obsoleta
ALTER TABLE "whatsapp_logs" DROP COLUMN IF EXISTS "message_id";
ALTER TABLE "whatsapp_logs" DROP COLUMN IF EXISTS "message_type";
ALTER TABLE "whatsapp_logs" DROP COLUMN IF EXISTS "message_content";
ALTER TABLE "whatsapp_logs" DROP COLUMN IF EXISTS "success";
ALTER TABLE "whatsapp_logs" DROP COLUMN IF EXISTS "error_message";
ALTER TABLE "whatsapp_logs" DROP COLUMN IF EXISTS "created_at";

-- Renomear timestamp para created_at se necessário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_logs' AND column_name = 'timestamp') THEN
        ALTER TABLE "whatsapp_logs" RENAME COLUMN "created_at" TO "timestamp";
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erro se coluna não existir
        NULL;
END $$;