import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertTaskItemSchema, insertTimeEntrySchema, updateTimeEntrySchema, insertWhatsappIntegrationSchema, insertNotificationSettingsSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { 
  authenticateAny, 
  authenticateApiKey, 
  authenticateToken,
  authenticateAdmin,
  verifyPassword, 
  generateJwtToken, 
  createUserWithDefaults,
  createUserByAdmin,
  updateLastLogin,
  createPasswordResetToken,
  resetPassword,
  AuthenticatedRequest 
} from "./auth-middleware";
import { whatsappService } from "./whatsapp-service";
import { emailService } from "./email-service";
import { createUserByAdminSchema, loginSchema, resetPasswordSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint para Render (sem autenticação)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
      version: '1.0.0'
    });
  });



  // ===== ENDPOINTS DE AUTENTICAÇÃO =====
  
  // Login para interface web
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username e password são obrigatórios' });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Usuário não encontrado ou inativo' });
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      const token = generateJwtToken(user.id, user.username);
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error: any) {
      console.error('Erro no login:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Endpoint para verificar se o sistema foi inicializado (se existe pelo menos um usuário)
  app.get('/api/auth/is-initialized', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const hasUsers = users.length > 0;
      res.json({ initialized: hasUsers });
    } catch (error) {
      console.error('Erro ao verificar inicialização do sistema:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Endpoint para criar o primeiro usuário administrador (apenas quando sistema não foi inicializado)
  app.post('/api/auth/initialize', async (req, res) => {
    try {
      // Verificar se já existem usuários no sistema
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        return res.status(400).json({ message: 'Sistema já foi inicializado' });
      }

      const { username, password, email, fullName } = req.body;
      
      if (!username || !password || !email || !fullName) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
      }

      // Criar o primeiro usuário como administrador
      const user = await createUserWithDefaults(
        username,
        password,
        email,
        fullName,
        'admin'
      );

      const token = generateJwtToken(user.id, user.username);
      
      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('Erro ao inicializar sistema:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Obter informações do usuário autenticado
  app.get('/api/auth/me', authenticateAny, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        mustResetPassword: user.mustResetPassword,
        lastLogin: user.lastLogin,
        apiKey: user.apiKey,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Criar novo usuário (apenas para admin via API Key)
  app.post('/api/auth/users', authenticateApiKey, async (req: AuthenticatedRequest, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      
      // Verificar se usuário já existe
      const existingUser = await storage.getUserByUsername(validated.username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username já existe' });
      }

      const user = await createUserWithDefaults(
        validated.username,
        validated.password,
        validated.email,
        validated.fullName
      );

      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        apiKey: user.apiKey,
        createdAt: user.createdAt
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Gerar nova API Key
  app.post('/api/auth/generate-api-key', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const apiKey = await storage.generateApiKey(req.user!.id);
      res.json({ apiKey });
    } catch (error: any) {
      console.error('Erro ao gerar API Key:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // ===== ROTAS ADMINISTRATIVAS =====

  // Listar todos os usuários (apenas admin)
  app.get('/api/admin/users', authenticateAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersResponse = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        mustResetPassword: user.mustResetPassword,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
      res.json(usersResponse);
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Criar novo usuário (apenas admin)
  app.post('/api/admin/users', authenticateAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const validated = createUserByAdminSchema.parse(req.body);
      
      // Verificar se usuário já existe
      const existingUser = await storage.getUserByUsername(validated.username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username já existe' });
      }

      // Verificar se email já existe
      const existingEmail = await storage.getUserByEmail(validated.email);
      if (existingEmail) {
        return res.status(409).json({ message: 'Email já está em uso' });
      }

      // Gerar senha temporária
      const temporaryPassword = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 4).toUpperCase();
      
      const user = await createUserByAdmin(
        validated.username,
        validated.email,
        validated.fullName,
        validated.role || 'user',
        temporaryPassword
      );

      // Enviar email com credenciais
      try {
        await emailService.sendWelcomeEmail(user.email, user.fullName, temporaryPassword);
        console.log(`📧 Email de boas-vindas enviado para ${user.email}`);
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de boas-vindas:', emailError);
        // Não falha a criação do usuário se o email não for enviado
      }

      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        mustResetPassword: user.mustResetPassword,
        createdAt: user.createdAt
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Atualizar usuário (apenas admin)
  app.put('/api/admin/users/:id', authenticateAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Não permitir atualização de campos sensíveis via esta rota
      delete updates.password;
      delete updates.apiKey;
      
      const updatedUser = await storage.updateUser(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        mustResetPassword: updatedUser.mustResetPassword,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Deletar usuário (apenas admin)
  app.delete('/api/admin/users/:id', authenticateAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Não permitir que o admin delete a si mesmo
      if (userId === req.user!.id) {
        return res.status(400).json({ message: 'Você não pode deletar sua própria conta' });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Reset de senha por admin
  app.post('/api/admin/users/:id/reset-password', authenticateAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      const resetToken = await createPasswordResetToken(userId);
      
      try {
        await emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);
        console.log(`📧 Email de reset de senha enviado para ${user.email}`);
        res.json({ message: 'Email de reset de senha enviado com sucesso' });
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de reset:', emailError);
        res.status(500).json({ message: 'Erro ao enviar email de reset de senha' });
      }
    } catch (error: any) {
      console.error('Erro ao iniciar reset de senha:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Relatório de atividades de todos os usuários (apenas admin)
  app.get('/api/admin/reports/activity', authenticateAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const users = await storage.getAllUsers();
      const report = [];
      
      for (const user of users) {
        const timeEntries = await storage.getTimeEntriesByUser(user.id, startDate as string, endDate as string);
        const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        
        report.push({
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          totalTimeMinutes: totalTime,
          totalTimeFormatted: formatDuration(totalTime),
          entriesCount: timeEntries.length,
          lastActivity: timeEntries.length > 0 ? timeEntries[0].endTime : null
        });
      }
      
      res.json(report);
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // ===== ROTAS DE RESET DE SENHA =====
  
  // Solicitar reset de senha (público)
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Por segurança, sempre retorna sucesso mesmo se o email não existir
        return res.json({ message: 'Se o email existir em nossa base, você receberá instruções de reset' });
      }

      const resetToken = await createPasswordResetToken(user.id);
      
      try {
        await emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);
        console.log(`📧 Email de reset de senha enviado para ${user.email}`);
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de reset:', emailError);
      }
      
      res.json({ message: 'Se o email existir em nossa base, você receberá instruções de reset' });
    } catch (error: any) {
      console.error('Erro ao processar forgot password:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Executar reset de senha (público)
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      
      const success = await resetPassword(validated.token, validated.newPassword);
      
      if (!success) {
        return res.status(400).json({ message: 'Token inválido ou expirado' });
      }
      
      res.json({ message: 'Senha alterada com sucesso' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Erro ao resetar senha:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Função auxiliar para formatar duração
  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  }

  // Endpoint para testar WhatsApp manualmente
  app.post("/api/whatsapp/test", async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      console.log('🧪 TESTE MANUAL WHATSAPP:', { phoneNumber, message });
      
      const integration = await storage.getWhatsappIntegration();
      
      if (!integration) {
        return res.status(404).json({ error: 'Integração não encontrada' });
      }
      
      await whatsappService.processIncomingMessage(
        integration.id,
        phoneNumber,
        message,
        'test-id',
        undefined // groupJid undefined para simular mensagem individual
      );
      
      res.json({ success: true, message: 'Teste executado' });
      
    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Sistema simplificado - sem autenticação para single-user
  // Apenas webhook do WhatsApp precisa de tratamento especial (já sem auth)

  // Webhook para receber mensagens do WhatsApp (SEM autenticação)
  app.post("/api/whatsapp/webhook/:instanceName", async (req, res) => {
    try {
      const { instanceName } = req.params;
      const { event, data } = req.body;
      
      // Debug completo
      console.log('🔥 WEBHOOK RECEBIDO:', {
        instanceName,
        event,
        dataKeys: Object.keys(data || {}),
        hasKey: !!data?.key,
        hasMessage: !!data?.message,
        messageType: data?.messageType,
        fullData: JSON.stringify(data, null, 2)
      });
      
      // Processar mensagens UPSERT (Evolution API envia mensagem diretamente na raiz)
      if (event === 'messages.upsert' && data?.key?.remoteJid) {
        const message = data; // A mensagem está na raiz do data
        const remoteJid = message.key.remoteJid;
        
        // Extrair texto da mensagem - múltiplos formatos possíveis
        let messageText = '';
        
        if (message.message) {
          // Formatos de texto mais comuns
          messageText = message.message.conversation || 
                       message.message.extendedTextMessage?.text ||
                       message.message.templateButtonReplyMessage?.selectedDisplayText ||
                       message.message.buttonsResponseMessage?.selectedDisplayText ||
                       message.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                       message.message.imageMessage?.caption ||
                       message.message.videoMessage?.caption ||
                       message.message.documentMessage?.caption ||
                       '';
        }
        
        // Se ainda estiver vazio, tentar outras estruturas da Evolution API
        if (!messageText && message.text) {
          messageText = message.text;
        }
        
        // Debug detalhado da estrutura da mensagem
        console.log('🔍 ESTRUTURA COMPLETA DA MENSAGEM:', JSON.stringify(message, null, 2));
        
        console.log('📱 MENSAGEM IDENTIFICADA:', {
          remoteJid,
          messageText,
          fromMe: message.key?.fromMe || false,
          participant: message.key?.participant,
          hasText: !!messageText
        });
        
        // Pular mensagens sem texto ou vazias
        if (!messageText || messageText.trim() === '') {
          console.log('📱 IGNORANDO - mensagem sem texto');
          return res.status(200).json({ status: 'ignored - no text' });
        }

        // FILTRO INTELIGENTE: Permitir mensagens do bot se ele estiver autorizado
        if (message.key?.fromMe) {
          // Buscar integração para verificar se o bot está autorizado
          const integration = await storage.getWhatsappIntegration();
          
          if (integration && integration.instanceName === instanceName) {
            // Verificar se o número do bot está na lista de autorizados
            let botAuthorized = false;
            if (integration.authorizedNumbers) {
              try {
                const authorizedNumbers = JSON.parse(integration.authorizedNumbers);
                const botNumber = integration.phoneNumber;
                
                // Corrigir número do bot removendo o dígito 9 após DDD se necessário
                // Bot: 5531992126113 → 553192126113 para comparar com autorizado
                botAuthorized = authorizedNumbers.some((num: string) => {
                  let normalizedBot = botNumber.replace(/[^\d]/g, '');
                  const normalizedAuth = num.replace(/[^\d]/g, '');
                  
                  // Se o bot tem 13 dígitos e começa com 5531, remover o 9
                  if (normalizedBot.length === 13 && normalizedBot.startsWith('5531')) {
                    normalizedBot = normalizedBot.slice(0, 4) + normalizedBot.slice(5); // Remove o 5º dígito (9)
                  }
                  
                  if (normalizedBot === normalizedAuth) {
                    return true;
                  }
                  return false;
                });
                
                console.log('🔍 VERIFICAÇÃO BOT AUTORIZADO:', {
                  botNumber,
                  authorizedNumbers,
                  botAuthorized,
                  normalizedBot: botNumber.replace(/[^\d]/g, ''),
                  normalizedAuth: authorizedNumbers.map((n: string) => n.replace(/[^\d]/g, '')),
                  botLast11: botNumber.replace(/[^\d]/g, '').slice(-11),
                  authLast11: authorizedNumbers.map((n: string) => n.replace(/[^\d]/g, '').slice(-11))
                });
              } catch (error) {
                console.error('Erro ao verificar números autorizados:', error);
              }
            }
            
            if (!botAuthorized) {
              console.log('🤖 IGNORANDO - bot não autorizado na lista de números permitidos');
              return res.status(200).json({ status: 'ignored - bot not authorized' });
            } else {
              console.log('✅ PROCESSANDO - bot está na lista de números autorizados');
            }
          } else {
            console.log('🤖 IGNORANDO - mensagem do próprio bot (fromMe: true)');
            return res.status(200).json({ status: 'ignored - bot message' });
          }
        }

        
        // Extrair informações da mensagem
        let phoneNumber = '';
        let groupName = null;
        let isGroupMessage = false;
        
        if (remoteJid.includes('@g.us')) {
          // 🔒 MENSAGEM DE GRUPO: Usar participant (número individual) para validação
          isGroupMessage = true;
          groupName = message.pushName || 'Grupo Desconhecido';
          phoneNumber = message.key.participant || remoteJid; // USAR PARTICIPANT (número que enviou)
          console.log('🔍 DEBUG GRUPO:', { 
            remoteJid, 
            participant: message.key.participant,
            phoneNumberFinal: phoneNumber
          });
        } else {
          // Mensagem individual
          phoneNumber = remoteJid;
        }
        
        console.log('📱 DADOS EXTRAÍDOS (ANTES DA CORREÇÃO):', { phoneNumber, groupName, isGroupMessage });
        
        // 🔒 CORREÇÃO CRÍTICA: Para grupos, sempre usar o participant
        if (isGroupMessage && message.key.participant) {
          phoneNumber = message.key.participant;
          console.log('🔧 CORREÇÃO APLICADA - phoneNumber atualizado para participant:', phoneNumber);
        }
        
        console.log('📱 DADOS FINAIS:', { phoneNumber, groupName, isGroupMessage });
        
        // Buscar integração (single instance)
        const integration = await storage.getWhatsappIntegration();
        
        console.log('📱 INTEGRAÇÃO ENCONTRADA:', {
          found: !!integration,
          instanceMatch: integration?.instanceName === instanceName,
          expectedInstance: instanceName,
          foundInstance: integration?.instanceName
        });
        
        if (integration && integration.instanceName === instanceName) {
          // 🔒 SISTEMA ULTRA RESTRITIVO: Validação agora é por número individual
          console.log('📱 PROCESSANDO MENSAGEM para:', phoneNumber);
          console.log('🔧 DEBUG GROUPJID:', {
            isGroupMessage,
            remoteJid,
            groupJidToPass: isGroupMessage ? remoteJid : undefined
          });
          await whatsappService.processIncomingMessage(
            integration.id,
            phoneNumber,
            messageText,
            message.key?.id || 'no-id',
            isGroupMessage ? remoteJid : undefined
          );
        } else {
          console.log('📱 MENSAGEM NÃO PROCESSADA - integração não encontrada ou instance diferente');
        }
      }
      
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('❌ Erro no webhook WhatsApp:', error);
      res.status(500).json({ message: "Erro no webhook" });
    }
  });
  // Task routes
  // ===== ENDPOINTS DE TAREFAS (COM AUTENTICAÇÃO) =====

  app.get("/api/tasks", authenticateAny, async (req: AuthenticatedRequest, res) => {
    try {
      const tasks = await storage.getAllTasks();
      // Filtrar tarefas do usuário logado
      const userTasks = tasks.filter(task => task.userId === req.user!.id);
      res.json(userTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", authenticateAny, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      // Verificar se a tarefa pertence ao usuário
      if (task.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado à tarefa" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", authenticateAny, async (req: AuthenticatedRequest, res) => {
    try {
      // Adicionar userId e source automaticamente
      const taskData = {
        ...req.body,
        userId: req.user!.id,
        source: req.headers['x-api-key'] ? 'api-externa' : 'sistema'
      };
      
      const validatedData = insertTaskSchema.parse(taskData);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, updates);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if task has time entries
      const timeEntries = await storage.getTimeEntriesByTask(id);
      if (timeEntries.length > 0) {
        return res.status(400).json({ 
          message: "Não é possível excluir atividade que possui apontamentos no histórico. Exclua os apontamentos primeiro." 
        });
      }
      
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ message: "Atividade não encontrada" });
      }
      res.json({ message: "Atividade excluída com sucesso" });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ message: "Falha ao excluir atividade" });
    }
  });

  app.post("/api/tasks/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.completeTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.post("/api/tasks/:id/reopen", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.reopenTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to reopen task" });
    }
  });

  // Task item routes
  app.get("/api/tasks/:taskId/items", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const items = await storage.getTaskItems(taskId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task items" });
    }
  });

  app.post("/api/tasks/:taskId/items", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const validatedData = insertTaskItemSchema.parse({ ...req.body, taskId });
      const item = await storage.createTaskItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task item" });
    }
  });

  app.put("/api/task-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const item = await storage.updateTaskItem(id, updates);
      if (!item) {
        return res.status(404).json({ message: "Task item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task item" });
    }
  });

  app.delete("/api/task-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTaskItem(id);
      if (!success) {
        return res.status(404).json({ message: "Task item not found" });
      }
      res.json({ message: "Task item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task item" });
    }
  });

  app.post("/api/tasks/:taskId/complete-all-items", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      await storage.completeAllTaskItems(taskId);
      res.json({ message: "All task items completed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to complete all task items" });
    }
  });

  // Time entry routes
  app.get("/api/time-entries", async (req, res) => {
    try {
      const entries = await storage.getAllTimeEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get("/api/time-entries/running", async (req, res) => {
    try {
      // Disable caching to ensure fresh data on each request
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
      
      const entries = await storage.getRunningTimeEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch running time entries" });
    }
  });

  app.get("/api/time-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.getTimeEntry(id);
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entry" });
    }
  });

  app.post("/api/time-entries", authenticateAny, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("Received time entry data:", req.body);
      
      // Adicionar userId do usuário autenticado
      const timeEntryData = {
        ...req.body,
        userId: req.user!.id
      };
      
      const validatedData = insertTimeEntrySchema.parse(timeEntryData);
      console.log("Validated time entry data:", validatedData);
      const entry = await storage.createTimeEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Time entry creation error:", error);
      if (error instanceof z.ZodError) {
        console.log("Time entry validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid time entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.put("/api/time-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Updating time entry:", id, "with data:", req.body);
      const updates = updateTimeEntrySchema.parse(req.body);
      console.log("Validated updates:", updates);
      const entry = await storage.updateTimeEntry(id, updates);
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Time entry update error:", error);
      if (error instanceof z.ZodError) {
        console.log("Update validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid time entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.delete("/api/time-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the entry exists and if it's active (endTime is null)
      const entry = await storage.getTimeEntry(id);
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      // Prevent deletion of active sessions (Fim N/A)
      if (!entry.endTime || entry.isRunning) {
        return res.status(400).json({ 
          message: "Não é possível excluir uma entrada que está em sessão ativa. Finalize o timer primeiro." 
        });
      }
      
      const success = await storage.deleteTimeEntry(id);
      if (!success) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      res.json({ message: "Time entry deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  app.delete("/api/time-entries/all", async (req, res) => {
    try {
      const success = await storage.deleteAllTimeEntries();
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete all time entries" });
      }
      
      res.json({ message: "All time entries deleted successfully" });
    } catch (error) {
      console.error('Delete all time entries error:', error);
      res.status(500).json({ message: "Failed to delete all time entries" });
    }
  });

  // Analytics routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Routes for task details by category
  app.get("/api/dashboard/overdue-tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      const now = new Date();
      const overdueTasks = tasks.filter(task => 
        task.isActive && 
        task.deadline && 
        new Date(task.deadline) < now
      );
      res.json(overdueTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue tasks" });
    }
  });

  app.get("/api/dashboard/overtime-tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      const overTimeTasks = [];
      
      for (const task of tasks) {
        if (!task.isActive || !task.estimatedHours) continue;
        
        const entries = await storage.getTimeEntriesByTask(task.id);
        const totalTime = entries.reduce((sum, entry) => {
          let duration = entry.duration || 0;
          if (entry.isRunning && entry.startTime) {
            duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
          }
          return sum + duration;
        }, 0);
        
        if (totalTime > (task.estimatedHours * 3600)) {
          overTimeTasks.push({
            ...task,
            totalTime,
            estimatedTime: task.estimatedHours * 3600,
            exceedingTime: totalTime - (task.estimatedHours * 3600)
          });
        }
      }
      
      res.json(overTimeTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overtime tasks" });
    }
  });

  app.get("/api/dashboard/due-today-tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const dueTodayTasks = tasks.filter(task => 
        task.isActive && 
        task.deadline && 
        new Date(task.deadline) >= todayStart && 
        new Date(task.deadline) < todayEnd
      );
      res.json(dueTodayTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch due today tasks" });
    }
  });

  app.get("/api/dashboard/due-tomorrow-tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      const today = new Date();
      const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const tomorrowEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
      
      const dueTomorrowTasks = tasks.filter(task => 
        task.isActive && 
        task.deadline && 
        new Date(task.deadline) >= tomorrowStart && 
        new Date(task.deadline) < tomorrowEnd
      );
      res.json(dueTomorrowTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch due tomorrow tasks" });
    }
  });

  app.get("/api/dashboard/nearing-limit-tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      const nearingLimitTasks = [];
      
      for (const task of tasks) {
        if (!task.isActive || !task.estimatedHours) continue;
        
        const entries = await storage.getTimeEntriesByTask(task.id);
        const totalTime = entries.reduce((sum, entry) => {
          let duration = entry.duration || 0;
          if (entry.isRunning && entry.startTime) {
            duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
          }
          return sum + duration;
        }, 0);
        
        const timeLimit = task.estimatedHours * 3600;
        const percentage = (totalTime / timeLimit) * 100;
        
        if (totalTime >= (timeLimit * 0.7) && totalTime <= (timeLimit * 0.85)) {
          nearingLimitTasks.push({
            ...task,
            totalTime,
            estimatedTime: timeLimit,
            percentage: Math.round(percentage)
          });
        }
      }
      
      res.json(nearingLimitTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nearing limit tasks" });
    }
  });

  app.get("/api/reports/time-by-task", async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const data = await storage.getTimeByTask(startDate, endDate);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time by task report" });
    }
  });

  app.get("/api/reports/daily-stats", async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const data = await storage.getDailyStats(startDate, endDate);
      res.json(data);
    } catch (error) {
      console.error("Daily stats error:", error);
      res.status(500).json({ message: "Failed to fetch daily stats report" });
    }
  });

  // Export routes
  app.get("/api/export/csv", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      console.log("CSV Export - Parameters:", { startDate, endDate });
      
      const allEntries = await storage.getAllTimeEntries();
      console.log("CSV Export - Total entries found:", allEntries.length);
      
      // Filter entries by date range if provided
      let entries = allEntries;
      if (startDate || endDate) {
        entries = allEntries.filter((entry) => {
          const entryDate = new Date(entry.startTime || entry.createdAt);
          // Usar apenas a data, ignorando horário para comparação
          const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
          
          let start = null;
          let end = null;
          
          if (startDate) {
            const startParts = (startDate as string).split('-');
            start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
          }
          
          if (endDate) {
            const endParts = (endDate as string).split('-');
            end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
          }
          
          console.log("Comparing entry date:", entryDateOnly, "with range:", start, "to", end);
          
          if (start && entryDateOnly < start) return false;
          if (end && entryDateOnly > end) return false;
          return true;
        });
        console.log("CSV Export - Filtered entries:", entries.length);
      }
      
      // Generate CSV with proper column separation
      const headers = ['Data', 'Atividade', 'Início', 'Fim', 'Duração'];
      const csvRows = [headers.join(',')];
      
      for (const entry of entries) {
        const date = new Date(entry.startTime || entry.createdAt).toLocaleDateString('pt-BR');
        const taskName = `"${entry.task.name.replace(/"/g, '""')}"`;
        const startTime = entry.startTime ? new Date(entry.startTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : 'N/A';
        const endTime = entry.endTime ? new Date(entry.endTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : 'N/A';
        const durationHours = entry.duration ? Math.floor(entry.duration / 3600) : 0;
        const durationMinutes = entry.duration ? Math.floor((entry.duration % 3600) / 60) : 0;
        const durationFormatted = `${durationHours.toString().padStart(2, '0')}:${durationMinutes.toString().padStart(2, '0')}`;
        
        csvRows.push([date, taskName, startTime, endTime, durationFormatted].join(','));
      }
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio-pontual.csv"');
      res.send('\uFEFF' + csvContent); // Add BOM for proper UTF-8 handling in Excel
    } catch (error) {
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.get("/api/export/pdf", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const allEntries = await storage.getAllTimeEntries();
      
      // Filter entries by date range if provided
      let entries = allEntries;
      if (startDate || endDate) {
        entries = allEntries.filter((entry) => {
          const entryDate = new Date(entry.startTime || entry.createdAt);
          // Usar apenas a data, ignorando horário para comparação
          const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
          
          let start = null;
          let end = null;
          
          if (startDate) {
            const startParts = (startDate as string).split('-');
            start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
          }
          
          if (endDate) {
            const endParts = (endDate as string).split('-');
            end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
          }
          
          if (start && entryDateOnly < start) return false;
          if (end && entryDateOnly > end) return false;
          return true;
        });
      }
      
      // Calculate totals
      const totalDuration = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      const totalHours = Math.floor(totalDuration / 3600);
      const totalMinutes = Math.floor((totalDuration % 3600) / 60);
      
      // Group by task
      const taskStats = entries.reduce((acc, entry) => {
        const taskName = entry.task.name;
        if (!acc[taskName]) {
          acc[taskName] = { duration: 0, count: 0, color: entry.task.color };
        }
        acc[taskName].duration += entry.duration || 0;
        acc[taskName].count += 1;
        return acc;
      }, {} as Record<string, { duration: number; count: number; color: string }>);

      // Generate HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Tempo - Pontual</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              margin: 40px;
              color: #333;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #666;
              margin: 10px 0 0 0;
              font-size: 14px;
            }
            .summary {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 20px;
              border-radius: 12px;
              margin-bottom: 30px;
              text-align: center;
            }
            .summary h2 {
              margin: 0 0 10px 0;
              font-size: 20px;
            }
            .summary .total-time {
              font-size: 32px;
              font-weight: bold;
              margin: 10px 0;
            }
            .task-summary {
              margin-bottom: 30px;
            }
            .task-summary h3 {
              color: #2563eb;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 10px;
            }
            .task-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .task-item:last-child {
              border-bottom: none;
            }
            .task-name {
              display: flex;
              align-items: center;
            }
            .task-color {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              margin-right: 10px;
            }
            .task-stats {
              text-align: right;
              color: #666;
              font-size: 14px;
            }
            .entries-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 14px;
            }
            .entries-table th {
              background: #f8fafc;
              padding: 12px 8px;
              text-align: left;
              border-bottom: 2px solid #e5e7eb;
              font-weight: 600;
              color: #374151;
            }
            .entries-table td {
              padding: 10px 8px;
              border-bottom: 1px solid #f3f4f6;
            }
            .entries-table tbody tr:hover {
              background: #f9fafb;
            }
            .task-indicator {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              display: inline-block;
              margin-right: 8px;
            }
            .duration {
              font-weight: 500;
              color: #059669;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Apontamentos</h1>
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            ${startDate || endDate ? `<p><strong>Período:</strong> ${
              startDate ? new Date(startDate as string).toLocaleDateString('pt-BR') : 'Início'
            } até ${
              endDate ? new Date(endDate as string).toLocaleDateString('pt-BR') : 'Fim'
            }</p>` : '<p><strong>Período:</strong> Todos os registros</p>'}
          </div>

          <div class="summary">
            <h2>Resumo Geral</h2>
            <div class="total-time">${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}</div>
            <p>${entries.length} apontamentos registrados</p>
          </div>

          <div class="task-summary">
            <h3>Tempo por Atividade</h3>
            ${Object.entries(taskStats).map(([taskName, stats]) => {
              const hours = Math.floor(stats.duration / 3600);
              const minutes = Math.floor((stats.duration % 3600) / 60);
              return `
                <div class="task-item">
                  <div class="task-name">
                    <div class="task-color" style="background-color: ${stats.color}"></div>
                    <strong>${taskName}</strong>
                  </div>
                  <div class="task-stats">
                    <div class="duration">${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}</div>
                    <div>${stats.count} apontamentos</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <h3>Detalhamento dos Apontamentos</h3>
          <table class="entries-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Atividade</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(entry => {
                const date = new Date(entry.startTime || entry.createdAt).toLocaleDateString('pt-BR');
                const startTime = entry.startTime ? new Date(entry.startTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : 'N/A';
                const endTime = entry.endTime ? new Date(entry.endTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : 'N/A';
                const durationHours = entry.duration ? Math.floor(entry.duration / 3600) : 0;
                const durationMinutes = entry.duration ? Math.floor((entry.duration % 3600) / 60) : 0;
                const durationFormatted = `${durationHours.toString().padStart(2, '0')}:${durationMinutes.toString().padStart(2, '0')}`;
                
                return `
                  <tr>
                    <td>${date}</td>
                    <td>
                      <span class="task-indicator" style="background-color: ${entry.task.color}"></span>
                      ${entry.task.name}
                    </td>
                    <td>${startTime}</td>
                    <td>${endTime}</td>
                    <td class="duration">${durationFormatted}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Relatório gerado pelo sistema Pontual - Gestão de Tempo e Tarefas</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  // API Integration endpoints - simplified for external use
  
  // Quick entry creation - simplified endpoint for external integrations
  app.post("/api/quick-entry", async (req, res) => {
    try {
      const { taskName, startTime, endTime, duration, description } = req.body;
      
      // Validate required fields
      if (!taskName) {
        return res.status(400).json({ message: "Nome da tarefa é obrigatório" });
      }
      
      // Find or create task by name
      let task;
      const allTasks = await storage.getAllTasks();
      task = allTasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
      
      if (!task) {
        // Create new task if not found
        task = await storage.createTask({
          name: taskName,
          description: description || "",
          color: "#3B82F6",
          isActive: true,
          deadline: null
        });
      }
      
      // Create time entry
      const timeEntryData: any = {
        taskId: task.id,
        startTime: startTime || new Date().toISOString(),
        notes: description || ""
      };
      
      if (endTime) {
        timeEntryData.endTime = endTime;
      }
      
      if (duration) {
        timeEntryData.duration = duration;
      } else if (startTime && endTime) {
        // Calculate duration from start and end times
        const start = new Date(startTime);
        const end = new Date(endTime);
        timeEntryData.duration = Math.floor((end.getTime() - start.getTime()) / 1000);
      }
      
      const validatedData = insertTimeEntrySchema.parse(timeEntryData);
      const entry = await storage.createTimeEntry(validatedData);
      
      res.status(201).json({
        message: "Apontamento criado com sucesso",
        entry,
        task
      });
    } catch (error) {
      console.error("Quick entry creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Falha ao criar apontamento" });
    }
  });
  
  // Start timer for a task (by name or ID)
  app.post("/api/start-timer", authenticateAny, async (req: AuthenticatedRequest, res) => {
    try {
      const { taskName, taskId, description } = req.body;
      
      let task;
      if (taskId) {
        task = await storage.getTask(taskId);
      } else if (taskName) {
        const allTasks = await storage.getAllTasks();
        task = allTasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
        
        if (!task) {
          // Create new task if not found
          task = await storage.createTask({
            name: taskName,
            description: "",
            color: "#3B82F6",
            isActive: true,
            deadline: null,
            source: "sistema",
            userId: req.user!.id
          });
        }
      }
      
      if (!task) {
        return res.status(400).json({ message: "Tarefa não encontrada. Forneça taskId ou taskName." });
      }
      
      // Check if there's already a running timer for this task
      const runningEntries = await storage.getRunningTimeEntries();
      const existingTimer = runningEntries.find(entry => entry.taskId === task.id);
      
      if (existingTimer) {
        return res.status(400).json({ 
          message: "Já existe um timer ativo para esta tarefa",
          existingTimer
        });
      }
      
      // Create new running time entry
      const timeEntryData = {
        taskId: task.id,
        startTime: new Date().toISOString(),
        isRunning: true,
        notes: description || "",
        userId: req.user!.id
      };
      
      const validatedData = insertTimeEntrySchema.parse(timeEntryData);
      const entry = await storage.createTimeEntry(validatedData);
      
      res.status(201).json({
        message: "Timer iniciado com sucesso",
        entry,
        task
      });
    } catch (error) {
      console.error("Start timer error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Falha ao iniciar timer" });
    }
  });
  
  // Stop timer for a task (by name or ID)
  app.post("/api/stop-timer", authenticateAny, async (req: AuthenticatedRequest, res) => {
    try {
      const { taskName, taskId, description } = req.body;
      
      let task;
      if (taskId) {
        task = await storage.getTask(taskId);
      } else if (taskName) {
        const allTasks = await storage.getAllTasks();
        task = allTasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
      }
      
      if (!task) {
        return res.status(400).json({ message: "Tarefa não encontrada. Forneça taskId ou taskName." });
      }
      
      // Find running timer for this task
      const runningEntries = await storage.getRunningTimeEntries();
      const runningTimer = runningEntries.find(entry => entry.taskId === task.id);
      
      if (!runningTimer) {
        return res.status(400).json({ message: "Nenhum timer ativo encontrado para esta tarefa" });
      }
      
      // Calculate duration and stop timer
      const endTime = new Date();
      const startTime = new Date(runningTimer.startTime);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Validar tempo mínimo de 1 minuto (60 segundos)
      if (duration < 60) {
        // Se o tempo for menor que 1 minuto, deletar a entrada em vez de salvar
        await storage.deleteTimeEntry(runningTimer.id);
        return res.json({
          message: "Timer removido - tempo inferior a 1 minuto não é registrado",
          entry: null,
          task,
          duration: {
            seconds: duration,
            formatted: `${Math.floor(duration / 3600).toString().padStart(2, '0')}:${Math.floor((duration % 3600) / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`
          },
          deleted: true
        });
      }
      
      const updates: any = {
        endTime: endTime.toISOString(),
        duration,
        isRunning: false
      };
      
      if (description) {
        updates.notes = description;
      }
      
      const validatedUpdates = updateTimeEntrySchema.parse(updates);
      const updatedEntry = await storage.updateTimeEntry(runningTimer.id, validatedUpdates);
      
      res.json({
        message: "Timer parado com sucesso",
        entry: updatedEntry,
        task,
        duration: {
          seconds: duration,
          formatted: `${Math.floor(duration / 3600).toString().padStart(2, '0')}:${Math.floor((duration % 3600) / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`
        }
      });
    } catch (error) {
      console.error("Stop timer error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Falha ao parar timer" });
    }
  });
  
  // Get current status - useful for external integrations
  app.get("/api/status", async (req, res) => {
    try {
      const runningEntries = await storage.getRunningTimeEntries();
      const stats = await storage.getDashboardStats();
      
      res.json({
        currentTime: new Date().toISOString(),
        runningTimers: runningEntries.length,
        runningEntries: runningEntries.map(entry => ({
          id: entry.id,
          taskName: entry.task.name,
          startTime: entry.startTime,
          currentDuration: entry.startTime ? Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000) : 0,
          description: entry.notes
        })),
        todayStats: {
          totalTime: stats.todayTime,
          activeTasks: stats.activeTasks,
          completedTasks: stats.completedTasks
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Falha ao obter status" });
    }
  });

  // Pause timer endpoint
  app.post("/api/pause-timer", async (req, res) => {
    try {
      const { taskName, taskId } = req.body;
      
      let task;
      if (taskId) {
        task = await storage.getTask(taskId);
      } else if (taskName) {
        const allTasks = await storage.getAllTasks();
        task = allTasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
      }
      
      if (!task) {
        return res.status(400).json({ message: "Tarefa não encontrada. Forneça taskId ou taskName." });
      }
      
      // Find running timer for this task
      const runningEntries = await storage.getRunningTimeEntries();
      const runningTimer = runningEntries.find(entry => entry.taskId === task.id);
      
      if (!runningTimer) {
        return res.status(400).json({ message: "Nenhum timer ativo encontrado para esta tarefa" });
      }
      
      // Pause timer by setting isRunning to false but keeping endTime null for resume
      const updates = {
        isRunning: false,
        notes: runningTimer.notes ? `${runningTimer.notes} (pausado)` : "Pausado via WhatsApp"
      };
      
      const pausedEntry = await storage.updateTimeEntry(runningTimer.id, updates);
      
      res.json({
        message: "Timer pausado com sucesso",
        entry: pausedEntry,
        task
      });
    } catch (error) {
      console.error("Erro ao pausar timer:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Resume timer endpoint
  app.post("/api/resume-timer", async (req, res) => {
    try {
      const { taskName, taskId } = req.body;
      
      let task;
      if (taskId) {
        task = await storage.getTask(taskId);
      } else if (taskName) {
        const allTasks = await storage.getAllTasks();
        task = allTasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
      }
      
      if (!task) {
        return res.status(400).json({ message: "Tarefa não encontrada. Forneça taskId ou taskName." });
      }
      
      // Find paused timer for this task (isRunning = false and endTime = null)
      const allEntries = await storage.getTimeEntriesByTask(task.id);
      const pausedTimer = allEntries.find(entry => 
        !entry.isRunning && 
        entry.endTime === null &&
        entry.notes && entry.notes.includes("pausado")
      );
      
      if (!pausedTimer) {
        return res.status(400).json({ message: "Nenhum timer pausado encontrado para esta tarefa" });
      }
      
      // Resume timer by setting isRunning back to true
      const updates = {
        isRunning: true,
        notes: pausedTimer.notes?.replace(" (pausado)", "") || "Retomado via WhatsApp"
      };
      
      const resumedEntry = await storage.updateTimeEntry(pausedTimer.id, updates);
      
      res.json({
        message: "Timer retomado com sucesso",
        entry: resumedEntry,
        task
      });
    } catch (error) {
      console.error("Erro ao retomar timer:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // WhatsApp Integration routes (single instance)
  app.get("/api/whatsapp/integration", async (req, res) => {
    try {
      const integration = await storage.getWhatsappIntegration();
      
      if (!integration) {
        return res.status(404).json({ message: "Integração WhatsApp não encontrada" });
      }
      
      // Não retornar a API key por segurança, mas indicar se existe
      const { apiKey, ...safeIntegration } = integration;
      res.json({
        ...safeIntegration,
        hasApiKey: !!(apiKey && apiKey.trim().length > 0)
      });
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar integração WhatsApp" });
    }
  });

  app.post("/api/whatsapp/integration", async (req, res) => {
    try {
      console.log("🔄 Criando integração WhatsApp:", JSON.stringify(req.body, null, 2));
      
      // Validação com logging detalhado
      const validatedData = insertWhatsappIntegrationSchema.parse(req.body);
      console.log("✅ Dados validados:", JSON.stringify(validatedData, null, 2));
      
      // Verificar se já existe integração ativa (single instance)
      const existing = await storage.getWhatsappIntegration();
      if (existing) {
        console.log("❌ Já existe integração:", existing.id);
        return res.status(400).json({ message: "Já existe integração WhatsApp ativa" });
      }
      
      console.log("🔄 Criando no banco de dados...");
      const integration = await storage.createWhatsappIntegration(validatedData);
      console.log("✅ Integração criada com sucesso:", integration.id);
      
      // Não retornar a API key
      const { apiKey, ...safeIntegration } = integration;
      res.status(201).json(safeIntegration);
    } catch (error: any) {
      console.error("❌ ERRO DETALHADO ao criar integração:");
      console.error("Tipo do erro:", error?.constructor?.name || 'unknown');
      console.error("Mensagem:", error?.message || 'no message');
      console.error("Stack:", error?.stack || 'no stack');
      
      if (error instanceof z.ZodError) {
        console.error("Erros de validação Zod:", error.errors);
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors,
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: "Falha ao criar integração WhatsApp", 
        error: errorMessage,
        type: error?.constructor?.name || 'unknown'
      });
    }
  });

  app.put("/api/whatsapp/integration/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let updates = req.body;
      
      // Se a API key está mascarada ou vazia, não incluir na atualização
      if (!updates.apiKey || updates.apiKey.trim() === '' || updates.apiKey.includes('••••')) {
        const { apiKey, ...updatesWithoutApiKey } = updates;
        updates = updatesWithoutApiKey;
        console.log("🔐 API key preservada (não incluída na atualização)");
      }
      
      console.log("Atualizando integração:", id, updates);
      
      const integration = await storage.updateWhatsappIntegration(id, updates);
      
      if (!integration) {
        return res.status(404).json({ message: "Integração não encontrada" });
      }
      
      const { apiKey, ...safeIntegration } = integration;
      res.json(safeIntegration);
    } catch (error) {
      console.error("Erro ao atualizar integração WhatsApp:", error);
      res.status(500).json({ message: "Falha ao atualizar integração WhatsApp" });
    }
  });

  app.delete("/api/whatsapp/integration/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWhatsappIntegration(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Integração não encontrada" });
      }
      
      res.json({ message: "Integração removida com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Falha ao remover integração WhatsApp" });
    }
  });



  // Logs do WhatsApp
  app.get("/api/whatsapp/logs/:integrationId", async (req, res) => {
    try {
      const integrationId = parseInt(req.params.integrationId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await storage.getWhatsappLogs(integrationId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar logs WhatsApp" });
    }
  });

  // Notification Settings routes (single instance)
  app.get("/api/notifications/settings", async (req, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      
      if (!settings) {
        return res.status(404).json({ message: "Configurações de notificação não encontradas" });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar configurações de notificação" });
    }
  });

  app.post("/api/notifications/settings", async (req, res) => {
    try {
      const validatedData = insertNotificationSettingsSchema.parse(req.body);
      const settings = await storage.createNotificationSettings(validatedData);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Falha ao criar configurações de notificação" });
    }
  });

  app.put("/api/notifications/settings", async (req, res) => {
    try {
      const updates = req.body;
      
      const settings = await storage.updateNotificationSettings(updates);
      
      if (!settings) {
        return res.status(404).json({ message: "Configurações não encontradas" });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Falha ao atualizar configurações de notificação" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
