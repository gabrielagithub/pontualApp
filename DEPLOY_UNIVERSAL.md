# Pontual - Deploy Universal

## Visão Geral
A aplicação Pontual pode ser executada em qualquer ambiente: desenvolvimento local, servidores próprios, cloud providers (Heroku, Railway, DigitalOcean, AWS, etc.) e plataformas especializadas.

## Pré-requisitos
- Node.js 18+ 
- PostgreSQL (opcional - SQLite usado como fallback)

## Instalação Rápida

### 1. Clone e Instale
```bash
git clone <seu-repositorio>
cd pontual
npm install
```

### 2. Configure Variáveis de Ambiente
Crie um arquivo `.env` (opcional):
```bash
# Para PostgreSQL (opcional)
DATABASE_URL=postgresql://user:password@localhost/pontual

# Para produção (recomendado)
SESSION_SECRET=sua-chave-secreta-forte

# Porta personalizada (opcional)
PORT=3000
```

### 3. Execute

#### Desenvolvimento
```bash
npm run dev
```

#### Produção
```bash
# Build
./build.sh

# Iniciar
./start.sh

# Ou usando npm
npm run build
npm start
```

## Configuração por Ambiente

### Desenvolvimento Local
- **Banco**: SQLite automático (arquivo `database.sqlite`)
- **Sessões**: Memória
- **Comando**: `npm run dev`

### Produção com PostgreSQL
- **Banco**: PostgreSQL via `DATABASE_URL`
- **Sessões**: PostgreSQL
- **Comando**: `./build.sh && ./start.sh`

### Produção com SQLite
- **Banco**: SQLite persistente
- **Sessões**: Arquivo
- **Comando**: `./build.sh && ./start.sh`

## Cloud Providers

### Heroku
```bash
# Adicionar buildpacks
heroku buildpacks:set heroku/nodejs

# Configurar variáveis
heroku config:set SESSION_SECRET=sua-chave-secreta
heroku config:set DATABASE_URL=postgresql://... # se usar PostgreSQL

# Deploy
git push heroku main
```

### Railway
```bash
# Conectar projeto
railway link

# Configurar variáveis no dashboard
# - SESSION_SECRET
# - DATABASE_URL (se usar PostgreSQL)

# Deploy
railway up
```

### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: pontual
services:
- name: web
  source_dir: /
  github:
    repo: seu-usuario/pontual
    branch: main
  run_command: ./start.sh
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: SESSION_SECRET
    value: sua-chave-secreta
```

### Render
```bash
# Build Command
./build.sh

# Start Command  
./start.sh

# Environment Variables
SESSION_SECRET=sua-chave-secreta
DATABASE_URL=postgresql://... # se usar PostgreSQL
```

### AWS/Azure/GCP
A aplicação funciona em qualquer ambiente que suporte Node.js:
- AWS Elastic Beanstalk
- Azure App Service
- Google Cloud Run
- Servidores próprios com PM2

## Integração WhatsApp

### Configuração Evolution API
1. Instale Evolution API em seu servidor
2. Configure webhook apontando para: `https://seu-dominio.com/api/webhook/whatsapp`
3. Configure na interface web:
   - URL da API
   - Chave de API
   - Números autorizados

### Testando Localmente com ngrok
```bash
# Instalar ngrok
npm install -g ngrok

# Executar aplicação
npm run dev

# Em outro terminal
ngrok http 5000

# Usar URL do ngrok no webhook da Evolution API
```

## Monitoramento

### Logs
```bash
# Desenvolvimento
npm run dev

# Produção
./start.sh 2>&1 | tee pontual.log
```

### Health Check
```bash
curl https://seu-dominio.com/health
```

### PM2 (Produção)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar
pm2 start dist/index.js --name pontual

# Logs
pm2 logs pontual

# Monitorar
pm2 monit
```

## Backup e Migração

### SQLite para PostgreSQL
```bash
# Execute o script de migração
node migrate-to-postgresql.js
```

### Backup SQLite
```bash
# Backup automático em data/backups/
# Ou manual:
cp database.sqlite backup-$(date +%Y%m%d).sqlite
```

## Troubleshooting

### Problemas Comuns
1. **Porta em uso**: Mude `PORT` no .env
2. **Banco não conecta**: Verifique `DATABASE_URL`
3. **Sessões não funcionam**: Configure `SESSION_SECRET`
4. **WhatsApp não responde**: Verifique webhook e números autorizados

### Validação
```bash
# Testar build
./build.sh

# Testar conexão banco
curl http://localhost:5000/health

# Testar API
curl http://localhost:5000/api/tasks
```

## Segurança

### Variáveis Obrigatórias para Produção
- `SESSION_SECRET`: Chave forte para sessões
- `DATABASE_URL`: Se usar PostgreSQL

### Recomendações
- Use HTTPS em produção
- Configure firewall adequadamente
- Mantenha Node.js atualizado
- Configure backup automático

## Suporte
Para problemas específicos, verifique:
1. Logs da aplicação
2. Logs do servidor web
3. Conectividade com banco de dados
4. Configuração de variáveis de ambiente