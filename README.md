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
- Comandos para criação, timer e gestão de tarefas
- Filtro por grupo específico para ambientes corporativos
- Relatórios automáticos e notificações personalizadas
- Logs completos de interações

## Tecnologias Utilizadas

- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Banco de Dados**: SQLite com Drizzle ORM
- **Interface**: shadcn/ui, Lucide React
- **Ferramentas**: Vite, TanStack Query

## Instalação e Execução

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn

### Passos para instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/pontual.git
cd pontual
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse a aplicação em: `http://localhost:5000`

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
│   └── sqlite-storage.ts # Implementação SQLite
├── shared/               # Código compartilhado
│   └── schema.ts         # Esquemas de dados
└── database.sqlite       # Banco de dados SQLite
```

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento
- `npm run build`: Gera build de produção
- `npm run preview`: Visualiza build de produção

## Funcionalidades Principais

### Timer Inteligente
- Controle preciso de tempo com pause/resume
- Acúmulo automático de sessões
- Proteção contra perda de dados

### Relatórios Avançados
- Exportação em múltiplos formatos
- Filtros por período
- Visualização gráfica de produtividade

### Timezone Brasileiro
- Suporte completo ao fuso horário UTC-3
- Cálculos precisos de data e hora
- Interface adaptada ao formato brasileiro

## Integração WhatsApp

O Pontual inclui integração completa com WhatsApp via Evolution API, permitindo controle total das tarefas e tempo via mensagens.

### Configuração
Para configurar a integração WhatsApp, consulte o guia detalhado:
**[📱 WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)**

### Comandos Principais
- `tarefas` - Listar tarefas ativas
- `nova [nome]` - Criar nova tarefa
- `iniciar [tarefa]` - Iniciar timer
- `parar [tarefa]` - Parar timer
- `concluir [tarefa]` - Finalizar tarefa
- `relatorio` - Relatório do dia
- `ajuda` - Lista completa de comandos

### Recursos Avançados
- **Filtro por Grupo**: Configure para responder apenas em grupos específicos
- **Notificações Automáticas**: Relatórios diários e semanais via WhatsApp
- **Logs de Interação**: Monitoramento completo de comandos processados
- **Múltiplos Formatos**: Aceita diferentes formatos de tempo (2h, 90min, 1h30min)

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Autor

Desenvolvido com foco na produtividade e gestão eficiente de tempo.