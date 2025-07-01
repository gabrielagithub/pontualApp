import Database from 'better-sqlite3';
import path from 'path';
import { IStorage } from './storage';
import type { 
  User, InsertUser, 
  Task, InsertTask, TaskWithStats,
  TaskItem, InsertTaskItem,
  TimeEntry, InsertTimeEntry, UpdateTimeEntry, TimeEntryWithTask
} from '@shared/schema';

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor(dbPath: string = 'database.sqlite') {
    this.db = new Database(dbPath);
    this.initializeTables();
    this.seedInitialData();
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
        deadline: entry.task_deadline,
        isActive: Boolean(entry.task_is_active),
        createdAt: entry.task_created_at
      }
    }));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const stmt = this.db.prepare('SELECT * FROM time_entries WHERE id = ?');
    const result = stmt.get(id) as TimeEntry | undefined;
    if (result) {
      result.isRunning = Boolean(result.isRunning);
    }
    return result;
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
        deadline: entry.deadline,
        isActive: Boolean(entry.task_is_active),
        createdAt: entry.task_created_at
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

  close() {
    this.db.close();
  }
}