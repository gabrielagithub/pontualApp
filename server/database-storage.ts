import { users, tasks, taskItems, timeEntries, type User, type InsertUser, type Task, type InsertTask, type TaskItem, type InsertTaskItem, type TimeEntry, type InsertTimeEntry, type UpdateTimeEntry, type TaskWithStats, type TimeEntryWithTask } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, isNull, desc, asc } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllTasks(): Promise<TaskWithStats[]> {
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    
    const tasksWithStats: TaskWithStats[] = [];
    
    for (const task of allTasks) {
      // Calcular tempo total da tarefa
      const entries = await db.select().from(timeEntries).where(eq(timeEntries.taskId, task.id));
      const totalTime = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      
      // Contar entradas ativas
      const activeEntries = await db.select().from(timeEntries)
        .where(and(eq(timeEntries.taskId, task.id), eq(timeEntries.isRunning, true)));
      
      // Buscar itens da tarefa
      const items = await db.select().from(taskItems).where(eq(taskItems.taskId, task.id));
      
      tasksWithStats.push({
        ...task,
        totalTime,
        activeEntries: activeEntries.length,
        items: items || []
      });
    }
    
    return tasksWithStats;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    // Verificar se há entradas de tempo para esta tarefa
    const entries = await db.select().from(timeEntries).where(eq(timeEntries.taskId, id)).limit(1);
    if (entries.length > 0) {
      return false; // Não pode excluir tarefa com entradas de tempo
    }

    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  async completeTask(id: number): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        isCompleted: true, 
        completedAt: new Date() 
      })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async reopenTask(id: number): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        isCompleted: false, 
        completedAt: null 
      })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async getTaskItems(taskId: number): Promise<TaskItem[]> {
    return await db.select().from(taskItems).where(eq(taskItems.taskId, taskId));
  }

  async createTaskItem(item: InsertTaskItem): Promise<TaskItem> {
    const [newItem] = await db
      .insert(taskItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateTaskItem(id: number, updates: Partial<TaskItem>): Promise<TaskItem | undefined> {
    const [updatedItem] = await db
      .update(taskItems)
      .set(updates)
      .where(eq(taskItems.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async deleteTaskItem(id: number): Promise<boolean> {
    const result = await db.delete(taskItems).where(eq(taskItems.id, id));
    return result.rowCount > 0;
  }

  async completeAllTaskItems(taskId: number): Promise<void> {
    await db
      .update(taskItems)
      .set({ isCompleted: true })
      .where(eq(taskItems.taskId, taskId));
  }

  async getAllTimeEntries(): Promise<TimeEntryWithTask[]> {
    const entries = await db
      .select({
        id: timeEntries.id,
        taskId: timeEntries.taskId,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        duration: timeEntries.duration,
        isRunning: timeEntries.isRunning,
        notes: timeEntries.notes,
        createdAt: timeEntries.createdAt,
        task: tasks
      })
      .from(timeEntries)
      .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .orderBy(desc(timeEntries.startTime));

    return entries.map(entry => ({
      id: entry.id,
      taskId: entry.taskId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      isRunning: entry.isRunning,
      notes: entry.notes,
      createdAt: entry.createdAt,
      task: entry.task!
    }));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry || undefined;
  }

  async getTimeEntriesByTask(taskId: number): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.taskId, taskId));
  }

  async getRunningTimeEntries(): Promise<TimeEntryWithTask[]> {
    const entries = await db
      .select({
        id: timeEntries.id,
        taskId: timeEntries.taskId,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        duration: timeEntries.duration,
        isRunning: timeEntries.isRunning,
        notes: timeEntries.notes,
        createdAt: timeEntries.createdAt,
        task: tasks
      })
      .from(timeEntries)
      .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(eq(timeEntries.isRunning, true));

    return entries.map(entry => ({
      id: entry.id,
      taskId: entry.taskId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      isRunning: entry.isRunning,
      notes: entry.notes,
      createdAt: entry.createdAt,
      task: entry.task!
    }));
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [newEntry] = await db
      .insert(timeEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async updateTimeEntry(id: number, updates: UpdateTimeEntry): Promise<TimeEntry | undefined> {
    const [updatedEntry] = await db
      .update(timeEntries)
      .set(updates)
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedEntry || undefined;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    // Verificar se a entrada está ativa antes de excluir
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    
    if (!entry) {
      return false;
    }
    
    // Prevenir exclusão de entradas ativas
    if (entry.isRunning || entry.endTime === null) {
      return false;
    }
    
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id));
    return result.rowCount > 0;
  }

  async deleteAllTimeEntries(): Promise<boolean> {
    const result = await db.delete(timeEntries);
    return result.rowCount > 0;
  }

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
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Tempo de hoje
    const todayEntries = await db.select().from(timeEntries)
      .where(gte(timeEntries.startTime, startOfDay));
    const todayTime = todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    // Tempo da semana
    const weekEntries = await db.select().from(timeEntries)
      .where(gte(timeEntries.startTime, startOfWeek));
    const weekTime = weekEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    // Tempo do mês
    const monthEntries = await db.select().from(timeEntries)
      .where(gte(timeEntries.startTime, startOfMonth));
    const monthTime = monthEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    // Tarefas ativas
    const activeTasks = await db.select().from(tasks).where(eq(tasks.isActive, true));
    
    // Tarefas concluídas
    const completedTasks = await db.select().from(tasks).where(eq(tasks.isCompleted, true));

    return {
      todayTime,
      activeTasks: activeTasks.length,
      weekTime,
      monthTime,
      completedTasks: completedTasks.length,
      overdueTasks: 0, // TODO: Implementar lógica de atraso
      overTimeTasks: 0, // TODO: Implementar lógica de horas excedidas
      dueTodayTasks: 0, // TODO: Implementar lógica de vencimento hoje
      dueTomorrowTasks: 0, // TODO: Implementar lógica de vencimento amanhã
      nearingLimitTasks: 0 // TODO: Implementar lógica de próximo do limite
    };
  }

  async getTimeByTask(startDate?: Date, endDate?: Date): Promise<Array<{ task: Task; totalTime: number }>> {
    let query = db
      .select({
        task: tasks,
        entry: timeEntries
      })
      .from(timeEntries)
      .leftJoin(tasks, eq(timeEntries.taskId, tasks.id));

    if (startDate || endDate) {
      const conditions = [];
      if (startDate) conditions.push(gte(timeEntries.startTime, startDate));
      if (endDate) conditions.push(lte(timeEntries.startTime, endDate));
      query = query.where(and(...conditions));
    }

    const results = await query;
    
    const taskTimeMap = new Map<number, { task: Task; totalTime: number }>();
    
    for (const result of results) {
      if (!result.task) continue;
      
      const taskId = result.task.id;
      const duration = result.entry?.duration || 0;
      
      if (taskTimeMap.has(taskId)) {
        taskTimeMap.get(taskId)!.totalTime += duration;
      } else {
        taskTimeMap.set(taskId, {
          task: result.task,
          totalTime: duration
        });
      }
    }
    
    return Array.from(taskTimeMap.values()).sort((a, b) => b.totalTime - a.totalTime);
  }

  async getDailyStats(startDate: Date, endDate: Date): Promise<Array<{ date: string; totalTime: number }>> {
    const entries = await db.select().from(timeEntries)
      .where(and(
        gte(timeEntries.startTime, startDate),
        lte(timeEntries.startTime, endDate)
      ));

    const dailyMap = new Map<string, number>();
    
    for (const entry of entries) {
      const date = entry.startTime.toISOString().split('T')[0];
      const duration = entry.duration || 0;
      dailyMap.set(date, (dailyMap.get(date) || 0) + duration);
    }
    
    const result: Array<{ date: string; totalTime: number }> = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        totalTime: dailyMap.get(dateStr) || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  }
}