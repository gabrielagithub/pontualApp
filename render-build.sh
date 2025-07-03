#!/bin/bash

# Script de build para Render
echo "🚀 Iniciando build para Render..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build completo (frontend + backend) usando npx
echo "🔧 Compilando aplicação..."
npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Aplicar migrations se DATABASE_URL existir
if [ -n "$DATABASE_URL" ]; then
  echo "🐘 Aplicando migrations do banco..."
  npx drizzle-kit push
else
  echo "⚠️ DATABASE_URL não definida, pulando migrations"
fi

echo "✅ Build concluído com sucesso!"