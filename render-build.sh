#!/bin/bash

# Script de build para Render
echo "🚀 Iniciando build para Render..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build do servidor
echo "🔧 Compilando servidor..."
npm run build:server

# Build do cliente
echo "🎨 Compilando frontend..."
npm run build:client

# Aplicar migrations
echo "🐘 Aplicando migrations do banco..."
npm run migrate

echo "✅ Build concluído com sucesso!"