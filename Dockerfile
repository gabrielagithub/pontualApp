# Dockerfile para Pontual App
FROM node:20-alpine

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Definir diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar todas as dependências (dev + prod para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação frontend
RUN npx vite build

# Build do servidor com configuração específica para Docker
RUN npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=node20 --external:pg --external:@neondatabase/serverless --external:vite

# Não fazer prune para manter vite disponível no container
# RUN npm prune --production

# Expor porta
EXPOSE 5000

# Comando para iniciar
CMD ["npm", "start"]