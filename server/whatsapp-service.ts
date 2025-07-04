import { storage } from "./storage";
import axios from 'axios';
import type { 
  WhatsappIntegration, 
  Task, 
  TimeEntry, 
  TaskWithStats 
} from "@shared/schema";

export class WhatsappService {
  // Sistema de contexto para interações sequenciais
  private userContexts: Map<string, {
    lastCommand: string;
    taskList?: TaskWithStats[];
    timestamp: number;
  }> = new Map();

  // Normalizar número de telefone para comparação (5531999999999)
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@g.us', '');
  }

  private getContextKey(integrationId: number, phoneNumber: string): string {
    return `${integrationId}-${phoneNumber}`;
  }

  private setUserContext(integrationId: number, phoneNumber: string, command: string, taskList?: TaskWithStats[]): void {
    const key = this.getContextKey(integrationId, phoneNumber);
    this.userContexts.set(key, {
      lastCommand: command,
      taskList,
      timestamp: Date.now()
    });
  }

  private getUserContext(integrationId: number, phoneNumber: string): { lastCommand: string; taskList?: TaskWithStats[]; timestamp: number } | null {
    const key = this.getContextKey(integrationId, phoneNumber);
    const context = this.userContexts.get(key);
    
    // Limpar contextos antigos (mais de 10 minutos)
    if (context && Date.now() - context.timestamp > 600000) {
      this.userContexts.delete(key);
      return null;
    }
    
    return context || null;
  }

  private async sendMessage(integration: WhatsappIntegration, phoneNumber: string, message: string): Promise<boolean> {
    try {
      // 🔒 PRIMEIRA CAMADA: Validar se é envio para grupo
      if (phoneNumber.includes('@g.us')) {
        // Se for modo grupo e o JID for o autorizado, permite
        if (integration.responseMode === 'group' && phoneNumber === integration.allowedGroupJid) {
          console.log(`✅ GRUPO AUTORIZADO: Enviando para grupo configurado ${phoneNumber}`);
        } else {
          console.error(`🚫 BLOQUEIO GRUPO: Tentativa de envio para grupo não autorizado ${phoneNumber}`);
          await this.logSecurityEvent(integration.id, phoneNumber, message, 'BLOCKED_GROUP_SEND_ATTEMPT');
          throw new Error(`SEGURANÇA: Bloqueado envio para grupo não autorizado ${phoneNumber}`);
        }
      }
      
      // 🔒 SEGUNDA CAMADA: Validar formato de número (individual ou grupo autorizado)
      if (!phoneNumber.includes('@c.us') && !phoneNumber.includes('@s.whatsapp.net') && !phoneNumber.includes('@g.us')) {
        console.error(`🚫 BLOQUEIO FORMATO: Número "${phoneNumber}" não é formato válido`);
        await this.logSecurityEvent(integration.id, phoneNumber, message, 'BLOCKED_INVALID_NUMBER_FORMAT');
        return false;
      }

      // 🔒 TERCEIRA CAMADA: Verificar se o destino é autorizado
      const isValidDestination = await this.validateMessageDestination(integration, phoneNumber);
      if (!isValidDestination) {
        console.error(`🚫 ENVIO BLOQUEADO: Destino não autorizado "${phoneNumber}"`);
        await this.logSecurityEvent(integration.id, phoneNumber, message, 'BLOCKED_UNAUTHORIZED_DESTINATION');
        return false;
      }

      console.log(`✅ ENVIO SEGURO APROVADO: ${phoneNumber} -> "${message.substring(0, 50)}..."`);
      
      // ✅ Confirmação: sempre será individual
      console.log(`📤 TIPO CONFIRMADO: INDIVIDUAL (${phoneNumber})`);
      
      const url = `${integration.apiUrl}/message/sendText/${integration.instanceName}`;
      
      // Preservar formatação WhatsApp completa
      const sanitizedMessage = message
        .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '•') // Normalizar bullet points para •
        .replace(/[^\x20-\x7E\u00A0-\u017F\u2022\*\n\r]/g, '') // Manter ASCII + Latin-1 + bullet + asteriscos + quebras
        .trim() || 'Comando processado com sucesso';
      
      console.log(`🔍 DEBUG ENCODING:`, {
        firstChar: sanitizedMessage.charAt(0),
        firstCharCode: sanitizedMessage.charCodeAt(0),
        length: sanitizedMessage.length,
        preview: sanitizedMessage.substring(0, 50)
      });
      
      // ✅ LOG DE AUDITORIA antes do envio
      await this.logSecurityEvent(integration.id, phoneNumber, message, 'MESSAGE_SENT');
      
      // Usar axios para melhor controle de encoding
      const axiosPayload = {
        number: phoneNumber,
        text: sanitizedMessage
      };
      
      console.log(`🔍 PAYLOAD AXIOS:`, JSON.stringify(axiosPayload).substring(0, 100));
      // Sanitizar API key para remover caracteres inválidos
      const cleanApiKey = integration.apiKey?.trim().replace(/[^\x20-\x7E]/g, '') || '';
      
      console.log(`🔍 DEBUG API KEY:`, {
        hasApiKey: !!integration.apiKey,
        apiKeyLength: integration.apiKey?.length || 0,
        cleanApiKeyLength: cleanApiKey.length,
        isEmpty: !cleanApiKey
      });
      
      console.log(`🔍 AXIOS CONFIG:`, {
        url,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'apikey': cleanApiKey ? '••••••••••••••••' : 'EMPTY'
        }
      });
      
      const response = await axios.post(url, axiosPayload, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'apikey': cleanApiKey,
        },
        timeout: 10000
      });

      console.log(`📤 RESPOSTA EVOLUTION API: ${response.status} - ${JSON.stringify(response.data)}`);

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
      await this.logSecurityEvent(integration.id, phoneNumber, message, 'SEND_ERROR');
      return false;
    }
  }

  // 🔒 VALIDAÇÃO ULTRA RESTRITIVA: Só envia para números configurados
  private async validateMessageDestination(integration: WhatsappIntegration, phoneNumber: string): Promise<boolean> {
    try {
      const responseMode = integration.responseMode || 'individual';
      
      if (responseMode === 'group') {
        // 📢 MODO GRUPO: APENAS o JID específico configurado
        if (!integration.allowedGroupJid) {
          console.error(`🚫 ENVIO BLOQUEADO: Modo grupo mas JID não configurado`);
          await this.logSecurityEvent(integration.id, phoneNumber, '', 'BLOCKED_NO_GROUP_CONFIGURED');
          return false;
        }
        
        if (phoneNumber.includes('@g.us')) {
          if (phoneNumber === integration.allowedGroupJid) {
            console.log(`✅ ENVIO AUTORIZADO PARA GRUPO CONFIGURADO: ${phoneNumber}`);
            return true;
          } else {
            console.error(`🚫 ENVIO BLOQUEADO: Grupo diferente do configurado (${phoneNumber}) - Configurado: ${integration.allowedGroupJid}`);
            await this.logSecurityEvent(integration.id, phoneNumber, '', 'BLOCKED_UNAUTHORIZED_GROUP');
            return false;
          }
        }
        
        // No modo grupo, ainda permite mensagens individuais para números autorizados
        if (!integration.authorizedNumbers || integration.authorizedNumbers.trim() === '') {
          console.error(`🚫 ENVIO BLOQUEADO: Números autorizados não configurados`);
          return false;
        }

        const authorizedNumbers = JSON.parse(integration.authorizedNumbers);
        
        // Normalizar números para comparação
        const normalizedSender = this.normalizePhoneNumber(phoneNumber);
        const normalizedAuthorized = authorizedNumbers.map((n: string) => this.normalizePhoneNumber(n));
        
        if (!normalizedAuthorized.includes(normalizedSender)) {
          console.error(`🚫 ENVIO BLOQUEADO: "${phoneNumber}" (normalizado: ${normalizedSender}) não está na lista autorizada`);
          console.error(`Lista autorizada normalizada:`, normalizedAuthorized);
          return false;
        }

        console.log(`✅ ENVIO AUTORIZADO PARA INDIVIDUAL NO MODO GRUPO: "${phoneNumber}"`);
        return true;
        
      } else {
        // 📱 MODO INDIVIDUAL: NUNCA envia para grupos
        if (phoneNumber.includes('@g.us')) {
          console.error(`🚫 ENVIO BLOQUEADO: Tentativa de envio para grupo no modo individual (${phoneNumber})`);
          await this.logSecurityEvent(integration.id, phoneNumber, '', 'BLOCKED_GROUP_IN_INDIVIDUAL_MODE');
          return false;
        }

        // Validar números autorizados
        if (!integration.authorizedNumbers || integration.authorizedNumbers.trim() === '') {
          console.error(`🚫 ENVIO BLOQUEADO: Números autorizados não configurados`);
          return false;
        }

        const authorizedNumbers = JSON.parse(integration.authorizedNumbers);
        
        if (!Array.isArray(authorizedNumbers) || authorizedNumbers.length === 0) {
          console.error(`🚫 ENVIO BLOQUEADO: Lista de números está vazia`);
          return false;
        }

        // Normalizar números para comparação
        const normalizedSender = this.normalizePhoneNumber(phoneNumber);
        const normalizedAuthorized = authorizedNumbers.map((n: string) => this.normalizePhoneNumber(n));
        
        if (!normalizedAuthorized.includes(normalizedSender)) {
          console.error(`🚫 ENVIO BLOQUEADO: "${phoneNumber}" (normalizado: ${normalizedSender}) não está na lista autorizada`);
          console.error(`Lista autorizada normalizada:`, normalizedAuthorized);
          return false;
        }

        console.log(`✅ ENVIO AUTORIZADO PARA INDIVIDUAL: "${phoneNumber}"`);
        return true;
      }
      
    } catch (error) {
      console.error(`🚫 ENVIO BLOQUEADO: Erro na validação - ${error}`);
      return false;
    }
  }

  // ✅ NOVA FUNÇÃO: Log de eventos de segurança (TEMPORARIAMENTE DESABILITADO)
  private async logSecurityEvent(integrationId: number, destination: string, message: string, event: string): Promise<void> {
    // Logs temporariamente desabilitados para evitar loop
    console.log(`🔒 LOG SEGURANÇA: ${event} para ${destination}`);
  }

  // 🔒 VALIDAÇÃO ULTRA RESTRITIVA: Só processa se número estiver configurado
  private validateIncomingMessage(integration: WhatsappIntegration, senderNumber: string, groupJid?: string, message?: string): { isValid: boolean; reason: string } {
    try {
      const responseMode = integration.responseMode || 'individual';
      
      // Validar se há números autorizados configurados
      if (!integration.authorizedNumbers || integration.authorizedNumbers.trim() === '') {
        return {
          isValid: false,
          reason: 'Nenhum número autorizado configurado - sistema bloqueado'
        };
      }

      const authorizedNumbers = JSON.parse(integration.authorizedNumbers);
      
      if (!Array.isArray(authorizedNumbers) || authorizedNumbers.length === 0) {
        return {
          isValid: false,
          reason: 'Lista de números autorizados está vazia - sistema bloqueado'
        };
      }

      // Validar se número está autorizado (normalizar formatos @c.us e @s.whatsapp.net)
      const normalizedSender = this.normalizePhoneNumber(senderNumber);
      const normalizedAuthorized = authorizedNumbers.map((num: string) => this.normalizePhoneNumber(num));
      
      console.log(`🔍 VALIDAÇÃO NÚMEROS:`, {
        senderOriginal: senderNumber,
        senderNormalizado: normalizedSender,
        listaAutorizada: authorizedNumbers,
        listaNormalizada: normalizedAuthorized,
        match: normalizedAuthorized.includes(normalizedSender)
      });
      
      if (!normalizedAuthorized.includes(normalizedSender)) {
        return {
          isValid: false,
          reason: `Número "${senderNumber}" (normalizado: ${normalizedSender}) não autorizado. Lista: ${JSON.stringify(normalizedAuthorized)}`
        };
      }

      // Validar mensagem
      if (!message || message.trim().length === 0) {
        return {
          isValid: false,
          reason: 'Mensagem vazia'
        };
      }

      if (responseMode === 'individual') {
        // 📱 MODO INDIVIDUAL: Só aceita mensagens diretas (sem grupo)
        if (groupJid) {
          return {
            isValid: false,
            reason: `Modo individual: mensagens de grupo são ignoradas (grupo: ${groupJid})`
          };
        }
        
        return {
          isValid: true,
          reason: `Modo individual: mensagem direta aceita de ${senderNumber}`
        };
        
      } else {
        // 📢 MODO GRUPO: Só aceita mensagens do grupo configurado
        if (!integration.allowedGroupJid) {
          return {
            isValid: false,
            reason: 'Modo grupo: JID do grupo não configurado'
          };
        }
        
        // Validar se mensagem veio do grupo configurado
        if (!groupJid) {
          return {
            isValid: false,
            reason: 'Modo grupo: comando deve vir de um grupo, não mensagem direta'
          };
        }
        
        if (groupJid !== integration.allowedGroupJid) {
          return {
            isValid: false,
            reason: `Modo grupo: comando deve vir do grupo configurado (${integration.allowedGroupJid}), recebido de: ${groupJid}`
          };
        }
        
        return {
          isValid: true,
          reason: `Modo grupo: comando aceito de ${senderNumber} no grupo autorizado ${groupJid}`
        };
      }
      
    } catch (error) {
      return {
        isValid: false,
        reason: 'Erro na validação - sistema bloqueado por segurança'
      };
    }
  }

  // 🔒 ULTRA SEGURO: Sempre responder para número individual, NUNCA para grupo
  private determineResponseTarget(integration: WhatsappIntegration, senderNumber: string, groupJid?: string): string {
    // Verificar modo de resposta configurado
    const responseMode = integration.responseMode || 'individual';
    
    if (responseMode === 'group') {
      // 🔄 MODO GRUPO: Responder no grupo configurado
      if (!integration.allowedGroupJid) {
        console.error(`🚫 ERRO CONFIGURAÇÃO: Modo grupo ativo mas JID não configurado`);
        throw new Error(`CONFIGURAÇÃO: JID do grupo não configurado`);
      }
      
      // Validar se o JID é realmente um grupo
      if (!integration.allowedGroupJid.includes('@g.us')) {
        console.error(`🚫 ERRO CONFIGURAÇÃO: JID "${integration.allowedGroupJid}" não é um grupo válido`);
        throw new Error(`CONFIGURAÇÃO: JID deve ser um grupo (@g.us)`);
      }
      
      console.log(`📢 RESPOSTA PARA GRUPO: ${integration.allowedGroupJid}`);
      return integration.allowedGroupJid;
      
    } else {
      // 📱 MODO INDIVIDUAL: Responder sempre no privado
      // Validar se é número individual válido
      if (!senderNumber.includes('@c.us') && !senderNumber.includes('@s.whatsapp.net')) {
        console.error(`🚫 BLOQUEIO: Formato de número inválido ${senderNumber}`);
        throw new Error(`FORMATO: Número inválido ${senderNumber}`);
      }
      
      console.log(`📱 RESPOSTA INDIVIDUAL PARA: ${senderNumber}`);
      return senderNumber;
    }
  }

  async processIncomingMessage(integrationId: number, phoneNumber: string, message: string, messageId?: string, groupJid?: string): Promise<void> {
    console.log(`🔥 INICIANDO PROCESSAMENTO:`, { 
      integrationId, 
      phoneNumber, 
      message, 
      messageId,
      groupJid, 
      groupJidType: typeof groupJid,
      isGroupMessage: !!groupJid 
    });
    
    // Single instance approach
    const integration = await storage.getWhatsappIntegration();
    if (!integration) {
      console.log(`📱 INTEGRAÇÃO NÃO ENCONTRADA`);
      return;
    }

    console.log(`📱 INTEGRAÇÃO ENCONTRADA:`, {
      id: integration.id,
      responseMode: integration.responseMode,
      authorizedNumbers: integration.authorizedNumbers,
      allowedGroupJid: integration.allowedGroupJid,
      hasApiKey: !!integration.apiKey,
      apiKeyLength: integration.apiKey?.length || 0
    });

    // ✅ VALIDAÇÃO DE SEGURANÇA AVANÇADA (agora por número individual)
    console.log(`🔧 TESTE NORMALIZAÇÃO CORRIGIDO:`, {
      phoneNumber,
      authorizedNumbers: integration.authorizedNumbers,
      normalizedSender: this.normalizePhoneNumber(phoneNumber),
      authorizedParsed: JSON.parse(integration.authorizedNumbers || '[]'),
      normalizedAuthorized: JSON.parse(integration.authorizedNumbers || '[]').map((n: string) => this.normalizePhoneNumber(n))
    });
    
    const securityValidation = this.validateIncomingMessage(integration, phoneNumber, groupJid, message);
    if (!securityValidation.isValid) {
      console.log(`🚫 MENSAGEM BLOQUEADA: ${securityValidation.reason}`);
      return;
    }

    console.log(`✅ MENSAGEM AUTORIZADA: ${securityValidation.reason}`);

    // 🎯 DETERMINAR NÚMERO DE RESPOSTA (sempre individual para máxima segurança)
    const responseTarget = this.determineResponseTarget(integration, phoneNumber, groupJid);
    console.log(`📱 RESPOSTA SERÁ ENVIADA PARA: ${responseTarget}`);

    // Verificar se é uma resposta numérica para seleção interativa
    const numericResponse = this.parseNumericResponse(message);
    if (numericResponse) {
      const context = this.getUserContext(integrationId, phoneNumber);
      if (context && context.taskList && context.lastCommand === 'tarefas') {
        const response = await this.handleTaskSelection(numericResponse, context.taskList, integrationId, phoneNumber);
        // 🎯 Resposta interativa também vai para número individual
        const responseTarget = this.determineResponseTarget(integration, phoneNumber, groupJid);
        await this.sendMessage(integration, responseTarget, response);
        return;
      }
    }

    const command = this.extractCommand(message);
    let response = '';

    try {
      switch (command.action) {
        case 'help':
        case 'ajuda':
          response = this.getHelpMessage();
          break;

        case 'tarefas':
        case 'tasks':
        case 'listar':
        case 'list':
          const tasksList = await this.getTasksList();
          response = tasksList.response;
          // Salvar contexto para permitir seleção interativa
          this.setUserContext(integrationId, phoneNumber, 'tarefas', tasksList.tasks);
          break;

        case 'criar':
        case 'nova':
          response = await this.createTask(command.params);
          break;

        case 'multiplas':
        case 'batch':
        case 'varias':
        case 'lote':
          response = await this.createMultipleTasks(command.params);
          break;

        case 'iniciar':
        case 'start':
          response = await this.startTimer(command.params);
          break;

        case 'parar':
        case 'stop':
          response = await this.stopTimer(command.params);
          break;

        case 'pausar':
        case 'pause':
          response = await this.pauseTimer(command.params);
          break;

        case 'retomar':
        case 'resume':
          response = await this.resumeTimer(command.params);
          break;

        case 'apontar':
        case 'lancamento':
        case 'lancar':
          response = await this.logTime(command.params);
          break;

        case 'concluir':
        case 'finalizar':
          response = await this.completeTask(command.params);
          break;

        case 'reabrir':
        case 'reativar':
          response = await this.reopenTask(command.params);
          break;

        case 'apontar-concluir':
        case 'lancar-concluir':
        case 'finalizar-com-tempo':
          response = await this.logTimeAndComplete(command.params);
          break;

        case 'resumo':
        case 'relatorio':
        case 'report':
          response = await this.generateReport(command.params);
          break;

        case 'status':
          response = await this.getStatus();
          break;

        default:
          response = `❓ Comando não reconhecido: "${message}"\n\nDigite *ajuda* para ver os comandos disponíveis.`;
      }

      console.log(`📱 COMANDO PROCESSADO: "${command.action}" -> resposta: "${response.substring(0, 100)}..."`);
      
      // 🎯 ENVIAR RESPOSTA PARA NÚMERO INDIVIDUAL (máxima segurança)
      const enviado = await this.sendMessage(integration, responseTarget, response);
      console.log(`📱 MENSAGEM ENVIADA PARA ${responseTarget}: ${enviado ? 'SUCESSO' : 'FALHA'}`);

      // Log da interação - temporariamente desabilitado para evitar conflitos de schema
      console.log(`📱 LOG SUCESSO: ${command.action} -> ${responseTarget}`);

    } catch (error) {
      const errorMessage = `❌ Erro ao processar comando: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      await this.sendMessage(integration, responseTarget, errorMessage);

      // Log temporariamente desabilitado para evitar loop
      console.log(`❌ LOG ERROR: ${command.action} - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private extractCommand(message: string): { action: string; params: string[] } {
    const normalized = message.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    const action = words[0];
    const params = words.slice(1);

    return { action, params };
  }

  private parseNumericResponse(message: string): { taskNumber: number; action: string; params?: string[] } | null {
    const trimmed = message.trim();
    
    // Detectar padrões como: "1", "2 iniciar", "3 concluir", "1 lancamento 2h"
    const patterns = [
      /^(\d+)$/,                           // Apenas número
      /^(\d+)\s+(iniciar|start)$/i,        // Número + iniciar
      /^(\d+)\s+(parar|stop)$/i,           // Número + parar  
      /^(\d+)\s+(concluir|complete)$/i,    // Número + concluir
      /^(\d+)\s+(reabrir|reopen)$/i,       // Número + reabrir
      /^(\d+)\s+(lancamento|log)\s+(.+)$/i // Número + lancamento + tempo
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const taskNumber = parseInt(match[1]);
        let action = 'menu'; // ação padrão para apenas número
        let params: string[] = [];
        
        if (match[2]) {
          action = match[2].toLowerCase();
          if (match[3]) {
            params = [match[3]];
          }
        }
        
        return { taskNumber, action, params };
      }
    }
    
    return null;
  }

  private async handleTaskSelection(selection: { taskNumber: number; action: string; params?: string[] }, taskList: TaskWithStats[], integrationId: number, phoneNumber: string): Promise<string> {
    if (selection.taskNumber < 1 || selection.taskNumber > taskList.length) {
      return `❌ Número inválido. Digite um número entre 1 e ${taskList.length}.`;
    }
    
    const selectedTask = taskList[selection.taskNumber - 1];
    
    switch (selection.action) {
      case 'menu':
        return this.showTaskMenu(selectedTask);
      
      case 'iniciar':
      case 'start':
        return await this.startTimerForTask(selectedTask);
      
      case 'parar':
      case 'stop':
        return await this.stopTimerForTask(selectedTask);
      
      case 'concluir':
      case 'complete':
        return await this.completeTaskById(selectedTask.id);
      
      case 'reabrir':
      case 'reopen':
        return await this.reopenTaskById(selectedTask.id);
      
      case 'apontar':
      case 'lancamento':
      case 'log':
        if (!selection.params || selection.params.length === 0) {
          return `❌ Informe o tempo para apontamento.\n\n*Exemplo:* ${selection.taskNumber} apontar 2h`;
        }
        return await this.logTimeForTask(selectedTask, selection.params[0]);
      
      default:
        return this.showTaskMenu(selectedTask);
    }
  }

  private showTaskMenu(task: TaskWithStats): string {
    const hours = Math.floor(task.totalTime / 3600);
    const minutes = Math.floor((task.totalTime % 3600) / 60);
    const isRunning = task.activeEntries > 0;
    const taskCode = `T${task.id}`;
    
    let menu = `📋 *${task.name}* (${taskCode})\n`;
    menu += `⏱️ ${hours}h ${minutes}min\n`;
    
    if (isRunning) {
      menu += `🔴 RODANDO\n\n`;
      menu += `• *parar* - Para timer\n`;
    } else {
      menu += `⚪ PARADO\n\n`;
      menu += `• *iniciar* - Liga timer\n`;
    }
    
    menu += `• *concluir* - Finaliza\n`;
    menu += `• *apontar ${taskCode} 30m* - Adiciona tempo`;
    
    return menu;
  }

  private async startTimerForTask(task: TaskWithStats): Promise<string> {
    return await this.startTimer([task.id.toString()]);
  }

  private async stopTimerForTask(task: TaskWithStats): Promise<string> {
    return await this.stopTimer([task.id.toString()]);
  }

  private async completeTaskById(taskId: number): Promise<string> {
    return await this.completeTask([taskId.toString()]);
  }

  private async reopenTaskById(taskId: number): Promise<string> {
    return await this.reopenTask([taskId.toString()]);
  }

  private async logTimeForTask(task: TaskWithStats, timeStr: string): Promise<string> {
    return await this.logTime([task.id.toString(), timeStr]);
  }

  private getHelpMessage(): string {
    return `🤖 *PONTUAL - Comandos Simplificados*

📋 *VER TAREFAS:*
• *tarefas* - Lista com códigos (T5, T6...)

⏱️ *TIMER:*
• *iniciar T5* - Liga timer da tarefa
• *pausar T5* - Pausa timer (mantém tempo)
• *retomar T5* - Continua timer pausado
• *parar T5* - Para timer da tarefa

📝 *APONTAR TEMPO:*
• *apontar T5 2h* - Registra 2 horas
• *apontar T5 30m* - Registra 30 minutos
• *apontar T5 1h30m* - Uma hora e meia
• *apontar T5 14:00 16:30* - Das 14:00 às 16:30
• *apontar T5 ontem 9:00 12:00* - Ontem das 9h às 12h

✅ *GERENCIAR:*
• *nova Reunião* - Cria tarefa
• *multiplas Reunião | Desenvolvimento | Testes* - Várias de uma vez
• *concluir T5* - Finaliza tarefa
• *status* - Timers rodando
• *resumo* - Relatório hoje

💡 *EXEMPLOS PRÁTICOS:*
• *apontar T6 1.5h* - Uma hora e meia
• *apontar T6 08:30 12:00* - Manhã toda
• *apontar T6 segunda 14:00 17:00* - Segunda à tarde`;
  }

  private async getTasksList(): Promise<{ response: string; tasks: TaskWithStats[] }> {
    const tasks = await storage.getAllTasks();
    
    // Filtrar apenas tarefas ativas (não concluídas)
    const activeTasks = tasks.filter(t => t.isActive && !t.isCompleted);
    
    if (activeTasks.length === 0) {
      return {
        response: "📋 Nenhuma tarefa ativa encontrada.\n\nUse *nova [nome]* para criar uma tarefa.",
        tasks: []
      };
    }

    let message = "📋 *Suas Tarefas Ativas:*\n\n";

    activeTasks.forEach((task, index) => {
      const totalTime = Math.floor(task.totalTime / 3600);
      const minutes = Math.floor((task.totalTime % 3600) / 60);
      const isRunning = task.activeEntries > 0 ? "⏱️" : "";
      
      const taskNumber = index + 1;
      const taskCode = `T${task.id}`;
      message += `${taskNumber}. ${task.name} (${taskCode}) ${isRunning}\n`;
      if (totalTime > 0 || minutes > 0) {
        message += `   └ ${totalTime}h ${minutes}min trabalhadas\n`;
      }
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 3) {
          message += `   ⚠️ Prazo: ${deadline.toLocaleDateString('pt-BR')}\n`;
        }
      }
    });

    message += "\n⚡ *COMO USAR:*\n";
    message += "• *1 iniciar* - Liga timer\n";
    message += "• *2 parar* - Para timer\n";
    message += "• *3 concluir* - Finaliza tarefa\n";
    message += "• *apontar T5 2h* - Registra tempo por código";
    
    return {
      response: message,
      tasks: activeTasks
    };
  }

  private async createTask(params: string[]): Promise<string> {
    if (params.length === 0) {
      return "❌ Por favor, informe o nome da tarefa.\n\n*Exemplos:*\n• nova Reunião com cliente\n• nova Desenvolvimento Frontend --desc \"Criar tela de login\" --tempo 4h --prazo 2025-07-05\n• nova Projeto X --cor verde --tempo 2h30min\n\n*Parâmetros opcionais:*\n--desc: Descrição\n--tempo: Tempo estimado (ex: 2h, 90min, 1h30min)\n--prazo: Data limite (AAAA-MM-DD)\n--cor: azul, verde, amarelo, vermelho, roxo";
    }

    // Parse parameters
    const input = params.join(' ');
    const taskData = this.parseTaskCreationInput(input);
    
    if (!taskData.name) {
      return "❌ Nome da tarefa é obrigatório.\n\n*Exemplo:* nova Reunião com cliente";
    }
    
    try {
      const task = await storage.createTask({
        name: taskData.name,
        description: taskData.description || 'Criada via WhatsApp',
        color: taskData.color || '#3B82F6',
        isActive: true,
        deadline: taskData.deadline || null,
        estimatedHours: taskData.estimatedHours || null,
      });

      let response = `✅ Tarefa criada com sucesso!\n\n📋 *${task.name}*\nID: ${task.id}`;
      
      if (taskData.description && taskData.description !== 'Criada via WhatsApp') {
        response += `\n📝 ${taskData.description}`;
      }
      
      if (taskData.estimatedHours) {
        const hours = Math.floor(taskData.estimatedHours);
        const minutes = Math.round((taskData.estimatedHours - hours) * 60);
        response += `\n⏱️ Tempo estimado: ${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
      }
      
      if (taskData.deadline) {
        response += `\n📅 Prazo: ${taskData.deadline.toLocaleDateString('pt-BR')}`;
      }
      
      response += `\n\nUse *iniciar ${task.id}* para começar a cronometrar.`;
      
      return response;
    } catch (error) {
      return `❌ Erro ao criar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private parseTaskCreationInput(input: string): {
    name: string;
    description?: string;
    estimatedHours?: number;
    deadline?: Date;
    color?: string;
  } {
    const result: any = {};
    
    // Extract parameters using --param format
    const paramRegex = /--(\w+)\s+"([^"]+)"|--(\w+)\s+(\S+)/g;
    const params: { [key: string]: string } = {};
    let match;
    
    let cleanInput = input;
    
    // Extract all parameters
    while ((match = paramRegex.exec(input)) !== null) {
      const paramName = match[1] || match[3];
      const paramValue = match[2] || match[4];
      params[paramName] = paramValue;
      
      // Remove the parameter from the input to get the clean name
      cleanInput = cleanInput.replace(match[0], '').trim();
    }
    
    // The remaining text is the task name
    result.name = cleanInput.trim();
    
    // Process description
    if (params.desc || params.descricao) {
      result.description = params.desc || params.descricao;
    }
    
    // Process estimated time
    if (params.tempo || params.time) {
      const timeStr = params.tempo || params.time;
      result.estimatedHours = this.parseTimeString(timeStr) / 3600; // Converter segundos para horas
    }
    
    // Process deadline
    if (params.prazo || params.deadline) {
      const dateStr = params.prazo || params.deadline;
      try {
        // Support formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          result.deadline = date;
        }
      } catch (error) {
        // Invalid date format, ignore
      }
    }
    
    // Process color
    if (params.cor || params.color) {
      const colorInput = (params.cor || params.color).toLowerCase();
      const colorMap: { [key: string]: string } = {
        'azul': '#3B82F6',
        'blue': '#3B82F6',
        'verde': '#10B981',
        'green': '#10B981',
        'amarelo': '#F59E0B',
        'yellow': '#F59E0B',
        'vermelho': '#EF4444',
        'red': '#EF4444',
        'roxo': '#8B5CF6',
        'purple': '#8B5CF6',
      };
      
      if (colorMap[colorInput]) {
        result.color = colorMap[colorInput];
      }
    }
    
    return result;
  }

  private async startTimer(params: string[]): Promise<string> {
    if (params.length === 0) {
      return "❌ Por favor, informe o ID ou nome da tarefa.\n\n*Exemplo:* iniciar 1";
    }

    const taskIdentifier = params.join(' ');
    const task = await this.findTask(taskIdentifier);

    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"\n\nUse *tarefas* para ver a lista.`;
    }

    // Verificar se já há timer rodando para esta tarefa
    const runningEntries = await storage.getRunningTimeEntries();
    const taskRunning = runningEntries.find(entry => entry.taskId === task.id);

    if (taskRunning) {
      return `⏱️ Timer já está rodando para "${task.name}"!\n\nUse *parar ${task.id}* para finalizar.`;
    }

    try {
      await storage.createTimeEntry({
        taskId: task.id,
        startTime: new Date(),
        endTime: null,
        isRunning: true,
        notes: 'Iniciado via WhatsApp',
      });

      return `✅ Timer iniciado para "${task.name}"!\n\n⏱️ Cronômetro rodando...\n\nUse *parar ${task.id}* para finalizar.`;
    } catch (error) {
      return `❌ Erro ao iniciar timer: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async stopTimer(params: string[]): Promise<string> {
    if (params.length === 0) {
      return "❌ Por favor, informe o ID ou nome da tarefa.\n\n*Exemplo:* parar 1";
    }

    const taskIdentifier = params.join(' ');
    const task = await this.findTask(taskIdentifier);

    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"\n\nUse *tarefas* para ver a lista.`;
    }

    const runningEntries = await storage.getRunningTimeEntries();
    const taskEntry = runningEntries.find(entry => entry.taskId === task.id);

    if (!taskEntry) {
      return `❌ Nenhum timer rodando para "${task.name}".`;
    }

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - new Date(taskEntry.startTime).getTime()) / 1000);

      // Validar tempo mínimo de 1 minuto (60 segundos)
      if (duration < 60) {
        // Se o tempo for menor que 1 minuto, deletar a entrada em vez de salvar
        await storage.deleteTimeEntry(taskEntry.id);
        return `⚠️ Timer removido para "${task.name}"!\n\n❌ Tempo inferior a 1 minuto não é registrado no histórico.\n\nInicie novamente se necessário.`;
      }

      await storage.updateTimeEntry(taskEntry.id, {
        endTime,
        duration,
        isRunning: false,
      });

      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);

      return `✅ Timer finalizado para "${task.name}"!\n\n⏱️ Tempo registrado: ${hours}h ${minutes}min`;
    } catch (error) {
      return `❌ Erro ao parar timer: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async pauseTimer(params: string[]): Promise<string> {
    if (params.length === 0) {
      return "❌ Especifique a tarefa: *pausar T5* ou *pausar 1*";
    }

    const taskIdentifier = params[0];
    const task = await this.findTask(taskIdentifier);
    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"`;
    }

    try {
      // Find running timer for this task
      const runningEntries = await storage.getRunningTimeEntries();
      const runningTimer = runningEntries.find(entry => entry.taskId === task.id);
      
      if (!runningTimer) {
        return `❌ Nenhum timer ativo encontrado para "${task.name}"`;
      }

      // Calcular duração atual para mostrar na mensagem
      const currentTime = new Date();
      const currentDuration = Math.floor((currentTime.getTime() - new Date(runningTimer.startTime).getTime()) / 1000);

      // Pause timer by setting isRunning to false but keeping endTime null for resume
      const updates = {
        isRunning: false,
        notes: runningTimer.notes ? `${runningTimer.notes} (pausado)` : "Pausado via WhatsApp"
      };
      
      await storage.updateTimeEntry(runningTimer.id, updates);

      const minutes = Math.floor(currentDuration / 60);
      const seconds = currentDuration % 60;
      
      let warningMessage = "";
      if (currentDuration < 60) {
        warningMessage = "\n\n⚠️ Tempo atual inferior a 1 minuto. Se parar agora, não será salvo no histórico.";
      }

      return `⏸️ Timer pausado para "${task.name}"!\n\n⏱️ Tempo atual: ${minutes}min ${seconds}s\n\nUse *retomar T${task.id}* para continuar.${warningMessage}`;
    } catch (error) {
      console.error("Erro ao pausar timer:", error);
      return "❌ Erro interno ao pausar timer.";
    }
  }

  private async resumeTimer(params: string[]): Promise<string> {
    if (params.length === 0) {
      return "❌ Especifique a tarefa: *retomar T5* ou *retomar 1*";
    }

    const taskIdentifier = params[0];
    const task = await this.findTask(taskIdentifier);
    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"`;
    }

    try {
      // Find paused timer for this task (isRunning = false and endTime = null)
      const allEntries = await storage.getTimeEntriesByTask(task.id);
      const pausedTimer = allEntries.find(entry => 
        !entry.isRunning && 
        entry.endTime === null &&
        entry.notes && entry.notes.includes("pausado")
      );
      
      if (!pausedTimer) {
        return `❌ Nenhum timer pausado encontrado para "${task.name}"`;
      }

      // Resume timer by setting isRunning back to true
      const updates = {
        isRunning: true,
        notes: pausedTimer.notes?.replace(" (pausado)", "") || "Retomado via WhatsApp"
      };
      
      await storage.updateTimeEntry(pausedTimer.id, updates);

      return `▶️ Timer retomado para "${task.name}"!\n\n⏱️ Cronômetro rodando novamente.`;
    } catch (error) {
      console.error("Erro ao retomar timer:", error);
      return "❌ Erro interno ao retomar timer.";
    }
  }

  private async logTime(params: string[]): Promise<string> {
    if (params.length < 2) {
      return "❌ Formato: *apontar T5 2h* ou *apontar T5 14:00 16:30*";
    }

    const taskIdentifier = params[0];
    const task = await this.findTask(taskIdentifier);
    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"`;
    }

    // Detectar formato: duração ou horário específico
    if (params.length === 2) {
      // Formato: apontar T5 2h
      return await this.logTimeDuration(task, params[1]);
    } else if (params.length >= 3) {
      // Formato: apontar T5 14:00 16:30 ou apontar T5 ontem 14:00 16:30
      return await this.logTimeRange(task, params.slice(1));
    }

    return "❌ Formato inválido. Use: *apontar T5 2h* ou *apontar T5 14:00 16:30*";
  }

  private async logTimeDuration(task: TaskWithStats, timeStr: string): Promise<string> {
    const duration = this.parseTimeString(timeStr);
    if (duration === 0) {
      return "❌ Formato de tempo inválido.\n\n*Exemplos:* 2h, 30m, 1h30m, 90min, 1.5h";
    }

    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - (duration * 1000));

      const entryData = {
        taskId: task.id,
        startTime,
        endTime: now,
        duration,
        isRunning: false,
        notes: 'Lançamento manual via WhatsApp',
      };

      const createdEntry = await storage.createTimeEntry(entryData);

      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);

      return `✅ Tempo registrado: "${task.name}"\n⏱️ ${hours}h ${minutes}min`;
    } catch (error) {
      return `❌ Erro ao registrar tempo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async logTimeRange(task: TaskWithStats, timeParams: string[]): Promise<string> {
    let dateModifier = "";
    let startTimeStr = "";
    let endTimeStr = "";

    if (timeParams.length === 2) {
      // Formato: 14:00 16:30 (hoje)
      [startTimeStr, endTimeStr] = timeParams;
    } else if (timeParams.length === 3) {
      // Formato: ontem 14:00 16:30
      [dateModifier, startTimeStr, endTimeStr] = timeParams;
    } else {
      return "❌ Formato: *apontar T5 14:00 16:30* ou *apontar T5 ontem 14:00 16:30*";
    }

    const { startTime, endTime, error } = this.parseTimeRange(dateModifier, startTimeStr, endTimeStr);
    if (error) {
      return `❌ ${error}`;
    }

    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    try {
      await storage.createTimeEntry({
        taskId: task.id,
        startTime,
        endTime,
        duration,
        isRunning: false,
        notes: 'Lançamento com horário específico via WhatsApp',
      });

      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const dateStr = startTime.toLocaleDateString('pt-BR');
      const startStr = startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const endStr = endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return `✅ Tempo registrado: "${task.name}"\n📅 ${dateStr} de ${startStr} às ${endStr}\n⏱️ Total: ${hours}h ${minutes}min`;
    } catch (error) {
      return `❌ Erro ao registrar tempo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private parseTimeRange(dateModifier: string, startTimeStr: string, endTimeStr: string): { startTime: Date; endTime: Date; error?: string } {
    const now = new Date();
    let baseDate = new Date(now);

    // Processar modificador de data
    if (dateModifier) {
      const lowerModifier = dateModifier.toLowerCase();
      if (lowerModifier === 'ontem' || lowerModifier === 'yesterday') {
        baseDate.setDate(baseDate.getDate() - 1);
      } else if (lowerModifier === 'segunda' || lowerModifier === 'monday') {
        const daysToMonday = (baseDate.getDay() + 6) % 7;
        baseDate.setDate(baseDate.getDate() - daysToMonday);
      } else if (lowerModifier === 'terça' || lowerModifier === 'tuesday') {
        const daysToTuesday = (baseDate.getDay() + 5) % 7;
        baseDate.setDate(baseDate.getDate() - daysToTuesday);
      } else if (['quarta', 'wednesday'].includes(lowerModifier)) {
        const daysToWednesday = (baseDate.getDay() + 4) % 7;
        baseDate.setDate(baseDate.getDate() - daysToWednesday);
      } else if (['quinta', 'thursday'].includes(lowerModifier)) {
        const daysToThursday = (baseDate.getDay() + 3) % 7;
        baseDate.setDate(baseDate.getDate() - daysToThursday);
      } else if (['sexta', 'friday'].includes(lowerModifier)) {
        const daysToFriday = (baseDate.getDay() + 2) % 7;
        baseDate.setDate(baseDate.getDate() - daysToFriday);
      }
    }

    // Parseaar horários
    const startTime = this.parseTimeToDate(baseDate, startTimeStr);
    const endTime = this.parseTimeToDate(baseDate, endTimeStr);

    if (!startTime || !endTime) {
      return { startTime: new Date(), endTime: new Date(), error: "Formato de horário inválido. Use HH:MM (ex: 14:30)" };
    }

    if (endTime <= startTime) {
      return { startTime: new Date(), endTime: new Date(), error: "Horário de fim deve ser depois do início" };
    }

    return { startTime, endTime };
  }

  private parseTimeToDate(baseDate: Date, timeStr: string): Date | null {
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = timeStr.match(timeRegex);
    
    if (!match) return null;
    
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private async generateReport(params: string[]): Promise<string> {
    const period = params[0] || 'hoje';
    
    try {
      const stats = await storage.getDashboardStats();
      
      let message = `📊 *Relatório - ${period}*\n\n`;
      
      if (period === 'hoje' || !period) {
        const todayHours = Math.floor(stats.todayTime / 3600);
        const todayMinutes = Math.floor((stats.todayTime % 3600) / 60);
        
        message += `⏰ *Hoje:* ${todayHours}h ${todayMinutes}min\n`;
        message += `📋 *Tarefas ativas:* ${stats.activeTasks}\n`;
        message += `✅ *Concluídas:* ${stats.completedTasks}\n`;
        
        if (stats.overdueTasks > 0) {
          message += `⚠️ *Atrasadas:* ${stats.overdueTasks}\n`;
        }
      } else if (period === 'semanal') {
        const weekHours = Math.floor(stats.weekTime / 3600);
        message += `📅 *Esta semana:* ${weekHours}h\n`;
      } else if (period === 'mensal') {
        const monthHours = Math.floor(stats.monthTime / 3600);
        message += `📅 *Este mês:* ${monthHours}h\n`;
      }

      return message;
    } catch (error) {
      return `❌ Erro ao gerar relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async completeTask(params: string[]): Promise<string> {
    if (params.length === 0) {
      return "❌ Por favor, informe o ID ou nome da tarefa.\n\n*Exemplo:* concluir 1";
    }

    const taskIdentifier = params.join(' ');
    const task = await this.findTask(taskIdentifier);

    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"\n\nUse *tarefas* para ver a lista.`;
    }

    if (task.isCompleted) {
      return `❌ Tarefa "${task.name}" já está concluída.`;
    }

    try {
      // Primeiro, finalizar qualquer timer ativo para esta tarefa
      const runningEntries = await storage.getRunningTimeEntries();
      const taskEntry = runningEntries.find(entry => entry.taskId === task.id);
      
      if (taskEntry) {
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - new Date(taskEntry.startTime).getTime()) / 1000);
        
        await storage.updateTimeEntry(taskEntry.id, {
          endTime,
          duration,
          isRunning: false,
        });
      }

      // Concluir a tarefa
      await storage.completeTask(task.id);

      return `✅ Tarefa "${task.name}" concluída com sucesso!${taskEntry ? '\n⏱️ Timer também foi finalizado.' : ''}`;
    } catch (error) {
      return `❌ Erro ao concluir tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async reopenTask(params: string[]): Promise<string> {
    if (params.length === 0) {
      return "❌ Por favor, informe o ID ou nome da tarefa.\n\n*Exemplo:* reabrir 1";
    }

    const taskIdentifier = params.join(' ');
    const task = await this.findTask(taskIdentifier);

    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"\n\nUse *tarefas* para ver a lista.`;
    }

    if (!task.isCompleted) {
      return `❌ Tarefa "${task.name}" já está ativa.`;
    }

    try {
      await storage.reopenTask(task.id);
      return `✅ Tarefa "${task.name}" reaberta com sucesso!\n\nAgora você pode continuar trabalhando nela.`;
    } catch (error) {
      return `❌ Erro ao reabrir tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async logTimeAndComplete(params: string[]): Promise<string> {
    if (params.length < 2) {
      return "❌ Por favor, informe a tarefa e o tempo.\n\n*Exemplo:* finalizar-com-tempo 1 2h\n*Ou:* lancar-concluir Reunião 1h30min";
    }

    const timeStr = params[params.length - 1];
    const taskIdentifier = params.slice(0, -1).join(' ');

    const task = await this.findTask(taskIdentifier);
    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"`;
    }

    const duration = this.parseTimeString(timeStr);
    if (duration === 0) {
      return "❌ Formato de tempo inválido.\n\n*Exemplos:* 2h, 30m, 1h30m, 90min, 1.5h";
    }

    try {
      // Lançar o tempo
      const now = new Date();
      const startTime = new Date(now.getTime() - (duration * 1000));

      await storage.createTimeEntry({
        taskId: task.id,
        startTime,
        endTime: now,
        duration,
        isRunning: false,
        notes: 'Lançamento final via WhatsApp',
      });

      // Concluir a tarefa
      await storage.completeTask(task.id);

      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);

      return `✅ Tarefa "${task.name}" finalizada!\n\n⏱️ ${hours}h ${minutes}min registrados\n🏁 Tarefa marcada como concluída`;
    } catch (error) {
      return `❌ Erro ao finalizar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async getStatus(): Promise<string> {
    try {
      const runningEntries = await storage.getRunningTimeEntries();
      
      if (runningEntries.length === 0) {
        return "💤 Nenhum timer rodando no momento.\n\nUse *iniciar [tarefa]* para começar a cronometrar.";
      }

      let message = "⏱️ *Timers Ativos:*\n\n";
      
      for (const entry of runningEntries) {
        const duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        
        message += `🟢 ${entry.task.name}\n`;
        message += `   └ ${hours}h ${minutes}min rodando\n\n`;
      }

      return message;
    } catch (error) {
      return `❌ Erro ao obter status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async findTask(identifier: string): Promise<TaskWithStats | undefined> {
    const tasks = await storage.getAllTasks();
    
    // Tentar por código da tarefa (T{id})
    if (identifier.toUpperCase().startsWith('T')) {
      const taskId = parseInt(identifier.substring(1));
      if (!isNaN(taskId)) {
        return tasks.find(t => t.id === taskId);
      }
    }
    
    // Tentar por ID numérico direto
    const taskId = parseInt(identifier);
    if (!isNaN(taskId)) {
      return tasks.find(t => t.id === taskId);
    }
    
    // Buscar por nome (case insensitive, parcial)
    const searchTerm = identifier.toLowerCase();
    return tasks.find(t => t.name.toLowerCase().includes(searchTerm));
  }

  private async createMultipleTasks(params: string[]): Promise<string> {
    if (params.length === 0) {
      return `📝 *Criar Múltiplas Atividades*\n\n*Formato:* multiplas [atividade1] | [atividade2] | [atividade3]\n\n*Exemplo:*\nmultiplas Reunião matinal | Desenvolvimento frontend | Documentação API\n\n*Com detalhes:*\nmultiplas Projeto A --tempo 2h | Projeto B --cor verde | Reunião --prazo 2025-07-10`;
    }

    const tasksText = params.join(' ');
    const taskDefinitions = tasksText.split('|').map(task => task.trim()).filter(task => task.length > 0);

    if (taskDefinitions.length < 2) {
      return `❌ Para criar múltiplas atividades, separe com "|" (pipe).\n\n*Exemplo:*\nmultiplas Reunião | Desenvolvimento | Testes`;
    }

    if (taskDefinitions.length > 10) {
      return `❌ Máximo de 10 atividades por comando.\n\nVocê tentou criar ${taskDefinitions.length} atividades.`;
    }

    const results: string[] = [];
    let sucessCount = 0;
    let errorCount = 0;

    for (let i = 0; i < taskDefinitions.length; i++) {
      const taskDef = taskDefinitions[i];
      
      try {
        // Reutilizar lógica de parseTaskCreationInput para processar parâmetros
        const taskData = this.parseTaskCreationInput(taskDef);
        
        const task = await storage.createTask({
          name: taskData.name,
          description: taskData.description || null,
          color: taskData.color || 'blue',
          estimatedHours: taskData.estimatedHours || null,
          deadline: taskData.deadline || null,
          isActive: true,
          isCompleted: false,
        });

        results.push(`✅ ${i + 1}. ${task.name} (T${task.id})`);
        sucessCount++;
        
      } catch (error) {
        results.push(`❌ ${i + 1}. ${taskDef} - Erro: ${error instanceof Error ? error.message : 'Falha'}`);
        errorCount++;
      }
    }

    let summary = `📝 *Criação em Lote Concluída*\n\n`;
    summary += `✅ Criadas: ${sucessCount}\n`;
    if (errorCount > 0) {
      summary += `❌ Falhas: ${errorCount}\n`;
    }
    summary += `\n*Resultado:*\n${results.join('\n')}`;

    if (sucessCount > 0) {
      summary += `\n\n💡 Use *tarefas* para ver todas as atividades.`;
    }

    return summary;
  }

  private parseTimeString(timeStr: string): number {
    // Converter strings como "2h", "1.5h", "90min", "30m", "1h30min" para segundos
    const hoursMatch = timeStr.match(/(\d+(?:\.\d+)?)h/);
    const minutesMatch = timeStr.match(/(\d+)(?:min|m)(?!in)/); // "min" ou "m" (mas não parte de "min")
    
    let totalSeconds = 0;
    
    if (hoursMatch) {
      totalSeconds += parseFloat(hoursMatch[1]) * 3600;
    }
    
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1]) * 60;
    }
    
    // Se não encontrou horas nem minutos, tentar apenas número seguido de "m"
    if (totalSeconds === 0) {
      const simpleMinutesMatch = timeStr.match(/^(\d+)m$/);
      if (simpleMinutesMatch) {
        totalSeconds = parseInt(simpleMinutesMatch[1]) * 60;
      }
    }
    
    return Math.floor(totalSeconds);
  }
}

export const whatsappService = new WhatsappService();