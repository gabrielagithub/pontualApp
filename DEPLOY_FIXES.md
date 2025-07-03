# Correções de Deploy - Render

## Problema Identificado
```
npm error Missing script: "build,"
npm error Did you mean this?
npm error   npm run build # run the "build" package script
```

## Causa do Erro
O script de build do Render (`render-build.sh`) estava chamando comandos que não existiam no `package.json`:
- `npm run build:server` ❌
- `npm run build:client` ❌  
- `npm run migrate` ❌

## Correções Implementadas

### 1. Atualizado `render-build.sh`
```bash
#!/bin/bash

# Script de build para Render
echo "🚀 Iniciando build para Render..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build completo (frontend + backend)
echo "🔧 Compilando aplicação..."
npm run build

# Aplicar migrations se DATABASE_URL existir
if [ -n "$DATABASE_URL" ]; then
  echo "🐘 Aplicando migrations do banco..."
  npm run db:push
else
  echo "⚠️ DATABASE_URL não definida, pulando migrations"
fi

echo "✅ Build concluído com sucesso!"
```

### 2. Corrigido `render-init.sh`
- Mudado de `node dist/server.js` para `node dist/index.js`
- Alinhado com o output do comando de build

### 3. Scripts Disponíveis no `package.json`
```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  }
}
```

## Comandos de Deploy Corretos

### Para Render
1. **Build Command**: `./render-build.sh`
2. **Start Command**: `./render-init.sh`

### Verificação Local
```bash
# Testar build localmente
npm run build

# Verificar arquivos gerados
ls -la dist/

# Testar inicialização
node dist/index.js
```

## Próximos Passos para Deploy
1. Commit das correções
2. Push para repositório
3. Trigger novo deploy no Render
4. Verificar logs de build

## Variáveis de Ambiente Necessárias no Render
- `DATABASE_URL` - URL do PostgreSQL
- `SESSION_SECRET` - Chave secreta para sessões
- `PORT` - Porta do servidor (automática no Render)

## Status
✅ Scripts de build corrigidos
✅ Comandos alinhados com package.json
✅ Pronto para novo deploy no Render