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