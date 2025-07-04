# Configuração de Banco de Dados - Pontual

## Visão Geral

O sistema Pontual foi configurado para funcionar com PostgreSQL em produção e detectar automaticamente problemas de conectividade em desenvolvimento.

## Configuração Atual

### Detecção Automática de Ambiente

O sistema detecta automaticamente:

- **Produção**: Quando `NODE_ENV=production` ou `RENDER=true`
- **Desenvolvimento**: Quando não está em produção
- **Tipo de Banco**: Neon vs PostgreSQL padrão

### Estratégia de Persistência Garantida

### Detecção de Ambiente

```javascript
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.DOCKER;
const isReplit = !!process.env.REPL_ID;
const isNeonHibernating = isNeonDatabase && !isProduction && isReplit;

// RENDER/DOCKER: SEMPRE PostgreSQL (dados persistidos)
if (isProduction) {
  storage = new DatabaseStorage(); // ✅ DADOS PERSISTIDOS
}

// REPLIT DESENVOLVIMENTO: Fallback apenas se Neon hibernando
else if (isNeonHibernating) {
  storage = new MemStorage(); // ⚠️ Temporário APENAS no Replit dev
}

// DESENVOLVIMENTO LOCAL: PostgreSQL
else {
  storage = new DatabaseStorage(); // ✅ DADOS PERSISTIDOS
}
```

### Garantias de Persistência

✅ **Render**: SEMPRE PostgreSQL - dados persistidos
✅ **Docker**: SEMPRE PostgreSQL - dados persistidos  
✅ **Desenvolvimento Local**: PostgreSQL - dados persistidos
⚠️ **Replit Dev**: MemStorage se Neon hibernando (temporário)

### Logs de Confirmação

O sistema mostra claramente onde os dados são persistidos:

```
🐘 Produção (Render/Docker): Usando PostgreSQL obrigatoriamente
📊 Dados serão persistidos no banco PostgreSQL
```

## Configuração para Render (Produção)

### 1. Configurar PostgreSQL no Render

1. No painel do Render, vá em "New" → "PostgreSQL"
2. Configure um nome para o banco (ex: `pontual-postgres`)
3. Anote as credenciais geradas

### 2. Configurar Variáveis de Ambiente

No seu serviço web no Render, configure:

```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
NODE_ENV=production
```

### 3. Build Commands

No arquivo `render.yaml` ou configuração do serviço:

```yaml
services:
  - type: web
    name: pontual-app
    env: node
    buildCommand: npm install && npm run build && node migrate.js
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: pontual-postgres
          property: connectionString
```

## Configuração para Docker

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/pontual
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=pontual
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## Configuração Local

### 1. PostgreSQL Local

```bash
# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Configurar banco
sudo -u postgres createdb pontual
sudo -u postgres psql -c "CREATE USER pontual WITH PASSWORD 'pontual';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pontual TO pontual;"

# Configurar variável
export DATABASE_URL="postgresql://pontual:pontual@localhost:5432/pontual"
```

### 2. Executar Migrations

```bash
npm run db:push
```

## Resolução de Problemas

### Neon Hibernando

**Sintoma**: "endpoint is disabled" em desenvolvimento

**Solução**: O sistema usa MemStorage automaticamente como fallback.

**Para corrigir permanentemente**:
1. Configure PostgreSQL dedicado no Render
2. Ou use PostgreSQL local para desenvolvimento

### Erro de Conexão

**Sintoma**: "Failed to connect" ou timeouts

**Verificações**:
1. DATABASE_URL está correta?
2. Banco está rodando?
3. Firewall/SSL configurado?

### Schema Desatualizado

**Sintoma**: Erros de coluna/tabela não encontrada

**Solução**:
```bash
# Aplicar migrations
npm run db:push

# Ou executar script de correção
node migrate.js
```

## Logs de Detecção

O sistema mostra logs detalhados na inicialização:

```
🔍 Detectando ambiente:
- Produção: ✅ Sim / ❌ Não (desenvolvimento)
- DATABASE_URL: ✅ Configurado / ❌ Não configurado
- Tipo de banco: Neon / PostgreSQL padrão

⚠️  Banco Neon detectado hibernando em desenvolvimento
💾 Usando MemStorage temporariamente
💡 Para produção: configure PostgreSQL dedicado no Render
```

## Funcionalidades WhatsApp

O sistema WhatsApp funciona independente do tipo de storage:

- **MemStorage**: Dados temporários (reinicia quando servidor reinicia)
- **PostgreSQL**: Dados persistentes (recomendado para produção)

## Status Atual

✅ **Funcionando**: Sistema detecta automaticamente ambiente e configura storage apropriado

✅ **Produção**: Pronto para deploy no Render com PostgreSQL

✅ **Desenvolvimento**: Funciona com fallback inteligente quando banco não disponível

✅ **WhatsApp**: Integração funcional em ambos os modes de storage