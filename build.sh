#!/bin/bash

# Script de build universal para qualquer plataforma
echo "🚀 Iniciando build da aplicação Pontual..."

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
  echo "⚠️ DATABASE_URL não definida, usando SQLite local"
fi

echo "✅ Build concluído com sucesso!"
echo "📝 Para iniciar: npm start"