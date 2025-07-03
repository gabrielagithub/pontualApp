-- Script de inicialização do banco PostgreSQL para Docker
-- Este arquivo é executado automaticamente quando o container PostgreSQL é criado

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- O banco 'pontual' já é criado automaticamente pelo docker-compose
-- As tabelas serão criadas pelas migrations do Drizzle