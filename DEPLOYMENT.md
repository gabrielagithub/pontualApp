# Pontual App - Deployment Guide

## Deploy no Render

### Configuração Automática
O projeto está configurado para deploy automático no Render com PostgreSQL.

**Arquivos de configuração:**
- `render.yaml` - Configuração do serviço
- `migrate.js` - Script de migração automática
- `build.sh` / `start.sh` - Scripts universais

### Processo de Deploy
1. **Build**: `npm install && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && node migrate.js`
2. **Migrations**: Executadas automaticamente se `DATABASE_URL` disponível
3. **Start**: `npm start` (executa `dist/index.js`)

### Variáveis de Ambiente
```
NODE_ENV=production
DATABASE_URL=[Fornecida pelo Render PostgreSQL]
SESSION_SECRET=[Gerar chave segura]
```

### Dependências Críticas
- `vite` e `drizzle-kit` como dependências principais (não dev)
- PostgreSQL via `@neondatabase/serverless`
- Todas as dependências listadas em `package.json`

## Deploy Universal (Outros Provedores)

### Heroku
```bash
# Adicionar buildpack Node.js
heroku buildpacks:set heroku/nodejs

# Configurar variáveis
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=sua-chave-secreta

# Deploy
git push heroku main
```

### Railway
```bash
# Conectar repositório GitHub
# Configurar variáveis de ambiente no dashboard
# Deploy automático via Git
```

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### AWS/Azure/GCP
Use os scripts universais `build.sh` e `start.sh` que funcionam em qualquer ambiente com Node.js.

## Banco de Dados

### PostgreSQL (Produção)
- Automaticamente detectado via `DATABASE_URL`
- Migrations executadas via Drizzle
- Schema em `shared/schema.ts`

### SQLite (Desenvolvimento)
- Usado automaticamente se `DATABASE_URL` não disponível
- Arquivo: `data/database.sqlite`
- Backups automáticos em `data/backups/`

## Scripts de Build

### build.sh (Universal)
```bash
#!/bin/bash
npm install
npx vite build
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

### start.sh (Universal)
```bash
#!/bin/bash
if [ -n "$DATABASE_URL" ]; then
  node migrate.js
fi
node dist/index.js
```

## Troubleshooting

### Problemas Comuns

**1. Build failure: "vite: not found"**
- Solução: vite adicionado como dependência principal

**2. Migration failure: "Cannot find module 'drizzle-kit'"**
- Solução: drizzle-kit adicionado como dependência principal

**3. Server não inicia: "dist/index.js not found"**
- Verificar se build foi executado corretamente
- Verificar estrutura de arquivos após build

**4. Database connection error**
- Verificar `DATABASE_URL` configurada corretamente
- Verificar se PostgreSQL está disponível

### Logs de Debug
- Render: Dashboard → Logs
- Heroku: `heroku logs --tail`
- Railway: Dashboard → Deployments → Logs

## Health Check

Endpoint disponível: `GET /health`
```json
{
  "status": "ok",
  "database": "connected",
  "uptime": "2h 30m"
}
```

## Monitoramento

### Métricas Importantes
- Response time das APIs
- Conexões de banco
- Uso de memória
- Logs de erro

### Alertas Recomendados
- API response time > 2s
- Error rate > 5%
- Database connection failures
- Memory usage > 80%

## Rollback

### Render
- Use o dashboard para reverter para deploy anterior
- Ou faça novo commit com correção

### Heroku
```bash
heroku releases:rollback v[número]
```

### Outros
- Reverta commit no Git
- Ou faça deploy com tag anterior

## Performance

### Otimizações Aplicadas
- Frontend: Vite build otimizado
- Backend: ESBuild bundle único
- Database: Connection pooling
- Static files: Servidos via Express

### Monitoramento
- Use ferramentas como New Relic, DataDog
- Configure alertas de performance
- Monitore uso de recursos

## Segurança

### Configurações de Produção
- `NODE_ENV=production`
- Session secrets aleatórios
- HTTPS obrigatório
- Headers de segurança configurados

### Variáveis Sensíveis
- Nunca commitar API keys
- Usar variáveis de ambiente
- Rotacionar secrets regularmente