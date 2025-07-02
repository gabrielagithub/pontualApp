import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IStorage } from './storage';
import type { 
  User, InsertUser, 
  Task, InsertTask, TaskWithStats,
  TaskItem, InsertTaskItem,
  TimeEntry, InsertTimeEntry, UpdateTimeEntry, TimeEntryWithTask,
  WhatsappIntegration, InsertWhatsappIntegration,
  WhatsappLog, InsertWhatsappLog,
  NotificationSettings, InsertNotificationSettings
} from '@shared/schema';

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Configurar caminho baseado no ambiente
    let defaultPath: string;
    
    if (process.env.NODE_ENV === 'production') {
      // No Render, usar /opt/render/project/src para persistência
      defaultPath = '/opt/render/project/src/data/database.sqlite';
    } else {
      // Desenvolvimento: usar caminho local
      defaultPath = path.join(process.cwd(), 'data', 'database.sqlite');
    }
    
    const finalPath = dbPath || defaultPath;
    
    // Criar diretório data se não existir
    const dataDir = path.dirname(finalPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    console.log(`🗄️  Conectando ao banco SQLite: ${finalPath}`);
    this.db = new Database(finalPath);
    this.initializeTables();
    this.addMissingColumns();
    this.seedInitialData();
    this.setupBackupSystem(finalPath);
  }

  private initializeTables() {
    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    // Create tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL DEFAULT '#3B82F6',
        estimated_hours INTEGER,
        deadline DATETIME,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task_items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // Create time_entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER,
        is_running BOOLEAN NOT NULL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // Create whatsapp_integrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        instance_name TEXT NOT NULL,
        api_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        webhook_url TEXT,
        last_connection DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create whatsapp_logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        integration_id INTEGER NOT NULL,
        message_id TEXT,
        message_type TEXT NOT NULL,
        message_content TEXT,
        command TEXT,
        response TEXT,
        success BOOLEAN NOT NULL DEFAULT 1,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (integration_id) REFERENCES whatsapp_integrations(id) ON DELETE CASCADE
      )
    `);

    // Create notification_settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        enable_daily_report BOOLEAN NOT NULL DEFAULT 0,
        daily_report_time TEXT DEFAULT '18:00',
        enable_weekly_report BOOLEAN NOT NULL DEFAULT 0,
        weekly_report_day INTEGER DEFAULT 5,
        enable_deadline_reminders BOOLEAN NOT NULL DEFAULT 1,
        reminder_hours_before INTEGER DEFAULT 24,
        enable_timer_reminders BOOLEAN NOT NULL DEFAULT 0,
        timer_reminder_interval INTEGER DEFAULT 120,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add missing columns to existing tables
    this.addMissingColumns();
  }

  private addMissingColumns() {
    try {
      // Check if columns exist and add if not
      const tableInfo = this.db.prepare("PRAGMA table_info(tasks)").all() as any[];
      const hasEstimatedHours = tableInfo.some(col => col.name === 'estimated_hours');
      const hasDeadline = tableInfo.some(col => col.name === 'deadline');
      const hasIsCompleted = tableInfo.some(col => col.name === 'is_completed');
      const hasCompletedAt = tableInfo.some(col => col.name === 'completed_at');

      if (!hasEstimatedHours) {
        this.db.exec("ALTER TABLE tasks ADD COLUMN estimated_hours INTEGER");
      }

      if (!hasDeadline) {
        this.db.exec("ALTER TABLE tasks ADD COLUMN deadline DATETIME");
      }

      if (!hasIsCompleted) {
        this.db.exec("ALTER TABLE tasks ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT 0");
      }

      if (!hasCompletedAt) {
        this.db.exec("ALTER TABLE tasks ADD COLUMN completed_at DATETIME");
      }
    } catch (error) {
      console.error("Error adding missing columns:", error);
    }
  }

  private seedInitialData() {
    // Check if we already have data
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      // Insert a default user
      this.db.prepare(`
        INSERT INTO users (username, password) 
        VALUES ('usuario', 'senha123')
      `).run();
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const result = stmt.get(id) as User | undefined;
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    const result = stmt.get(username) as User | undefined;
    return result;
  }

  async createUser(user: InsertUser): Promise<User> {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, password) 
      VALUES (?, ?) 
      RETURNING *
    `);
    const result = stmt.get(user.username, user.password) as User;
    return result;
  }

  // Task methods
  async getAllTasks(): Promise<TaskWithStats[]> {
    const stmt = this.db.prepare(`
      SELECT 
        t.*,
        COALESCE(SUM(CASE 
          WHEN te.is_running = 1 THEN 
            (strftime('%s', 'now') - strftime('%s', te.start_time))
          ELSE 
            te.duration 
        END), 0) as totalTime,
        COUNT(CASE WHEN te.is_running = 1 THEN 1 END) as activeEntries
      FROM tasks t
      LEFT JOIN time_entries te ON t.id = te.task_id
      WHERE t.is_active = 1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    
    const tasks = stmt.all() as (Task & { totalTime: number; activeEntries: number })[];
    
    // Get task items for each task
    const itemsStmt = this.db.prepare('SELECT * FROM task_items WHERE task_id = ? ORDER BY created_at');
    
    return tasks.map(task => ({
      ...task,
      isActive: Boolean((task as any).is_active),
      isCompleted: Boolean((task as any).is_completed),
      estimatedHours: (task as any).estimated_hours,
      completedAt: (task as any).completed_at ? new Date((task as any).completed_at) : null,
      items: itemsStmt.all(task.id) as TaskItem[]
    }));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const result = stmt.get(id) as any;
    if (result) {
      return {
        ...result,
        isActive: Boolean(result.is_active),
        isCompleted: Boolean(result.is_completed),
        estimatedHours: result.estimated_hours,
        completedAt: result.completed_at ? new Date(result.completed_at) : null,
        deadline: result.deadline ? new Date(result.deadline) : null,
        createdAt: new Date(result.created_at)
      };
    }
    return undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO tasks (name, description, color, estimated_hours, deadline, is_active) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        task.name, 
        task.description || null, 
        task.color || '#3B82F6', 
        task.estimatedHours || null,
        task.deadline ? (typeof task.deadline === 'string' ? task.deadline : task.deadline.toISOString()) : null,
        task.isActive !== false ? 1 : 0
      );
      
      // Get the created task
      const selectStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
      const result = selectStmt.get(info.lastInsertRowid) as any;
      
      return {
        id: result.id,
        name: result.name,
        description: result.description,
        color: result.color,
        estimatedHours: result.estimated_hours,
        deadline: result.deadline ? new Date(result.deadline) : null,
        isActive: Boolean(result.is_active),
        isCompleted: Boolean(result.is_completed),
        completedAt: result.completed_at ? new Date(result.completed_at) : null,
        createdAt: new Date(result.created_at)
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt');
    if (fields.length === 0) return this.getTask(id);

    const setClause = fields.map(field => {
      if (field === 'estimatedHours') return 'estimated_hours = ?';
      if (field === 'isActive') return 'is_active = ?';
      return `${field} = ?`;
    }).join(', ');
    
    const values = fields.map(field => {
      const value = updates[field as keyof Task];
      if (field === 'isActive') return 1; // Sempre manter ativo
      if (field === 'deadline') {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value instanceof Date) return value.toISOString();
        return null;
      }
      if (field === 'estimatedHours') return value || null;
      return value;
    });

    try {
      const stmt = this.db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`);
      stmt.run(...values, id);
      console.log(`Updated task ${id} with values:`, values);
      return this.getTask(id);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async completeTask(id: number): Promise<Task | undefined> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET is_completed = 1, completed_at = datetime('now') 
      WHERE id = ?
    `);
    const result = stmt.run(id);
    
    if (result.changes > 0) {
      return this.getTask(id);
    }
    return undefined;
  }

  async reopenTask(id: number): Promise<Task | undefined> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET is_completed = 0, completed_at = NULL 
      WHERE id = ?
    `);
    const result = stmt.run(id);
    
    if (result.changes > 0) {
      return this.getTask(id);
    }
    return undefined;
  }

  // Task item methods
  async getTaskItems(taskId: number): Promise<TaskItem[]> {
    const stmt = this.db.prepare('SELECT * FROM task_items WHERE task_id = ? ORDER BY created_at');
    const items = stmt.all(taskId) as TaskItem[];
    return items.map(item => ({ ...item, completed: Boolean(item.completed) }));
  }

  async createTaskItem(item: InsertTaskItem): Promise<TaskItem> {
    const stmt = this.db.prepare(`
      INSERT INTO task_items (task_id, title, completed) 
      VALUES (?, ?, ?) 
      RETURNING *
    `);
    const result = stmt.get(item.taskId, item.title, item.completed ? 1 : 0) as TaskItem;
    result.completed = Boolean(result.completed);
    return result;
  }

  async updateTaskItem(id: number, updates: Partial<TaskItem>): Promise<TaskItem | undefined> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt' && key !== 'taskId');
    if (fields.length === 0) {
      const stmt = this.db.prepare('SELECT * FROM task_items WHERE id = ?');
      const result = stmt.get(id) as TaskItem | undefined;
      if (result) result.completed = Boolean(result.completed);
      return result;
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      const value = updates[field as keyof TaskItem];
      return field === 'completed' ? (value ? 1 : 0) : value;
    });

    const stmt = this.db.prepare(`UPDATE task_items SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
    
    const getStmt = this.db.prepare('SELECT * FROM task_items WHERE id = ?');
    const result = getStmt.get(id) as TaskItem | undefined;
    if (result) result.completed = Boolean(result.completed);
    return result;
  }

  async deleteTaskItem(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM task_items WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async completeAllTaskItems(taskId: number): Promise<void> {
    const stmt = this.db.prepare('UPDATE task_items SET completed = 1 WHERE task_id = ?');
    stmt.run(taskId);
  }

  // Time entry methods
  async getAllTimeEntries(): Promise<TimeEntryWithTask[]> {
    const stmt = this.db.prepare(`
      SELECT 
        te.*,
        t.name as task_name,
        t.color as task_color,
        t.description as task_description,
        t.estimated_hours as task_estimated_hours,
        t.deadline as task_deadline,
        t.is_active as task_is_active,
        t.is_completed as task_is_completed,
        t.completed_at as task_completed_at,
        t.created_at as task_created_at
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      ORDER BY te.created_at DESC
    `);
    
    const entries = stmt.all() as any[];
    return entries.map(entry => ({
      id: entry.id,
      taskId: entry.task_id,
      startTime: entry.start_time,
      endTime: entry.end_time,
      duration: entry.duration,
      isRunning: Boolean(entry.is_running),
      notes: entry.notes,
      createdAt: entry.created_at,
      task: {
        id: entry.task_id,
        name: entry.task_name,
        color: entry.task_color,
        description: entry.task_description,
        estimatedHours: entry.task_estimated_hours,
        deadline: entry.task_deadline ? new Date(entry.task_deadline) : null,
        isActive: Boolean(entry.task_is_active),
        isCompleted: Boolean(entry.task_is_completed),
        completedAt: entry.task_completed_at ? new Date(entry.task_completed_at) : null,
        createdAt: new Date(entry.task_created_at)
      }
    }));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const stmt = this.db.prepare('SELECT * FROM time_entries WHERE id = ?');
    const result = stmt.get(id) as any;
    if (result) {
      return {
        id: result.id,
        taskId: result.task_id,
        startTime: result.start_time,
        endTime: result.end_time,
        duration: result.duration,
        isRunning: Boolean(result.is_running),
        notes: result.notes,
        createdAt: result.created_at
      };
    }
    return undefined;
  }

  async getTimeEntriesByTask(taskId: number): Promise<TimeEntry[]> {
    const stmt = this.db.prepare('SELECT * FROM time_entries WHERE task_id = ? ORDER BY created_at DESC');
    const entries = stmt.all(taskId) as TimeEntry[];
    return entries.map(entry => ({ ...entry, isRunning: Boolean(entry.isRunning) }));
  }

  async getRunningTimeEntries(): Promise<TimeEntryWithTask[]> {
    const stmt = this.db.prepare(`
      SELECT 
        te.*,
        t.name as task_name,
        t.color as task_color,
        t.description as task_description,
        t.is_active as task_is_active,
        t.is_completed as task_is_completed,
        t.completed_at as task_completed_at,
        t.estimated_hours,
        t.deadline,
        t.created_at as task_created_at
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      WHERE te.is_running = 1 OR (te.is_running = 0 AND te.end_time IS NOT NULL AND te.end_time > datetime('now', '-4 hours') AND datetime(te.start_time) <= datetime(te.end_time))
      ORDER BY te.start_time
    `);
    
    const entries = stmt.all() as any[];
    console.log("getRunningTimeEntries - encontrou:", entries.length, "entradas");
    console.log("Entradas encontradas:", entries.map(e => ({ 
      id: e.id, 
      isRunning: e.is_running, 
      duration: e.duration, 
      endTime: e.end_time 
    })));
    return entries.map(entry => ({
      id: entry.id,
      taskId: entry.task_id,
      startTime: entry.start_time,
      endTime: entry.end_time,
      duration: entry.duration,
      isRunning: Boolean(entry.is_running),
      notes: entry.notes,
      createdAt: entry.created_at,
      task: {
        id: entry.task_id,
        name: entry.task_name,
        color: entry.task_color,
        description: entry.task_description,
        estimatedHours: entry.estimated_hours,
        deadline: entry.deadline ? new Date(entry.deadline) : null,
        isActive: Boolean(entry.task_is_active),
        isCompleted: Boolean(entry.task_is_completed),
        completedAt: entry.task_completed_at ? new Date(entry.task_completed_at) : null,
        createdAt: new Date(entry.task_created_at)
      }
    }));
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO time_entries (task_id, start_time, end_time, duration, is_running, notes, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?) 
        RETURNING *
      `);
      
      const startTime = entry.startTime instanceof Date ? entry.startTime.toISOString() : entry.startTime;
      const endTime = entry.endTime ? (entry.endTime instanceof Date ? entry.endTime.toISOString() : entry.endTime) : null;
      
      // Use startTime as createdAt for manual entries, or current time for live timers
      const createdAt = entry.endTime ? startTime : new Date().toISOString();
      
      const result = stmt.get(
        entry.taskId, 
        startTime, 
        endTime, 
        entry.duration, 
        entry.isRunning ? 1 : 0,
        entry.notes,
        createdAt
      ) as TimeEntry;
      
      result.isRunning = Boolean(result.isRunning);
      return result;
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }
  }

  async updateTimeEntry(id: number, updates: UpdateTimeEntry): Promise<TimeEntry | undefined> {
    const fieldMap: Record<string, string> = {
      'taskId': 'task_id',
      'startTime': 'start_time',
      'endTime': 'end_time',
      'isRunning': 'is_running',
      'duration': 'duration',
      'notes': 'notes'
    };

    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt');
    if (fields.length === 0) return this.getTimeEntry(id);

    const setClause = fields.map(field => `${fieldMap[field] || field} = ?`).join(', ');
    const values = fields.map(field => {
      const value = updates[field as keyof UpdateTimeEntry];
      if (field === 'isRunning') {
        return value ? 1 : 0;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });

    console.log('Update query:', `UPDATE time_entries SET ${setClause} WHERE id = ?`);
    console.log('Update values:', values, id);

    const stmt = this.db.prepare(`UPDATE time_entries SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
    
    return this.getTimeEntry(id);
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM time_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async deleteAllTimeEntries(): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM time_entries');
    const result = stmt.run();
    return result.changes >= 0; // Returns true even if no entries to delete
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
    // Usar horário local brasileiro (UTC-3)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Início da semana (7 dias atrás)
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    
    // Início do mês
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get time stats using local dates
    const timeStmt = this.db.prepare(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN date(COALESCE(te.start_time, te.created_at)) = date(?) THEN 
            CASE WHEN te.is_running = 1 THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time))
            ELSE te.duration END
          ELSE 0 
        END), 0) as todayTime,
        COALESCE(SUM(CASE 
          WHEN date(COALESCE(te.start_time, te.created_at)) >= date(?) THEN 
            CASE WHEN te.is_running = 1 THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time))
            ELSE te.duration END
          ELSE 0 
        END), 0) as weekTime,
        COALESCE(SUM(CASE 
          WHEN date(COALESCE(te.start_time, te.created_at)) >= date(?) THEN 
            CASE WHEN te.is_running = 1 THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time))
            ELSE te.duration END
          ELSE 0 
        END), 0) as monthTime
      FROM time_entries te
    `);
    
    const timeStats = timeStmt.get(todayStart.toISOString(), weekStart.toISOString(), monthStart.toISOString()) as {
      todayTime: number;
      weekTime: number;
      monthTime: number;
    };

    // Get active tasks count
    const activeTasksStmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE is_active = 1');
    const activeTasksResult = activeTasksStmt.get() as { count: number };

    // Get running entries count (proxy for completed tasks)
    const runningStmt = this.db.prepare('SELECT COUNT(*) as count FROM time_entries WHERE is_running = 1');
    const runningResult = runningStmt.get() as { count: number };

    // Get overdue tasks count (deadline passed and still active)
    const overdueStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE is_active = 1 AND deadline IS NOT NULL AND deadline < datetime('now')
    `);
    const overdueResult = overdueStmt.get() as { count: number };

    // Get over time tasks count (estimated hours exceeded)
    const overTimeStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      WHERE t.is_active = 1 
        AND t.estimated_hours IS NOT NULL 
        AND (
          SELECT COALESCE(SUM(CASE 
            WHEN te.is_running = 1 THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time))
            ELSE te.duration END), 0) 
          FROM time_entries te
          WHERE te.task_id = t.id
        ) > (t.estimated_hours * 3600)
    `);
    const overTimeResult = overTimeStmt.get() as { count: number };

    // Get tasks due today
    const dueTodayStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE is_active = 1 AND deadline IS NOT NULL 
        AND DATE(deadline) = DATE('now')
    `);
    const dueTodayResult = dueTodayStmt.get() as { count: number };

    // Get tasks due tomorrow
    const dueTomorrowStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE is_active = 1 AND deadline IS NOT NULL 
        AND DATE(deadline) = DATE('now', '+1 day')
    `);
    const dueTomorrowResult = dueTomorrowStmt.get() as { count: number };

    // Get tasks nearing 80% time limit
    const nearingLimitStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      WHERE t.is_active = 1 
        AND t.estimated_hours IS NOT NULL 
        AND (
          SELECT COALESCE(SUM(CASE 
            WHEN te.is_running = 1 THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time))
            ELSE te.duration END), 0) 
          FROM time_entries te
          WHERE te.task_id = t.id
        ) >= (t.estimated_hours * 3600 * 0.8)
        AND (
          SELECT COALESCE(SUM(CASE 
            WHEN te.is_running = 1 THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time))
            ELSE te.duration END), 0) 
          FROM time_entries te
          WHERE te.task_id = t.id
        ) <= (t.estimated_hours * 3600)
    `);
    const nearingLimitResult = nearingLimitStmt.get() as { count: number };

    return {
      todayTime: timeStats.todayTime || 0,
      activeTasks: activeTasksResult.count || 0,
      weekTime: timeStats.weekTime || 0,
      monthTime: timeStats.monthTime || 0,
      completedTasks: runningResult.count || 0,
      overdueTasks: overdueResult.count || 0,
      overTimeTasks: overTimeResult.count || 0,
      dueTodayTasks: dueTodayResult.count || 0,
      dueTomorrowTasks: dueTomorrowResult.count || 0,
      nearingLimitTasks: nearingLimitResult.count || 0,
    };
  }

  async getTimeByTask(startDate?: Date, endDate?: Date): Promise<Array<{ task: Task; totalTime: number }>> {
    let whereClause = '';
    const params: any[] = [];
    
    if (startDate || endDate) {
      const conditions = [];
      if (startDate) {
        conditions.push('date(COALESCE(te.start_time, te.created_at)) >= date(?)');
        params.push(startDate.toISOString());
      }
      if (endDate) {
        conditions.push('date(COALESCE(te.start_time, te.created_at)) <= date(?)');
        params.push(endDate.toISOString());
      }
      whereClause = `AND ${conditions.join(' AND ')}`;
    }

    const stmt = this.db.prepare(`
      SELECT 
        t.*,
        COALESCE(SUM(CASE 
          WHEN te.is_running = 1 THEN 
            (strftime('%s', 'now') - strftime('%s', te.start_time))
          ELSE 
            te.duration 
        END), 0) as totalTime
      FROM tasks t
      LEFT JOIN time_entries te ON t.id = te.task_id
      WHERE t.is_active = 1 ${whereClause}
      GROUP BY t.id
      HAVING totalTime > 0
      ORDER BY totalTime DESC
    `);
    
    const results = stmt.all(...params) as (Task & { totalTime: number })[];
    return results.map(result => ({
      task: {
        ...result,
        isActive: Boolean(result.isActive)
      },
      totalTime: result.totalTime
    }));
  }

  async getDailyStats(startDate: Date, endDate: Date): Promise<Array<{ date: string; totalTime: number }>> {
    // Ajustar datas para horário brasileiro (UTC-3)
    const adjustedStart = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
    const adjustedEnd = new Date(endDate.getTime() + (3 * 60 * 60 * 1000));
    
    const stmt = this.db.prepare(`
      SELECT 
        DATE(COALESCE(te.start_time, te.created_at), '-3 hours') as date,
        COALESCE(SUM(CASE 
          WHEN te.is_running = 1 THEN 
            (strftime('%s', 'now') - strftime('%s', te.start_time))
          ELSE 
            te.duration 
        END), 0) as totalTime
      FROM time_entries te
      WHERE DATE(COALESCE(te.start_time, te.created_at), '-3 hours') BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(COALESCE(te.start_time, te.created_at), '-3 hours')
      ORDER BY date ASC
    `);
    
    const results = stmt.all(adjustedStart.toISOString().split('T')[0], adjustedEnd.toISOString().split('T')[0]) as Array<{ date: string; totalTime: number }>;
    return results;
  }

  private setupBackupSystem(dbPath: string) {
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    
    // Criar diretório de backup se não existir
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Fazer backup a cada 1 hora (em produção você pode ajustar)
    const backupInterval = 60 * 60 * 1000; // 1 hora em ms
    
    setInterval(() => {
      this.createBackup(dbPath, backupDir);
    }, backupInterval);
    
    // Fazer backup inicial
    this.createBackup(dbPath, backupDir);
    
    console.log(`📦 Sistema de backup configurado: ${backupDir}`);
  }
  
  private createBackup(dbPath: string, backupDir: string) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `database-${timestamp}.sqlite`);
      
      // Copiar arquivo do banco
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`✅ Backup criado: ${backupPath}`);
        
        // Manter apenas os últimos 5 backups
        this.cleanOldBackups(backupDir);
      }
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
    }
  }
  
  private cleanOldBackups(backupDir: string) {
    try {
      const files = fs.readdirSync(backupDir)
        .filter((file: string) => file.startsWith('database-') && file.endsWith('.sqlite'))
        .map((file: string) => ({
          name: file,
          path: path.join(backupDir, file),
          stats: fs.statSync(path.join(backupDir, file))
        }))
        .sort((a: any, b: any) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
      
      // Manter apenas os 5 mais recentes
      if (files.length > 5) {
        files.slice(5).forEach((file: any) => {
          fs.unlinkSync(file.path);
          console.log(`🗑️  Backup antigo removido: ${file.name}`);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao limpar backups antigos:', error);
    }
  }

  exportData(): object {
    // Exportar todos os dados para backup/migração
    const users = this.db.prepare('SELECT * FROM users').all();
    const tasks = this.db.prepare('SELECT * FROM tasks').all();
    const taskItems = this.db.prepare('SELECT * FROM task_items').all();
    const timeEntries = this.db.prepare('SELECT * FROM time_entries').all();
    
    return {
      users,
      tasks,
      taskItems,
      timeEntries,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  close() {
    this.db.close();
  }

  // WhatsApp Integration methods
  async getWhatsappIntegration(userId: number): Promise<WhatsappIntegration | undefined> {
    const result = this.db.prepare('SELECT * FROM whatsapp_integrations WHERE user_id = ? AND is_active = 1').get(userId) as any;
    if (!result) return undefined;
    
    return {
      id: result.id,
      userId: result.user_id,
      instanceName: result.instance_name,
      apiUrl: result.api_url,
      apiKey: result.api_key,
      phoneNumber: result.phone_number,
      isActive: !!result.is_active,
      webhookUrl: result.webhook_url,
      allowedGroupName: result.allowed_group_name,
      restrictToGroup: !!result.restrict_to_group,
      lastConnection: result.last_connection ? new Date(result.last_connection) : null,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
    };
  }

  async createWhatsappIntegration(integration: InsertWhatsappIntegration): Promise<WhatsappIntegration> {
    const stmt = this.db.prepare(`
      INSERT INTO whatsapp_integrations (user_id, instance_name, api_url, api_key, phone_number, webhook_url, allowed_group_name, restrict_to_group, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      integration.userId,
      integration.instanceName,
      integration.apiUrl,
      integration.apiKey,
      integration.phoneNumber,
      integration.webhookUrl,
      integration.allowedGroupName || null,
      integration.restrictToGroup ? 1 : 0
    );

    const created = this.db.prepare('SELECT * FROM whatsapp_integrations WHERE id = ?').get(result.lastInsertRowid) as any;
    
    return {
      id: created.id,
      userId: created.user_id,
      instanceName: created.instance_name,
      apiUrl: created.api_url,
      apiKey: created.api_key,
      phoneNumber: created.phone_number,
      isActive: !!created.is_active,
      webhookUrl: created.webhook_url,
      allowedGroupName: created.allowed_group_name,
      restrictToGroup: !!created.restrict_to_group,
      lastConnection: created.last_connection ? new Date(created.last_connection) : null,
      createdAt: new Date(created.created_at),
      updatedAt: new Date(created.updated_at),
    };
  }

  async updateWhatsappIntegration(id: number, updates: Partial<WhatsappIntegration>): Promise<WhatsappIntegration | undefined> {
    const fields = [];
    const values = [];

    if (updates.instanceName !== undefined) {
      fields.push('instance_name = ?');
      values.push(updates.instanceName);
    }
    if (updates.apiUrl !== undefined) {
      fields.push('api_url = ?');
      values.push(updates.apiUrl);
    }
    if (updates.apiKey !== undefined) {
      fields.push('api_key = ?');
      values.push(updates.apiKey);
    }
    if (updates.phoneNumber !== undefined) {
      fields.push('phone_number = ?');
      values.push(updates.phoneNumber);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.webhookUrl !== undefined) {
      fields.push('webhook_url = ?');
      values.push(updates.webhookUrl);
    }
    if (updates.lastConnection !== undefined) {
      fields.push('last_connection = ?');
      values.push(updates.lastConnection?.toISOString());
    }
    if (updates.allowedGroupName !== undefined) {
      fields.push('allowed_group_name = ?');
      values.push(updates.allowedGroupName);
    }
    if (updates.restrictToGroup !== undefined) {
      fields.push('restrict_to_group = ?');
      values.push(updates.restrictToGroup ? 1 : 0);
    }

    if (fields.length === 0) return this.getWhatsappIntegration(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE whatsapp_integrations SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    const updated = this.db.prepare('SELECT * FROM whatsapp_integrations WHERE id = ?').get(id) as any;
    if (!updated) return undefined;

    return {
      id: updated.id,
      userId: updated.user_id,
      instanceName: updated.instance_name,
      apiUrl: updated.api_url,
      apiKey: updated.api_key,
      phoneNumber: updated.phone_number,
      isActive: !!updated.is_active,
      webhookUrl: updated.webhook_url,
      allowedGroupName: updated.allowed_group_name,
      restrictToGroup: !!updated.restrict_to_group,
      lastConnection: updated.last_connection ? new Date(updated.last_connection) : null,
      createdAt: new Date(updated.created_at),
      updatedAt: new Date(updated.updated_at),
    };
  }

  async deleteWhatsappIntegration(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM whatsapp_integrations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async createWhatsappLog(log: InsertWhatsappLog): Promise<WhatsappLog> {
    const stmt = this.db.prepare(`
      INSERT INTO whatsapp_logs (integration_id, message_id, message_type, message_content, command, response, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      log.integrationId,
      log.messageId,
      log.messageType,
      log.messageContent,
      log.command,
      log.response,
      log.success ? 1 : 0,
      log.errorMessage
    );

    const created = this.db.prepare('SELECT * FROM whatsapp_logs WHERE id = ?').get(result.lastInsertRowid) as any;
    
    return {
      id: created.id,
      integrationId: created.integration_id,
      messageId: created.message_id,
      messageType: created.message_type,
      messageContent: created.message_content,
      command: created.command,
      response: created.response,
      success: !!created.success,
      errorMessage: created.error_message,
      createdAt: new Date(created.created_at),
    };
  }

  async getWhatsappLogs(integrationId: number, limit: number = 50): Promise<WhatsappLog[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM whatsapp_logs 
      WHERE integration_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    const results = stmt.all(integrationId, limit) as any[];
    
    return results.map(row => ({
      id: row.id,
      integrationId: row.integration_id,
      messageId: row.message_id,
      messageType: row.message_type,
      messageContent: row.message_content,
      command: row.command,
      response: row.response,
      success: !!row.success,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
    }));
  }

  async getNotificationSettings(userId: number): Promise<NotificationSettings | undefined> {
    const result = this.db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(userId) as any;
    if (!result) return undefined;
    
    return {
      id: result.id,
      userId: result.user_id,
      enableDailyReport: !!result.enable_daily_report,
      dailyReportTime: result.daily_report_time,
      enableWeeklyReport: !!result.enable_weekly_report,
      weeklyReportDay: result.weekly_report_day,
      enableDeadlineReminders: !!result.enable_deadline_reminders,
      reminderHoursBefore: result.reminder_hours_before,
      enableTimerReminders: !!result.enable_timer_reminders,
      timerReminderInterval: result.timer_reminder_interval,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
    };
  }

  async createNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings> {
    const stmt = this.db.prepare(`
      INSERT INTO notification_settings (
        user_id, enable_daily_report, daily_report_time, enable_weekly_report, 
        weekly_report_day, enable_deadline_reminders, reminder_hours_before,
        enable_timer_reminders, timer_reminder_interval, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      settings.userId,
      settings.enableDailyReport ? 1 : 0,
      settings.dailyReportTime,
      settings.enableWeeklyReport ? 1 : 0,
      settings.weeklyReportDay,
      settings.enableDeadlineReminders ? 1 : 0,
      settings.reminderHoursBefore,
      settings.enableTimerReminders ? 1 : 0,
      settings.timerReminderInterval
    );

    const created = this.db.prepare('SELECT * FROM notification_settings WHERE id = ?').get(result.lastInsertRowid) as any;
    
    return {
      id: created.id,
      userId: created.user_id,
      enableDailyReport: !!created.enable_daily_report,
      dailyReportTime: created.daily_report_time,
      enableWeeklyReport: !!created.enable_weekly_report,
      weeklyReportDay: created.weekly_report_day,
      enableDeadlineReminders: !!created.enable_deadline_reminders,
      reminderHoursBefore: created.reminder_hours_before,
      enableTimerReminders: !!created.enable_timer_reminders,
      timerReminderInterval: created.timer_reminder_interval,
      createdAt: new Date(created.created_at),
      updatedAt: new Date(created.updated_at),
    };
  }

  async updateNotificationSettings(userId: number, updates: Partial<NotificationSettings>): Promise<NotificationSettings | undefined> {
    const fields = [];
    const values = [];

    if (updates.enableDailyReport !== undefined) {
      fields.push('enable_daily_report = ?');
      values.push(updates.enableDailyReport ? 1 : 0);
    }
    if (updates.dailyReportTime !== undefined) {
      fields.push('daily_report_time = ?');
      values.push(updates.dailyReportTime);
    }
    if (updates.enableWeeklyReport !== undefined) {
      fields.push('enable_weekly_report = ?');
      values.push(updates.enableWeeklyReport ? 1 : 0);
    }
    if (updates.weeklyReportDay !== undefined) {
      fields.push('weekly_report_day = ?');
      values.push(updates.weeklyReportDay);
    }
    if (updates.enableDeadlineReminders !== undefined) {
      fields.push('enable_deadline_reminders = ?');
      values.push(updates.enableDeadlineReminders ? 1 : 0);
    }
    if (updates.reminderHoursBefore !== undefined) {
      fields.push('reminder_hours_before = ?');
      values.push(updates.reminderHoursBefore);
    }
    if (updates.enableTimerReminders !== undefined) {
      fields.push('enable_timer_reminders = ?');
      values.push(updates.enableTimerReminders ? 1 : 0);
    }
    if (updates.timerReminderInterval !== undefined) {
      fields.push('timer_reminder_interval = ?');
      values.push(updates.timerReminderInterval);
    }

    if (fields.length === 0) return this.getNotificationSettings(userId);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const stmt = this.db.prepare(`UPDATE notification_settings SET ${fields.join(', ')} WHERE user_id = ?`);
    stmt.run(...values);

    return this.getNotificationSettings(userId);
  }
}