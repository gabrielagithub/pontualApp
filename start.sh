#!/bin/bash

# Script de inicialização universal para qualquer plataforma
echo "🌟 Iniciando aplicação Pontual..."

# Verificar se existe build
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build não encontrado! Execute: ./build.sh"
    exit 1
fi

# Configurar porta padrão se não definida
export PORT=${PORT:-5000}

# Verificar tipo de banco
if [ -n "$DATABASE_URL" ]; then
    echo "🐘 Usando PostgreSQL"
    
    # Verificar SESSION_SECRET apenas para PostgreSQL
    if [ -z "$SESSION_SECRET" ]; then
        echo "⚠️ SESSION_SECRET não definida, usando padrão para desenvolvimento"
        export SESSION_SECRET="dev-secret-key-change-in-production"
    fi
else
    echo "📁 Usando SQLite local"
    export SESSION_SECRET="dev-secret-key-change-in-production"
fi

echo "🚀 Servidor iniciando na porta $PORT..."

# Iniciar aplicação
node dist/index.js