#!/bin/bash

# Script de build otimizado para o Render
echo "🚀 Iniciando build para Render..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se os comandos estão disponíveis
echo "🔍 Verificando ferramentas..."
if ! command -v vite &> /dev/null; then
    echo "❌ Vite não encontrado, instalando..."
    npm install vite --save
fi

if ! command -v esbuild &> /dev/null; then
    echo "❌ ESBuild não encontrado, instalando..."
    npm install esbuild --save
fi

# Build do frontend
echo "🎨 Construindo frontend..."
npx vite build

# Build do backend
echo "⚙️  Construindo backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build concluído!"