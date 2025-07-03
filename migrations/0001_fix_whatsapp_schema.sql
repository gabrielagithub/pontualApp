-- Migration: Fix WhatsApp Schema - Add missing columns for current implementation
-- Generated manually to fix schema mismatch between local and production

-- Add new columns required by current schema
ALTER TABLE "whatsapp_integrations" ADD COLUMN "authorized_numbers" text;
ALTER TABLE "whatsapp_integrations" ADD COLUMN "restrict_to_numbers" boolean DEFAULT true NOT NULL;
ALTER TABLE "whatsapp_integrations" ADD COLUMN "response_mode" text DEFAULT 'individual' NOT NULL;

-- Optional: Remove old unused columns (commented out for safety)
-- ALTER TABLE "whatsapp_integrations" DROP COLUMN "allowed_group_name";
-- ALTER TABLE "whatsapp_integrations" DROP COLUMN "allowed_group_jid";
-- ALTER TABLE "whatsapp_integrations" DROP COLUMN "restrict_to_group";