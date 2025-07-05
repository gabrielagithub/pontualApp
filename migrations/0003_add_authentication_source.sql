-- Migration: Adicionar autenticação e campo de origem
-- Adiciona tabela de usuários e campo de origem nas tarefas

-- 1. Criar tabela de usuários
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"full_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"api_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_api_key_unique" UNIQUE("api_key")
);

-- 2. Criar usuário padrão do sistema
INSERT INTO "users" ("username", "password", "email", "full_name", "api_key") 
VALUES (
	'admin', 
	'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: admin123
	'admin@pontual.local',
	'Administrador do Sistema',
	'pont_' || encode(gen_random_bytes(32), 'hex')
) ON CONFLICT (username) DO NOTHING;

-- 3. Adicionar campos às tabelas existentes
ALTER TABLE "tasks" 
ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'sistema' NOT NULL,
ADD COLUMN IF NOT EXISTS "user_id" integer;

ALTER TABLE "task_items" 
ADD COLUMN IF NOT EXISTS "user_id" integer;

ALTER TABLE "time_entries" 
ADD COLUMN IF NOT EXISTS "user_id" integer;

-- 4. Atualizar registros existentes com usuário padrão
UPDATE "tasks" 
SET "user_id" = (SELECT id FROM "users" WHERE username = 'admin' LIMIT 1)
WHERE "user_id" IS NULL;

UPDATE "task_items" 
SET "user_id" = (SELECT id FROM "users" WHERE username = 'admin' LIMIT 1)
WHERE "user_id" IS NULL;

UPDATE "time_entries" 
SET "user_id" = (SELECT id FROM "users" WHERE username = 'admin' LIMIT 1)
WHERE "user_id" IS NULL;

-- 5. Tornar user_id obrigatório após atualização
ALTER TABLE "tasks" 
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "task_items" 
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "time_entries" 
ALTER COLUMN "user_id" SET NOT NULL;

-- 6. Adicionar foreign keys
ALTER TABLE "tasks" 
ADD CONSTRAINT "tasks_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "task_items" 
ADD CONSTRAINT "task_items_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "time_entries" 
ADD CONSTRAINT "time_entries_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS "tasks_user_id_idx" ON "tasks" ("user_id");
CREATE INDEX IF NOT EXISTS "tasks_source_idx" ON "tasks" ("source");
CREATE INDEX IF NOT EXISTS "task_items_user_id_idx" ON "task_items" ("user_id");
CREATE INDEX IF NOT EXISTS "time_entries_user_id_idx" ON "time_entries" ("user_id");