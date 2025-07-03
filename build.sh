#!/bin/bash

# Script de build universal para qualquer plataforma
echo "🚀 Iniciando build da aplicação Pontual..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build completo (frontend + backend)
echo "🔧 Compilando aplicação..."
npm run build

# Aplicar migrations - DATABASE_URL é obrigatória
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL é obrigatória. Configure uma conexão PostgreSQL."
  exit 1
fi

echo "🐘 Aplicando migrations do banco..."
npm run db:push

echo "✅ Build concluído com sucesso!"
echo "📝 Para iniciar: npm start"