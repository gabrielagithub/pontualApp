#!/bin/bash

# Script de inicialização para Render
echo "🌟 Iniciando aplicação Pontual..."

# Verificar variáveis de ambiente essenciais
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não configurada!"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET não configurada!"
    exit 1
fi

echo "✅ Variáveis de ambiente verificadas"
echo "🐘 Conectando ao PostgreSQL..."
echo "🚀 Iniciando servidor na porta ${PORT:-5000}..."

# Iniciar aplicação
node dist/index.js