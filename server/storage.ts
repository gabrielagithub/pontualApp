import { 
  tasks, taskItems, timeEntries, whatsappIntegrations, whatsappLogs, notificationSettings,
  type Task, type InsertTask, type TaskItem, type InsertTaskItem, 
  type TimeEntry, type InsertTimeEntry, type UpdateTimeEntry, type TimeEntryWithTask, type TaskWithStats,
  type WhatsappIntegration, type InsertWhatsappIntegration, type WhatsappLog, type InsertWhatsappLog,
  type NotificationSettings, type InsertNotificationSettings
} from "@shared/schema";

export interface IStorage {
  // Task methods
  getAllTasks(): Promise<TaskWithStats[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  completeTask(id: number): Promise<Task | undefined>;
  reopenTask(id: number): Promise<Task | undefined>;

  // Task item methods
  getTaskItems(taskId: number): Promise<TaskItem[]>;
  createTaskItem(item: InsertTaskItem): Promise<TaskItem>;
  updateTaskItem(id: number, updates: Partial<TaskItem>): Promise<TaskItem | undefined>;
  deleteTaskItem(id: number): Promise<boolean>;
  completeAllTaskItems(taskId: number): Promise<void>;

  // Time entry methods
  getAllTimeEntries(): Promise<TimeEntryWithTask[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  getTimeEntriesByTask(taskId: number): Promise<TimeEntry[]>;
  getRunningTimeEntries(): Promise<TimeEntryWithTask[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, updates: UpdateTimeEntry): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;
  deleteAllTimeEntries(): Promise<boolean>;
  
  // Analytics methods
  getDashboardStats(): Promise<{
    todayTime: number;
    activeTasks: number;
    weekTime: number;
    monthTime: number;
    completedTasks: number;
    overdueTasks: number;
    overTimeTasks: number;
    dueTodayTasks: number;
    dueTomorrowTasks: number;
    nearingLimitTasks: number;
  }>;
  getTimeByTask(startDate?: Date, endDate?: Date): Promise<Array<{ task: Task; totalTime: number }>>;
  getDailyStats(startDate: Date, endDate: Date): Promise<Array<{ date: string; totalTime: number }>>;

  // WhatsApp Integration methods (single instance)
  getWhatsappIntegration(): Promise<WhatsappIntegration | undefined>;
  createWhatsappIntegration(integration: InsertWhatsappIntegration): Promise<WhatsappIntegration>;
  updateWhatsappIntegration(id: number, updates: Partial<WhatsappIntegration>): Promise<WhatsappIntegration | undefined>;
  deleteWhatsappIntegration(id: number): Promise<boolean>;
  
  // WhatsApp Logs methods
  createWhatsappLog(log: InsertWhatsappLog): Promise<WhatsappLog>;
  getWhatsappLogs(integrationId: number, limit?: number): Promise<WhatsappLog[]>;
  
  // Notification Settings methods (single instance)
  getNotificationSettings(): Promise<NotificationSettings | undefined>;
  createNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings>;
  updateNotificationSettings(updates: Partial<NotificationSettings>): Promise<NotificationSettings | undefined>;
}

export class MemStorage implements IStorage {
  private tasks: Map<number, Task>;
  private taskItems: Map<number, TaskItem>;
  private timeEntries: Map<number, TimeEntry>;
  private whatsappIntegration: WhatsappIntegration | undefined;
  private whatsappLogs: Map<number, WhatsappLog>;
  private notificationSettings: NotificationSettings | undefined;
  private currentTaskId: number;
  private currentTaskItemId: number;
  private currentTimeEntryId: number;
  private currentWhatsappLogId: number;

  constructor() {
    this.tasks = new Map();
    this.taskItems = new Map();
    this.timeEntries = new Map();
    this.whatsappIntegration = undefined;
    this.whatsappLogs = new Map();
    this.notificationSettings = undefined;
    this.currentTaskId = 1;
    this.currentTaskItemId = 1;
    this.currentTimeEntryId = 1;
    this.currentWhatsappLogId = 1;
  }

  // Task methods
  async getAllTasks(): Promise<TaskWithStats[]> {
    const tasksArray = Array.from(this.tasks.values()).filter(task => task.isActive);
    const tasksWithStats: TaskWithStats[] = [];

    for (const task of tasksArray) {
      const entries = Array.from(this.timeEntries.values()).filter(entry => entry.taskId === task.id);
      const totalTime = entries.reduce((sum, entry) => {
        if (entry.duration) return sum + entry.duration;
        if (entry.isRunning && entry.startTime) {
          return sum + Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
        }
        return sum;
      }, 0);
      const activeEntries = entries.filter(entry => entry.isRunning).length;
      const items = Array.from(this.taskItems.values()).filter(item => item.taskId === task.id);

      tasksWithStats.push({
        ...task,
        totalTime,
        activeEntries,
        items,
      });
    }

    return tasksWithStats;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = {
      ...insertTask,
      description: insertTask.description || null,
      color: insertTask.color || "#3B82F6",
      estimatedHours: insertTask.estimatedHours ?? null,
      deadline: insertTask.deadline || null,
      isActive: insertTask.isActive !== undefined ? insertTask.isActive : true,
      isCompleted: false,
      completedAt: null,
      id,
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;

    // Soft delete - mark as inactive
    task.isActive = false;
    this.tasks.set(id, task);
    return true;
  }

  async completeTask(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (task) {
      const updatedTask = {
        ...task,
        isCompleted: true,
        completedAt: new Date()
      };
      this.tasks.set(id, updatedTask);
      return updatedTask;
    }
    return undefined;
  }

  async reopenTask(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (task) {
      const updatedTask = {
        ...task,
        isCompleted: false,
        completedAt: null
      };
      this.tasks.set(id, updatedTask);
      return updatedTask;
    }
    return undefined;
  }

  // Task item methods
  async getTaskItems(taskId: number): Promise<TaskItem[]> {
    return Array.from(this.taskItems.values()).filter(item => item.taskId === taskId);
  }

  async createTaskItem(insertItem: InsertTaskItem): Promise<TaskItem> {
    const id = this.currentTaskItemId++;
    const item: TaskItem = {
      ...insertItem,
      completed: insertItem.completed !== undefined ? insertItem.completed : false,
      id,
      createdAt: new Date(),
    };
    this.taskItems.set(id, item);
    return item;
  }

  async updateTaskItem(id: number, updates: Partial<TaskItem>): Promise<TaskItem | undefined> {
    const item = this.taskItems.get(id);
    if (!item) return undefined;

    const updatedItem = { ...item, ...updates };
    this.taskItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteTaskItem(id: number): Promise<boolean> {
    return this.taskItems.delete(id);
  }

  async completeAllTaskItems(taskId: number): Promise<void> {
    const items = Array.from(this.taskItems.values()).filter(item => item.taskId === taskId);
    for (const item of items) {
      item.completed = true;
      this.taskItems.set(item.id, item);
    }
  }

  // Time entry methods
  async getAllTimeEntries(): Promise<TimeEntryWithTask[]> {
    const entries = Array.from(this.timeEntries.values());
    const entriesWithTask: TimeEntryWithTask[] = [];

    for (const entry of entries) {
      const task = this.tasks.get(entry.taskId);
      if (task) {
        entriesWithTask.push({ ...entry, task });
      }
    }

    return entriesWithTask.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async getTimeEntriesByTask(taskId: number): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter(entry => entry.taskId === taskId);
  }

  async getRunningTimeEntries(): Promise<TimeEntryWithTask[]> {
    const runningEntries = Array.from(this.timeEntries.values()).filter(entry => entry.isRunning);
    const entriesWithTask: TimeEntryWithTask[] = [];

    for (const entry of runningEntries) {
      const task = this.tasks.get(entry.taskId);
      if (task) {
        entriesWithTask.push({ ...entry, task });
      }
    }

    return entriesWithTask;
  }

  async createTimeEntry(insertEntry: InsertTimeEntry): Promise<TimeEntry> {
    const id = this.currentTimeEntryId++;
    const entry: TimeEntry = {
      ...insertEntry,
      endTime: insertEntry.endTime || null,
      duration: insertEntry.duration || null,
      isRunning: insertEntry.isRunning !== undefined ? insertEntry.isRunning : false,
      notes: insertEntry.notes || null,
      id,
      createdAt: new Date(),
    };
    this.timeEntries.set(id, entry);
    return entry;
  }

  async updateTimeEntry(id: number, updates: UpdateTimeEntry): Promise<TimeEntry | undefined> {
    const entry = this.timeEntries.get(id);
    if (!entry) return undefined;

    const updatedEntry = { ...entry, ...updates };
    this.timeEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    return this.timeEntries.delete(id);
  }

  async deleteAllTimeEntries(): Promise<boolean> {
    this.timeEntries.clear();
    return true;
  }

  // Analytics methods
  async getDashboardStats(): Promise<{
    todayTime: number;
    activeTasks: number;
    weekTime: number;
    monthTime: number;
    completedTasks: number;
    overdueTasks: number;
    overTimeTasks: number;
    dueTodayTasks: number;
    dueTomorrowTasks: number;
    nearingLimitTasks: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const entries = Array.from(this.timeEntries.values());
    const tasks = Array.from(this.tasks.values());
    
    let todayTime = 0;
    let weekTime = 0;
    let monthTime = 0;

    for (const entry of entries) {
      const entryDate = new Date(entry.createdAt);
      let duration = entry.duration || 0;

      // Calculate current duration for running entries
      if (entry.isRunning && entry.startTime) {
        duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
      }

      if (entryDate >= todayStart) {
        todayTime += duration;
      }
      if (entryDate >= weekStart) {
        weekTime += duration;
      }
      if (entryDate >= monthStart) {
        monthTime += duration;
      }
    }

    const activeTasks = tasks.filter(task => task.isActive).length;
    const runningEntries = entries.filter(entry => entry.isRunning).length;

    // Calculate overdue tasks
    const overdueTasks = tasks.filter(task => 
      task.isActive && 
      task.deadline && 
      new Date(task.deadline) < now
    ).length;

    // Calculate over time tasks
    const overTimeTasks = tasks.filter(task => {
      if (!task.isActive || !task.estimatedHours) return false;
      
      const taskEntries = entries.filter(entry => entry.taskId === task.id);
      const totalTime = taskEntries.reduce((sum, entry) => {
        let duration = entry.duration || 0;
        if (entry.isRunning && entry.startTime) {
          duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
        }
        return sum + duration;
      }, 0);
      
      return totalTime > (task.estimatedHours * 3600);
    }).length;

    // Calculate tasks due today
    const today = new Date();
    const todayStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const dueTodayTasks = tasks.filter(task => 
      task.isActive && 
      task.deadline && 
      new Date(task.deadline) >= todayStartDate && 
      new Date(task.deadline) < todayEnd
    ).length;

    // Calculate tasks due tomorrow
    const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrowEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
    
    const dueTomorrowTasks = tasks.filter(task => 
      task.isActive && 
      task.deadline && 
      new Date(task.deadline) >= tomorrowStart && 
      new Date(task.deadline) < tomorrowEnd
    ).length;

    // Calculate tasks nearing 80% time limit
    const nearingLimitTasks = tasks.filter(task => {
      if (!task.isActive || !task.estimatedHours) return false;
      
      const taskEntries = entries.filter(entry => entry.taskId === task.id);
      const totalTime = taskEntries.reduce((sum, entry) => {
        let duration = entry.duration || 0;
        if (entry.isRunning && entry.startTime) {
          duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
        }
        return sum + duration;
      }, 0);
      
      const timeLimit = task.estimatedHours * 3600;
      return totalTime >= (timeLimit * 0.8) && totalTime <= timeLimit;
    }).length;

    return {
      todayTime,
      activeTasks,
      weekTime,
      monthTime,
      completedTasks: tasks.filter(task => !task.isActive).length,
      overdueTasks,
      overTimeTasks,
      dueTodayTasks,
      dueTomorrowTasks,
      nearingLimitTasks,
    };
  }

  async getTimeByTask(startDate?: Date, endDate?: Date): Promise<Array<{ task: Task; totalTime: number }>> {
    const entries = Array.from(this.timeEntries.values());
    const taskTimeMap = new Map<number, number>();

    for (const entry of entries) {
      const entryDate = new Date(entry.createdAt);
      
      if (startDate && entryDate < startDate) continue;
      if (endDate && entryDate > endDate) continue;

      let duration = entry.duration || 0;
      if (entry.isRunning && entry.startTime) {
        duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
      }

      const currentTime = taskTimeMap.get(entry.taskId) || 0;
      taskTimeMap.set(entry.taskId, currentTime + duration);
    }

    const result: Array<{ task: Task; totalTime: number }> = [];
    for (const [taskId, totalTime] of Array.from(taskTimeMap.entries())) {
      const task = this.tasks.get(taskId);
      if (task && task.isActive) {
        result.push({ task, totalTime });
      }
    }

    return result.sort((a, b) => b.totalTime - a.totalTime);
  }

  async getDailyStats(startDate: Date, endDate: Date): Promise<Array<{ date: string; totalTime: number }>> {
    const entries = Array.from(this.timeEntries.values());
    const dailyMap = new Map<string, number>();

    for (const entry of entries) {
      const entryDate = new Date(entry.createdAt);
      
      if (entryDate < startDate || entryDate > endDate) continue;

      const dateKey = entryDate.toISOString().split('T')[0];
      let duration = entry.duration || 0;
      
      if (entry.isRunning && entry.startTime) {
        duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
      }

      const currentTime = dailyMap.get(dateKey) || 0;
      dailyMap.set(dateKey, currentTime + duration);
    }

    const result: Array<{ date: string; totalTime: number }> = [];
    for (const [date, totalTime] of Array.from(dailyMap.entries())) {
      result.push({ date, totalTime });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  // WhatsApp Integration methods - implementação completa em memória
  async getWhatsappIntegration(): Promise<WhatsappIntegration | undefined> {
    return this.whatsappIntegration;
  }

  async createWhatsappIntegration(integration: InsertWhatsappIntegration): Promise<WhatsappIntegration> {
    const whatsappIntegration: WhatsappIntegration = {
      id: 1,
      instanceName: integration.instanceName || '',
      apiKey: integration.apiKey || '',
      baseUrl: integration.baseUrl || '',
      authorizedNumbers: integration.authorizedNumbers || [],
      restrictToNumbers: integration.restrictToNumbers ?? true,
      isActive: integration.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.whatsappIntegration = whatsappIntegration;
    return whatsappIntegration;
  }

  async updateWhatsappIntegration(id: number, updates: Partial<WhatsappIntegration>): Promise<WhatsappIntegration | undefined> {
    if (this.whatsappIntegration && this.whatsappIntegration.id === id) {
      this.whatsappIntegration = {
        ...this.whatsappIntegration,
        ...updates,
        updatedAt: new Date()
      };
      return this.whatsappIntegration;
    }
    return undefined;
  }

  async deleteWhatsappIntegration(id: number): Promise<boolean> {
    if (this.whatsappIntegration && this.whatsappIntegration.id === id) {
      this.whatsappIntegration = undefined;
      return true;
    }
    return false;
  }

  async createWhatsappLog(log: InsertWhatsappLog): Promise<WhatsappLog> {
    const whatsappLog: WhatsappLog = {
      id: this.currentWhatsappLogId++,
      integrationId: log.integrationId,
      eventType: log.eventType,
      phoneNumber: log.phoneNumber || '',
      messageText: log.messageText || '',
      responseText: log.responseText || '',
      success: log.success ?? true,
      errorMessage: log.errorMessage || '',
      timestamp: new Date()
    };
    this.whatsappLogs.set(whatsappLog.id, whatsappLog);
    return whatsappLog;
  }

  async getWhatsappLogs(integrationId: number, limit?: number): Promise<WhatsappLog[]> {
    const logs = Array.from(this.whatsappLogs.values())
      .filter(log => log.integrationId === integrationId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? logs.slice(0, limit) : logs;
  }

  async getNotificationSettings(): Promise<NotificationSettings | undefined> {
    return this.notificationSettings;
  }

  async createNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings> {
    const notificationSettings: NotificationSettings = {
      id: 1,
      notificationsEnabled: settings.notificationsEnabled ?? true,
      dailyReminderTime: settings.dailyReminderTime || '09:00:00',
      weeklyReportEnabled: settings.weeklyReportEnabled ?? true,
      deadlineNotifications: settings.deadlineNotifications ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.notificationSettings = notificationSettings;
    return notificationSettings;
  }

  async updateNotificationSettings(updates: Partial<NotificationSettings>): Promise<NotificationSettings | undefined> {
    if (this.notificationSettings) {
      this.notificationSettings = {
        ...this.notificationSettings,
        ...updates,
        updatedAt: new Date()
      };
      return this.notificationSettings;
    }
    return undefined;
  }
}

import { DatabaseStorage } from "./database-storage.js";

// Usar apenas PostgreSQL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL é obrigatória. Configure uma conexão PostgreSQL.");
}

console.log("🐘 Usando PostgreSQL");

// PostgreSQL não está funcionando (banco Neon hibernando), usando MemStorage temporariamente
export const storage = new MemStorage();
