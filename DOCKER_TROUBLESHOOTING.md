# 🔧 Docker Troubleshooting - Pontual App

## Problemas Comuns e Soluções

### 1. Erro "vite: not found" durante build

**Problema:** Build falha com `sh: vite: not found`

**Solução:**
```bash
# Limpar containers e tentar novamente
docker-compose down
docker system prune -f
./docker-start.sh --clean
```

**Causa:** Dependências de desenvolvimento não instaladas corretamente.

### 2. Página em branco no localhost:3000

**Possíveis causas e soluções:**

#### A) Container da aplicação não iniciou
```bash
# Verificar status
docker-compose ps

# Ver logs específicos
docker-compose logs app
```

#### B) Aplicação ainda inicializando
```bash
# Aguardar mais tempo e verificar logs
docker-compose logs -f app
```

#### C) Problema de build
```bash
# Rebuild completo
docker-compose down
docker-compose up --build
```

### 3. Erro de conexão com banco PostgreSQL

**Verificar se PostgreSQL está rodando:**
```bash
docker-compose logs postgres
```

**Testar conexão manual:**
```bash
docker exec -it pontual-postgres psql -U pontual -d pontual
```

### 4. Porta 3000 já em uso

**Verificar processo usando a porta:**
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

**Alterar porta no docker-compose.yml:**
```yaml
services:
  app:
    ports:
      - "8080:5000"  # Usar porta 8080
```

### 5. Problemas de permissão (Linux/Mac)

**Dar permissão ao script:**
```bash
chmod +x docker-start.sh
```

**Executar com sudo se necessário:**
```bash
sudo ./docker-start.sh
```

### 6. Cache de build corrompido

**Limpar cache completo:**
```bash
docker system prune -a
docker volume prune -f
./docker-start.sh --clean
```

## Comandos de Diagnóstico

### Verificar status completo
```bash
docker-compose ps
docker-compose logs
```

### Ver logs em tempo real
```bash
docker-compose logs -f
```

### Entrar no container da aplicação
```bash
docker exec -it pontual-app sh
```

### Verificar variáveis de ambiente
```bash
docker exec pontual-app env | grep DATABASE
```

### Testar migração manual
```bash
docker exec pontual-app node migrate.js
```

## Soluções por Sintoma

### Página carrega mas não mostra dados
- Verificar logs do backend: `docker-compose logs app`
- Testar conexão com banco: `docker-compose logs postgres`

### Aplicação não inicia
- Rebuild: `docker-compose up --build`
- Verificar dependências: logs de build

### WhatsApp não funciona
- Verificar se aplicação está acessível externamente
- Configurar webhook URL correta no Evolution API

### Performance lenta
- Verificar recursos do Docker Desktop
- Aumentar memória alocada para containers

## Reset Completo

Se nada funcionar, reset completo:

```bash
# 1. Parar tudo
docker-compose down -v

# 2. Limpar sistema
docker system prune -a

# 3. Remover imagens específicas
docker rmi pontualapp-app

# 4. Iniciar limpo
./docker-start.sh --clean
```