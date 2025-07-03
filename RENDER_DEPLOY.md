# Guia de Deploy no Render - Pontual

## 1. Preparação do Projeto

### Build Scripts
O projeto já está configurado com os scripts necessários no `package.json`:
```json
{
  "scripts": {
    "build": "npm run build:server && npm run build:client",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js --external:better-sqlite3",
    "build:client": "vite build",
    "start": "node dist/server.js",
    "migrate": "tsx scripts/migrate.js"
  }
}
```

## 2. Configuração do Banco PostgreSQL no Render

### Passo 1: Criar PostgreSQL Database
1. No dashboard do Render, clique em **"New +"**
2. Selecione **"PostgreSQL"**
3. Configure:
   - **Name**: `pontual-db`
   - **Database**: `pontual`
   - **User**: `pontual_user`
   - **Region**: Escolha a mesma região do seu web service
   - **PostgreSQL Version**: 15 (recomendado)
   - **Plan**: Free (para desenvolvimento) ou Starter (para produção)

4. Clique em **"Create Database"**

### Passo 2: Obter Connection String
Após criar o banco, na página do database:
1. Vá para **"Connections"**
2. Copie a **"External Database URL"**
3. Formato: `postgresql://user:password@host:port/database`

## 3. Deploy do Web Service

### Passo 1: Criar Web Service
1. No dashboard do Render, clique em **"New +"**
2. Selecione **"Web Service"**
3. Conecte seu repositório GitHub

### Passo 2: Configurar Build & Deploy
```yaml
# Configurações do Web Service
Name: pontual-app
Environment: Node
Region: [mesma região do banco]
Branch: main
Build Command: npm install && npm run build && npm run migrate
Start Command: npm start
```

### Passo 3: Variáveis de Ambiente
Adicione as seguintes variáveis no Render:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production

# Session (gere uma chave segura)
SESSION_SECRET=sua_chave_secreta_super_segura_aqui

# WhatsApp (opcional - configurar depois)
WHATSAPP_API_URL=https://evolution-api.com
WHATSAPP_API_KEY=sua_chave_evolution_api
```

## 4. Configuração Avançada

### Auto-Deploy
- Habilite **"Auto-Deploy"** para deployar automaticamente quando você fizer push para a branch principal

### Health Check
O Render verifica automaticamente se o serviço está funcionando na porta configurada (5000).

### Custom Domain (Opcional)
Se você tem um domínio próprio:
1. Vá para **"Settings"** > **"Custom Domains"**
2. Adicione seu domínio
3. Configure os registros DNS conforme instruído

## 5. Scripts de Deploy Automático

### Build Script com Migração
O comando de build já inclui a migração:
```bash
npm install && npm run build && npm run migrate
```

### Verificação de Saúde
Adicione ao `server/index.ts`:
```typescript
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'
  });
});
```

## 6. Monitoramento

### Logs
- Acesse **"Logs"** no dashboard do Render para ver logs em tempo real
- Logs incluem informações de build, deploy e runtime

### Métricas
- **"Metrics"** mostra CPU, memória e tráfego
- Configure alertas se necessário

## 7. Solução de Problemas

### Build Falha
```bash
# Verifique se todas as dependências estão no package.json
npm install
npm run build

# Se migration falhar, execute manualmente:
npm run migrate
```

### Problemas de Conexão com DB
1. Verifique se a `DATABASE_URL` está correta
2. Confirme que o banco está na mesma região
3. Teste a conexão local primeiro

### Variáveis de Ambiente
- Todas as variáveis são sensíveis a maiúsculas/minúsculas
- Reinicie o serviço após alterar variáveis

## 8. Configuração de Produção

### Performance
```env
# Adicione essas variáveis para produção
NODE_ENV=production
WEB_CONCURRENCY=2
```

### Segurança
- Use HTTPS (automático no Render)
- Configure SESSION_SECRET forte
- Limite CORS se necessário

## 9. Backup e Manutenção

### Backup PostgreSQL
O Render faz backup automático do PostgreSQL:
- **Free tier**: 7 dias de retenção
- **Paid tiers**: 30+ dias de retenção

### Atualizações
1. Faça push das mudanças para GitHub
2. O Render fará deploy automaticamente
3. Migrations são executadas automaticamente

## 10. Custos Estimados

### Desenvolvimento (Free Tier)
- **Web Service**: Gratuito (com limitações)
- **PostgreSQL**: Gratuito (1GB, expires em 90 dias)

### Produção (Paid Plans)
- **Web Service Starter**: $7/mês
- **PostgreSQL Starter**: $7/mês
- **Total**: ~$14/mês

## Comandos Úteis

```bash
# Build local para testar
npm run build

# Testar migrations
npm run migrate

# Verificar variáveis de ambiente
echo $DATABASE_URL

# Logs em produção
render logs --service=pontual-app
```

## Links Importantes

- [Documentação Render PostgreSQL](https://render.com/docs/databases)
- [Deploy Node.js no Render](https://render.com/docs/deploy-node-express-app)
- [Configurar Variáveis de Ambiente](https://render.com/docs/environment-variables)