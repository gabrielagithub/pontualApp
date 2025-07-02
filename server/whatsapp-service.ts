import { storage } from "./storage";
import type { 
  WhatsappIntegration, 
  Task, 
  TimeEntry, 
  TaskWithStats 
} from "@shared/schema";

export class WhatsappService {
  private async sendMessage(integration: WhatsappIntegration, phoneNumber: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${integration.apiUrl}/message/sendText/${integration.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': integration.apiKey,
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: message
        })
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
      return false;
    }
  }

  async processIncomingMessage(integrationId: number, phoneNumber: string, message: string, messageId?: string, groupName?: string): Promise<void> {
    const integration = await storage.getWhatsappIntegration(integrationId);
    if (!integration) return;

    // Filtrar por grupo específico se configurado
    if (integration.restrictToGroup && integration.allowedGroupName) {
      if (!groupName || groupName !== integration.allowedGroupName) {
        console.log(`📱 Mensagem ignorada - grupo "${groupName}" não autorizado. Permitido: "${integration.allowedGroupName}"`);
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
          response = await this.getTasksList();
          break;

        case 'criar':
        case 'nova':
          response = await this.createTask(command.params);
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

        case 'lancar-concluir':
        case 'finalizar-com-tempo':
          response = await this.logTimeAndComplete(command.params);
          break;

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

      await this.sendMessage(integration, phoneNumber, response);

      // Log da interação
      await storage.createWhatsappLog({
        integrationId,
        messageId,
        messageType: 'text',
        messageContent: message,
        command: command.action,
        response,
        success: true,
      });

    } catch (error) {
      const errorMessage = `❌ Erro ao processar comando: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      await this.sendMessage(integration, phoneNumber, errorMessage);

      await storage.createWhatsappLog({
        integrationId,
        messageId,
        messageType: 'text',
        messageContent: message,
        command: command.action,
        response: errorMessage,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  private extractCommand(message: string): { action: string; params: string[] } {
    const normalized = message.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    const action = words[0];
    const params = words.slice(1);

    return { action, params };
  }

  private getHelpMessage(): string {
    return `🤖 *Pontual - Comandos WhatsApp*

📋 *Gestão de Tarefas:*
• *tarefas* - Listar tarefas ativas
• *nova [nome]* - Criar tarefa simples
• *nova [nome] --desc "descrição" --tempo 2h --prazo 2025-07-05 --cor verde* - Criar tarefa completa
• *concluir [tarefa]* - Finalizar tarefa
• *reabrir [tarefa]* - Reativar tarefa concluída

⏱️ *Controle de Tempo:*
• *iniciar [tarefa]* - Iniciar timer
• *parar [tarefa]* - Parar timer
• *pausar [tarefa]* - Pausar timer
• *retomar [tarefa]* - Retomar timer

📝 *Lançamentos:*
• *lancamento [tarefa] [tempo]* - Lançar horas
• *lancar-concluir [tarefa] [tempo]* - Lançar e finalizar

📊 *Relatórios:*
• *relatorio* - Relatório de hoje
• *relatorio semanal* - Relatório da semana
• *relatorio mensal* - Relatório do mês
• *status* - Status atual dos timers

📝 *Parâmetros para Nova Tarefa:*
• *--desc*: Descrição da tarefa
• *--tempo*: Tempo estimado (2h, 90min, 1h30min)
• *--prazo*: Data limite (AAAA-MM-DD)
• *--cor*: azul, verde, amarelo, vermelho, roxo

💡 *Exemplos:*
• nova Reunião Cliente
• nova Projeto X --desc "Desenvolvimento da API" --tempo 4h --cor azul
• iniciar 2 ou iniciar Reunião

Digite qualquer comando para começar! 🚀`;
  }

  private async getTasksList(): Promise<string> {
    const tasks = await storage.getAllTasks();
    
    // Filtrar apenas tarefas ativas (não concluídas)
    const activeTasks = tasks.filter(t => t.isActive && !t.isCompleted);
    
    if (activeTasks.length === 0) {
      return "📋 Nenhuma tarefa ativa encontrada.\n\nUse *nova [nome]* para criar uma tarefa.";
    }

    let message = "📋 *Suas Tarefas Ativas:*\n\n";

    activeTasks.forEach((task, index) => {
      const totalTime = Math.floor(task.totalTime / 3600);
      const minutes = Math.floor((task.totalTime % 3600) / 60);
      const isRunning = task.activeEntries > 0 ? "⏱️" : "";
      
      message += `${task.id}. ${task.name} ${isRunning}\n`;
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

    message += "\n💡 *Dica:* Use o ID da tarefa nos comandos (ex: *iniciar 2*)";
    
    return message;
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
      result.estimatedHours = this.parseTimeString(timeStr);
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
    // Similar ao stopTimer mas mantém isRunning = false temporariamente
    return "🚧 Funcionalidade de pausar em desenvolvimento.";
  }

  private async resumeTimer(params: string[]): Promise<string> {
    // Reativar timer pausado
    return "🚧 Funcionalidade de retomar em desenvolvimento.";
  }

  private async logTime(params: string[]): Promise<string> {
    if (params.length < 2) {
      return "❌ Por favor, informe a tarefa e o tempo.\n\n*Exemplo:* lancamento 1 2.5h\n*Ou:* lancar Reunião 1h30min";
    }

    const timeStr = params[params.length - 1];
    const taskIdentifier = params.slice(0, -1).join(' ');

    const task = await this.findTask(taskIdentifier);
    if (!task) {
      return `❌ Tarefa não encontrada: "${taskIdentifier}"`;
    }

    const duration = this.parseTimeString(timeStr);
    if (duration === 0) {
      return "❌ Formato de tempo inválido.\n\n*Exemplos:* 2h, 1.5h, 90min, 1h30min";
    }

    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - (duration * 1000));

      await storage.createTimeEntry({
        taskId: task.id,
        startTime,
        endTime: now,
        duration,
        isRunning: false,
        notes: 'Lançamento manual via WhatsApp',
      });

      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);

      return `✅ Tempo lançado para "${task.name}"!\n\n⏱️ ${hours}h ${minutes}min registrados.`;
    } catch (error) {
      return `❌ Erro ao lançar tempo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
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
      return "❌ Formato de tempo inválido.\n\n*Exemplos:* 2h, 1.5h, 90min, 1h30min";
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
    
    // Tentar por ID primeiro
    const taskId = parseInt(identifier);
    if (!isNaN(taskId)) {
      return tasks.find(t => t.id === taskId);
    }
    
    // Buscar por nome (case insensitive, parcial)
    const searchTerm = identifier.toLowerCase();
    return tasks.find(t => t.name.toLowerCase().includes(searchTerm));
  }

  private parseTimeString(timeStr: string): number {
    // Converter strings como "2h", "1.5h", "90min", "1h30min" para segundos
    const hoursMatch = timeStr.match(/(\d+(?:\.\d+)?)h/);
    const minutesMatch = timeStr.match(/(\d+)min/);
    
    let totalSeconds = 0;
    
    if (hoursMatch) {
      totalSeconds += parseFloat(hoursMatch[1]) * 3600;
    }
    
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1]) * 60;
    }
    
    return Math.floor(totalSeconds);
  }
}

export const whatsappService = new WhatsappService();