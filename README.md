# Pontual - Sistema de Controle de Tempo e Tarefas

Sistema inteligente de gerenciamento de tempo e tarefas com recursos avançados de relatórios e controle de produtividade.

## Funcionalidades

### Gerenciamento de Atividades
- Criação e edição de atividades com cores personalizadas
- Definição de horas estimadas e prazos
- Sistema de itens/subtarefas para cada atividade
- Indicadores visuais para atividades em atraso ou próximas ao limite

### Controle de Tempo
- Timer automático com funcionalidade de pausar/retomar
- Entrada manual de tempo trabalhado
- Acúmulo correto de tempo durante pausas
- Validação e proteção de dados

### Dashboard e Relatórios
- Visão geral com estatísticas do dia, semana e mês
- Indicadores clicáveis com detalhes das atividades
- Relatórios de tempo por atividade
- Estatísticas diárias com gráficos
- Exportação em CSV e PDF com filtros de data

### Histórico
- Visualização completa de registros de tempo
- Edição de entradas existentes
- Filtragem por períodos
- Exclusão em massa com proteção de dados

### Integração WhatsApp
- Controle completo via WhatsApp com Evolution API
- Dois modos: Individual (privado) ou Grupo (respostas no grupo)
- Comandos para criação, timer e gestão de tarefas
- Relatórios automáticos e notificações personalizadas
- Sistema de segurança ultra restritivo
- Logs completos de interações

## Tecnologias Utilizadas

- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Banco de Dados**: PostgreSQL com Drizzle ORM
- **Interface**: shadcn/ui, Lucide React
- **Ferramentas**: Vite, TanStack Query

## Instalação e Execução

### 🐳 Opção 1: Docker (Recomendado)

**Instalação mais simples com PostgreSQL incluído:**

```bash
# 1. Clonar repositório
git clone https://github.com/gabrielagithub/pontualApp.git
cd pontualApp

# 2. Iniciar com Docker
./docker-start.sh

# 3. Acessar aplicação
# http://localhost:3000
```

Ver [DOCKER_SETUP.md](DOCKER_SETUP.md) para instruções completas.

### 💻 Opção 2: Desenvolvimento Local

### Pré-requisitos
- Node.js (versão 18 ou superior)
- PostgreSQL (obrigatório)

### Instalação Rápida

1. **Clone e Configure**
```bash
git clone https://github.com/gabrielagithub/pontualApp.git
cd pontual
npm install
```

2. **Variáveis de Ambiente**
```bash
# .env
DATABASE_URL=postgresql://user:password@localhost/pontual
SESSION_SECRET=sua-chave-secreta-forte
PORT=3000
```

3. **Execute**

**Desenvolvimento:**
```bash
npm run dev
```

**Produção:**
```bash
npm run build
npm start
```

## Deploy

A aplicação funciona em qualquer ambiente com PostgreSQL:
- **Render, Heroku, Railway**: Suporte nativo
- **AWS, Azure, GCP**: Compatível
- **Servidores próprios**: PM2, Docker, etc.

📖 **Documentação completa**: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Estrutura do Projeto

```
pontual/
├── client/               # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas da aplicação
│   │   ├── hooks/        # Hooks customizados
│   │   └── lib/          # Utilitários e configurações
├── server/               # Backend Express
│   ├── routes.ts         # Rotas da API
│   ├── storage.ts        # Interface de armazenamento
│   ├── database-storage.ts # Implementação PostgreSQL
│   └── whatsapp-service.ts # Serviço WhatsApp
├── shared/               # Código compartilhado
│   └── schema.ts         # Esquemas de dados
└── migrations/           # Migrations do banco
```

## Integração WhatsApp

O Pontual inclui integração completa com WhatsApp via Evolution API.

📱 **Documentação completa**: [WHATSAPP_INTEGRATION.md](./WHATSAPP_INTEGRATION.md)

### Comandos Principais
- `tarefas` - Listar tarefas ativas
- `nova [nome]` - Criar nova tarefa
- `[número] iniciar` - Iniciar timer
- `[número] parar` - Parar timer
- `[número] concluir` - Finalizar tarefa
- `resumo` - Relatório do dia
- `ajuda` - Lista completa de comandos

### Modos de Operação
- **Individual**: Respostas sempre no privado
- **Grupo**: Respostas no grupo configurado

## API Endpoints

📚 **Documentação completa**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Principais Endpoints
- `/api/tasks` - Gestão de tarefas
- `/api/time-entries` - Controle de tempo
- `/api/whatsapp/integration` - Configuração WhatsApp
- `/api/dashboard/stats` - Estatísticas

## Scripts Disponíveis

- `npm run dev`: Desenvolvimento
- `npm run build`: Build de produção
- `npm start`: Iniciar servidor
- `npm run db:push`: Atualizar schema do banco

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT.

## Autor

Desenvolvido com foco na produtividade e gestão eficiente de tempo.