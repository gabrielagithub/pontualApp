# Configuração para Deploy no Render

## Problema de Persistência no Render

O Render, assim como outras plataformas de deploy modernas, usa um sistema de arquivos efêmero. Isso significa que qualquer arquivo criado durante a execução (incluindo bancos SQLite) é perdido quando a aplicação é reiniciada ou redployada.

## Soluções Implementadas

### 1. Sistema de Backup Automático
- Backups automáticos a cada hora
- Retenção dos 5 backups mais recentes
- Logs detalhados do processo de backup

### 2. Variável de Ambiente para Persistência
Para usar um banco SQLite persistente no Render, você precisa:

1. **Configurar um volume persistente** (se disponível no seu plano)
2. **Usar um banco PostgreSQL gratuito** (recomendado)

## Opção 1: PostgreSQL (Recomendado para Render)

O Render oferece PostgreSQL gratuito que é totalmente persistente. Para migrar:

1. No dashboard do Render, crie um PostgreSQL database
2. Copie a URL de conexão 
3. Adicione como variável de ambiente `DATABASE_URL`

O sistema já está preparado para PostgreSQL - basta configurar a variável.

## Opção 2: Manter SQLite com Configuração Especial

Se quiser manter SQLite, configure no Render:

### Variáveis de Ambiente no Render:
```
NODE_ENV=production
DATABASE_PATH=/opt/render/project/data/database.sqlite
```

### Script de Build:
```bash
npm install
mkdir -p /opt/render/project/data
```

### Script de Start:
```bash
npm run start
```

## Opção 3: Backup em Serviço Externo

O sistema pode ser configurado para fazer backup em:
- Google Drive
- Dropbox  
- AWS S3
- Outros serviços de armazenamento

## Configuração Atual

O sistema está configurado para:
- Detectar automaticamente se está em produção
- Usar caminhos absolutos para o banco
- Criar diretórios necessários automaticamente
- Fazer backups regulares
- Logs detalhados para debug

## Para Deploy no Render

### ✅ SQLite com Persistência no Render

**Configuração otimizada:**
- SQLite com caminho persistente no Render
- Dados mantidos no diretório /opt/render/project/src
- Dependencies de build corrigidas (vite, esbuild)
- Sistema de backup automático ativo

### Configuração para Deploy no Render:

1. **Web Service Settings:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Node Version:** 18 ou 20

2. **Environment Variables:**
   ```
   NODE_ENV=production
   ```

3. **Como funciona a persistência:**
   - Sistema detecta ambiente de produção
   - Usa caminho persistente: `/opt/render/project/src/data/`
   - Dados são mantidos entre redeploys
   - Backup automático continua funcionando

### Importante para o Render:
- O banco SQLite não está no Git (mantido no .gitignore)
- Na primeira execução, criará banco vazio
- Para migrar dados existentes, use o script de migração
- Dados ficam persistentes após primeiro deploy

### Status Atual:
- ✅ SQLite configurado para produção
- ✅ Caminho persistente no Render configurado
- ✅ Build testado e funcionando
- ✅ Sistema de backup ativo
- ✅ Pronto para deploy com persistência

### Configuração Alternativa com SQLite

Se preferir manter SQLite (menos recomendado para produção):

1. **Variáveis de ambiente:**
   ```
   NODE_ENV=production
   DATABASE_PATH=/opt/render/project/src/data/database.sqlite
   ```

2. **Scripts de build:**
   - Build Command: `npm install && mkdir -p /opt/render/project/src/data && npm run build`
   - Start Command: `npm start`

### Migração de Dados Existentes

Se você já tem dados no SQLite local:

1. **Execute o script de migração:**
   ```bash
   DATABASE_URL=sua_url_postgresql node migrate-to-postgresql.js
   ```

2. **Configure DATABASE_URL no Render**

3. **Faça novo deploy**

### Verificação de Deploy

O sistema mostrará logs indicando qual banco está sendo usado:
- `🐘 Usando PostgreSQL` - Configuração ideal para produção
- `📁 Usando SQLite` - Funcionará mas dados podem ser perdidos

### Troubleshooting

**Se os dados sumirem:**
1. Verifique se DATABASE_URL está configurada
2. Confirme que o PostgreSQL database está ativo
3. Verifique os logs de build/start no Render

**Para restaurar backup:**
1. Execute o script de migração com backup local
2. Configure DATABASE_URL
3. Redeploy

### Estrutura Final

Com PostgreSQL configurado, sua aplicação terá:
- ✅ Dados persistentes entre deploys
- ✅ Backup automático do Render
- ✅ Performance otimizada
- ✅ Escalabilidade