#!/bin/bash

# Script para inicializar o Pontual App com Docker
echo "🐳 Iniciando Pontual App com Docker..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Instale o Docker Desktop primeiro."
    exit 1
fi

# Verificar se Docker Compose está disponível
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose não está disponível."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down

# Remover volumes antigos se solicitado
if [ "$1" = "--clean" ]; then
    echo "🧹 Removendo volumes antigos..."
    docker-compose down -v
    docker volume prune -f
fi

# Construir e iniciar os serviços
echo "🔨 Construindo e iniciando serviços..."
if ! docker-compose up --build -d; then
    echo "❌ Erro no build ou inicialização. Mostrando logs:"
    docker-compose logs
    exit 1
fi

# Aguardar inicialização
echo "⏳ Aguardando inicialização dos serviços..."
sleep 15

# Verificar se containers estão rodando
echo "🔍 Verificando status dos containers..."
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Containers não estão rodando. Mostrando logs:"
    docker-compose logs
    exit 1
fi

# Verificar se a aplicação responde
echo "🌐 Testando conectividade da aplicação..."
sleep 5
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Pontual App rodando em http://localhost:3000"
    echo ""
    echo "📝 Comandos úteis:"
    echo "  - Ver logs: docker-compose logs -f"
    echo "  - Parar: docker-compose down"
    echo "  - Reiniciar limpo: ./docker-start.sh --clean"
    echo "  - Entrar no container: docker exec -it pontual-app sh"
else
    echo "⚠️  Containers iniciados, mas aplicação pode ainda estar inicializando..."
    echo "🔍 Verifique os logs: docker-compose logs -f"
    echo "🌐 Tente acessar: http://localhost:3000"
fi