-- Adicionar novos campos para WhatsApp Integration
ALTER TABLE "whatsapp_integrations" ADD COLUMN "authorized_numbers" text;
ALTER TABLE "whatsapp_integrations" ADD COLUMN "restrict_to_numbers" boolean DEFAULT true NOT NULL;
ALTER TABLE "whatsapp_integrations" ADD COLUMN "response_mode" text DEFAULT 'individual' NOT NULL;

-- Remover campos antigos (opcional - pode manter para compatibilidade)
-- ALTER TABLE "whatsapp_integrations" DROP COLUMN "allowed_group_name";
-- ALTER TABLE "whatsapp_integrations" DROP COLUMN "restrict_to_group";