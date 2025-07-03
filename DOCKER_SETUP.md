# 🐳 Docker Setup - Pontual App

## Pré-requisitos

1. **Docker Desktop** instalado e rodando
   - [Download para Windows/Mac](https://www.docker.com/products/docker-desktop/)
   - Linux: `sudo apt install docker.io docker-compose`

2. **Git** para clonar o repositório

## Instalação Rápida

### 1. Clonar o repositório
```bash
git clone https://github.com/gabrielagithub/pontualApp.git
cd pontualApp
```

### 2. Iniciar com script automático
```bash
./docker-start.sh --clean
```

**Primeira execução sempre usar `--clean` para garantir build completo.**

### 3. Acessar a aplicação
- **Frontend**: http://localhost:3000
- **Banco PostgreSQL**: localhost:5432

## Comandos Manuais

### Iniciar serviços
```bash
docker-compose up --build -d
```

### Ver logs em tempo real
```bash
docker-compose logs -f
```

### Parar serviços
```bash
docker-compose down
```

### Reiniciar limpo (remove dados)
```bash
./docker-start.sh --clean
```

## Estrutura dos Containers

### 🐘 PostgreSQL (pontual-postgres)
- **Porta**: 5432
- **Usuário**: pontual
- **Senha**: pontual123
- **Banco**: pontual
- **Volume**: Dados persistentes em `postgres_data`

### 🚀 Aplicação (pontual-app)
- **Porta**: 3000 (externa) → 5000 (interna)
- **Build**: Automático do código fonte
- **Dependencies**: Todas instaladas automaticamente

## Troubleshooting

### Container não inicia
```bash
# Ver logs detalhados
docker-compose logs

# Verificar status
docker-compose ps
```

### Erro de porta ocupada
```bash
# Verificar processos na porta 3000
lsof -i :3000

# Alterar porta no docker-compose.yml
ports:
  - "8080:5000"  # Usar porta 8080 ao invés de 3000
```

### Problemas de migração
```bash
# Entrar no container da aplicação
docker exec -it pontual-app sh

# Executar migração manualmente
node migrate.js

# Ver status do banco
psql postgresql://pontual:pontual123@postgres:5432/pontual
```

### Erro "Cannot find package 'vite'" ou "Cannot use external without bundle"
Estes erros indicam build incorreto do container:
```bash
# Limpeza completa e rebuild
docker-compose down -v
docker system prune -f
./docker-start.sh --clean
```

### Limpar tudo e recomeçar
```bash
docker-compose down -v
docker system prune -a
./docker-start.sh --clean
```

## Desenvolvimento

### Hot reload (desenvolvimento)
No `docker-compose.yml`, descomente a linha:
```yaml
volumes:
  - .:/app  # Descomente para hot reload
```

### Variáveis de ambiente
Edite o `docker-compose.yml` para alterar:
```yaml
environment:
  NODE_ENV: development  # ou production
  DATABASE_URL: postgresql://...
  SESSION_SECRET: sua-chave-secreta
```

## WhatsApp Integration

Para usar a integração WhatsApp no Docker:

1. **Configure o webhook URL** na interface web:
   ```
   http://localhost:3000/api/whatsapp/webhook/[instanceName]
   ```

2. **Para usar Evolution API externa**, certifique-se que a URL seja acessível do container

## Backup e Restore

### Backup do banco
```bash
docker exec pontual-postgres pg_dump -U pontual pontual > backup.sql
```

### Restore do banco
```bash
docker exec -i pontual-postgres psql -U pontual pontual < backup.sql
```