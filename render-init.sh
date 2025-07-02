#!/bin/bash

# Script de inicialização para o Render
echo "🚀 Configurando ambiente para Render..."

# Criar diretório de dados persistente
mkdir -p /opt/render/project/src/data
echo "📁 Diretório de dados criado: /opt/render/project/src/data"

# Verificar permissões
chmod 755 /opt/render/project/src/data
echo "🔒 Permissões configuradas"

# Iniciar aplicação
echo "🏃‍♂️ Iniciando aplicação..."
exec npm start