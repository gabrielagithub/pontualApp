#!/bin/bash

# Script de build para Render - Versão Corrigida
echo "🚀 Iniciando build para Render..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build completo (frontend + backend)
echo "🔧 Compilando aplicação..."
npm run build

echo "✅ Build concluído com sucesso!"