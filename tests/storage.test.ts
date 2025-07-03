import { MemStorage } from '../server/storage';
import { Task, TaskItem, TimeEntry, InsertTask, InsertTaskItem, InsertTimeEntry } from '../shared/schema';

describe('Storage Tests', () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe('User Operations', () => {
    it('should create and retrieve a user', async () => {
      const userData = {
        username: 'testuser',
        password: 'hashedpassword'
      };

      const user = await storage.createUser(userData);
      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();

      const retrievedUser = await storage.getUser(user.id);
      expect(retrievedUser).toEqual(user);
    });

    it('should get user by username', async () => {
      const userData = {
        username: 'testuser2',
        password: 'hashedpassword'
      };

      const user = await storage.createUser(userData);
      const retrievedUser = await storage.getUserByUsername(userData.username);
      expect(retrievedUser).toEqual(user);
    });

    it('should return undefined for non-existent user', async () => {
      const user = await storage.getUser(99999);
      expect(user).toBeUndefined();
    });
  });

  describe('Task Operations', () => {
    it('should create and retrieve a task', async () => {
      const taskData: InsertTask = {
        name: 'Test Task',
        description: 'Test Description',
        color: '#3B82F6',
        estimatedHours: 2,
        deadline: new Date('2025-12-31'),
        isActive: true
      };

      const task = await storage.createTask(taskData);
      expect(task).toMatchObject(taskData);
      expect(task.id).toBeDefined();

      const retrievedTask = await storage.getTask(task.id);
      expect(retrievedTask).toEqual(task);
    });

    it('should get all tasks with statistics', async () => {
      const taskData: InsertTask = {
        name: 'Task with Stats',
        description: 'Test task for statistics'
      };

      await storage.createTask(taskData);
      const tasks = await storage.getAllTasks();

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]).toHaveProperty('totalTime');
      expect(tasks[0]).toHaveProperty('activeEntries');
      expect(tasks[0]).toHaveProperty('items');
    });

    it('should update a task', async () => {
      const taskData: InsertTask = { name: 'Original Task' };
      const task = await storage.createTask(taskData);

      const updates = { name: 'Updated Task', description: 'Updated description' };
      const updatedTask = await storage.updateTask(task.id, updates);

      expect(updatedTask).toBeDefined();
      expect(updatedTask!.name).toBe(updates.name);
      expect(updatedTask!.description).toBe(updates.description);
    });

    it('should complete and reopen tasks', async () => {
      const taskData: InsertTask = { name: 'Task to Complete' };
      const task = await storage.createTask(taskData);

      // Complete task
      const completedTask = await storage.completeTask(task.id);
      expect(completedTask).toBeDefined();
      expect(completedTask!.isCompleted).toBe(true);
      expect(completedTask!.completedAt).toBeDefined();

      // Reopen task
      const reopenedTask = await storage.reopenTask(task.id);
      expect(reopenedTask).toBeDefined();
      expect(reopenedTask!.isCompleted).toBe(false);
      expect(reopenedTask!.completedAt).toBeNull();
    });

    it('should delete task without time entries', async () => {
      const taskData: InsertTask = { name: 'Task to Delete' };
      const task = await storage.createTask(taskData);

      const deleted = await storage.deleteTask(task.id);
      expect(deleted).toBe(true);

      const retrievedTask = await storage.getTask(task.id);
      expect(retrievedTask).toBeUndefined();
    });

    it('should not delete task with time entries', async () => {
      const taskData: InsertTask = { name: 'Task with Time Entry' };
      const task = await storage.createTask(taskData);

      // Add time entry
      const entryData: InsertTimeEntry = {
        taskId: task.id,
        duration: 3600
      };
      await storage.createTimeEntry(entryData);

      const deleted = await storage.deleteTask(task.id);
      expect(deleted).toBe(false);
    });
  });

  describe('Task Item Operations', () => {
    let taskId: number;

    beforeEach(async () => {
      const taskData: InsertTask = { name: 'Task for Items' };
      const task = await storage.createTask(taskData);
      taskId = task.id;
    });

    it('should create and retrieve task items', async () => {
      const itemData: InsertTaskItem = {
        taskId,
        title: 'Test Item',
        description: 'Test item description'
      };

      const item = await storage.createTaskItem(itemData);
      expect(item).toMatchObject(itemData);
      expect(item.id).toBeDefined();
      expect(item.completed).toBe(false);

      const items = await storage.getTaskItems(taskId);
      expect(items).toContainEqual(item);
    });

    it('should update task item', async () => {
      const itemData: InsertTaskItem = {
        taskId,
        title: 'Item to Update'
      };

      const item = await storage.createTaskItem(itemData);
      const updates = { title: 'Updated Item', completed: true };
      const updatedItem = await storage.updateTaskItem(item.id, updates);

      expect(updatedItem).toBeDefined();
      expect(updatedItem!.title).toBe(updates.title);
      expect(updatedItem!.completed).toBe(true);
    });

    it('should delete task item', async () => {
      const itemData: InsertTaskItem = {
        taskId,
        title: 'Item to Delete'
      };

      const item = await storage.createTaskItem(itemData);
      const deleted = await storage.deleteTaskItem(item.id);
      expect(deleted).toBe(true);

      const items = await storage.getTaskItems(taskId);
      expect(items).not.toContainEqual(expect.objectContaining({ id: item.id }));
    });

    it('should complete all task items', async () => {
      // Create multiple items
      await storage.createTaskItem({ taskId, title: 'Item 1' });
      await storage.createTaskItem({ taskId, title: 'Item 2' });

      await storage.completeAllTaskItems(taskId);

      const items = await storage.getTaskItems(taskId);
      expect(items.every(item => item.completed)).toBe(true);
    });
  });

  describe('Time Entry Operations', () => {
    let taskId: number;

    beforeEach(async () => {
      const taskData: InsertTask = { name: 'Task for Time Entries' };
      const task = await storage.createTask(taskData);
      taskId = task.id;
    });

    it('should create manual time entry', async () => {
      const entryData: InsertTimeEntry = {
        taskId,
        duration: 3600,
        notes: 'Manual entry test'
      };

      const entry = await storage.createTimeEntry(entryData);
      expect(entry).toMatchObject(entryData);
      expect(entry.id).toBeDefined();
      expect(entry.isRunning).toBe(false);
      expect(entry.startTime).toBeDefined();
      expect(entry.endTime).toBeDefined();
    });

    it('should create running time entry', async () => {
      const entryData: InsertTimeEntry = {
        taskId,
        isRunning: true
      };

      const entry = await storage.createTimeEntry(entryData);
      expect(entry.isRunning).toBe(true);
      expect(entry.startTime).toBeDefined();
      expect(entry.endTime).toBeNull();
      expect(entry.duration).toBe(0);
    });

    it('should get running time entries', async () => {
      // Create a running entry
      await storage.createTimeEntry({ taskId, isRunning: true });

      const runningEntries = await storage.getRunningTimeEntries();
      expect(runningEntries.length).toBeGreaterThan(0);
      expect(runningEntries[0].isRunning).toBe(true);
      expect(runningEntries[0].task).toBeDefined();
    });

    it('should update time entry', async () => {
      const entryData: InsertTimeEntry = {
        taskId,
        isRunning: true
      };

      const entry = await storage.createTimeEntry(entryData);
      const updates = {
        isRunning: false,
        endTime: new Date(),
        duration: 1800
      };

      const updatedEntry = await storage.updateTimeEntry(entry.id, updates);
      expect(updatedEntry).toBeDefined();
      expect(updatedEntry!.isRunning).toBe(false);
      expect(updatedEntry!.duration).toBe(1800);
    });

    it('should not delete running time entry', async () => {
      const entryData: InsertTimeEntry = {
        taskId,
        isRunning: true
      };

      const entry = await storage.createTimeEntry(entryData);
      const deleted = await storage.deleteTimeEntry(entry.id);
      expect(deleted).toBe(false);
    });

    it('should delete finished time entry', async () => {
      const entryData: InsertTimeEntry = {
        taskId,
        duration: 3600
      };

      const entry = await storage.createTimeEntry(entryData);
      const deleted = await storage.deleteTimeEntry(entry.id);
      expect(deleted).toBe(true);

      const retrievedEntry = await storage.getTimeEntry(entry.id);
      expect(retrievedEntry).toBeUndefined();
    });

    it('should get time entries by task', async () => {
      await storage.createTimeEntry({ taskId, duration: 1800 });
      await storage.createTimeEntry({ taskId, duration: 3600 });

      const entries = await storage.getTimeEntriesByTask(taskId);
      expect(entries.length).toBe(2);
      expect(entries.every(entry => entry.taskId === taskId)).toBe(true);
    });

    it('should delete all time entries', async () => {
      await storage.createTimeEntry({ taskId, duration: 1800 });
      await storage.createTimeEntry({ taskId, duration: 3600 });

      const deleted = await storage.deleteAllTimeEntries();
      expect(deleted).toBe(true);

      const entries = await storage.getAllTimeEntries();
      expect(entries.length).toBe(0);
    });
  });

  describe('Analytics Operations', () => {
    beforeEach(async () => {
      // Setup test data
      const task1 = await storage.createTask({ name: 'Task 1' });
      const task2 = await storage.createTask({ name: 'Task 2' });

      // Add some time entries
      await storage.createTimeEntry({ taskId: task1.id, duration: 3600 });
      await storage.createTimeEntry({ taskId: task2.id, duration: 1800 });
    });

    it('should get dashboard statistics', async () => {
      const stats = await storage.getDashboardStats();

      expect(stats).toMatchObject({
        todayTime: expect.any(Number),
        activeTasks: expect.any(Number),
        weekTime: expect.any(Number),
        monthTime: expect.any(Number),
        completedTasks: expect.any(Number),
        overdueTasks: expect.any(Number),
        overTimeTasks: expect.any(Number),
        dueTodayTasks: expect.any(Number),
        dueTomorrowTasks: expect.any(Number),
        nearingLimitTasks: expect.any(Number)
      });
    });

    it('should get time by task', async () => {
      const timeByTask = await storage.getTimeByTask();
      expect(Array.isArray(timeByTask)).toBe(true);

      if (timeByTask.length > 0) {
        expect(timeByTask[0]).toHaveProperty('task');
        expect(timeByTask[0]).toHaveProperty('totalTime');
        expect(typeof timeByTask[0].totalTime).toBe('number');
      }
    });

    it('should get time by task with date filter', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const timeByTask = await storage.getTimeByTask(startDate, endDate);
      expect(Array.isArray(timeByTask)).toBe(true);
    });

    it('should get daily stats', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const dailyStats = await storage.getDailyStats(startDate, endDate);
      expect(Array.isArray(dailyStats)).toBe(true);

      if (dailyStats.length > 0) {
        expect(dailyStats[0]).toHaveProperty('date');
        expect(dailyStats[0]).toHaveProperty('totalTime');
      }
    });
  });

  describe('WhatsApp Integration Operations', () => {
    it('should create and retrieve WhatsApp integration', async () => {
      const integrationData = {
        userId: 1,
        apiKey: 'test-api-key',
        apiUrl: 'https://test-api.com',
        instanceId: 'test-instance',
        isActive: true
      };

      const integration = await storage.createWhatsappIntegration(integrationData);
      expect(integration).toMatchObject(integrationData);
      expect(integration.id).toBeDefined();

      const retrieved = await storage.getWhatsappIntegration(1);
      expect(retrieved).toEqual(integration);
    });

    it('should update WhatsApp integration', async () => {
      const integrationData = {
        userId: 1,
        apiKey: 'test-api-key',
        apiUrl: 'https://test-api.com',
        instanceId: 'test-instance'
      };

      const integration = await storage.createWhatsappIntegration(integrationData);
      const updates = { apiKey: 'updated-key', isActive: false };
      const updated = await storage.updateWhatsappIntegration(integration.id, updates);

      expect(updated).toBeDefined();
      expect(updated!.apiKey).toBe(updates.apiKey);
      expect(updated!.isActive).toBe(false);
    });

    it('should create and retrieve WhatsApp logs', async () => {
      const integrationData = {
        userId: 1,
        apiKey: 'test-api-key',
        apiUrl: 'https://test-api.com',
        instanceId: 'test-instance'
      };

      const integration = await storage.createWhatsappIntegration(integrationData);

      const logData = {
        integrationId: integration.id,
        messageFrom: '+5511999999999',
        messageBody: 'Test message',
        responseBody: 'Test response',
        responseStatus: 200
      };

      const log = await storage.createWhatsappLog(logData);
      expect(log).toMatchObject(logData);

      const logs = await storage.getWhatsappLogs(integration.id);
      expect(logs).toContainEqual(expect.objectContaining(logData));
    });
  });

  describe('Notification Settings Operations', () => {
    it('should create and retrieve notification settings', async () => {
      const settingsData = {
        userId: 1,
        taskDeadlineReminder: true,
        timeTrackingReminder: true,
        dailyReport: true,
        weeklyReport: false
      };

      const settings = await storage.createNotificationSettings(settingsData);
      expect(settings).toMatchObject(settingsData);

      const retrieved = await storage.getNotificationSettings(1);
      expect(retrieved).toEqual(settings);
    });

    it('should update notification settings', async () => {
      const settingsData = {
        userId: 1,
        taskDeadlineReminder: true,
        timeTrackingReminder: true
      };

      const settings = await storage.createNotificationSettings(settingsData);
      const updates = { taskDeadlineReminder: false, weeklyReport: true };
      const updated = await storage.updateNotificationSettings(1, updates);

      expect(updated).toBeDefined();
      expect(updated!.taskDeadlineReminder).toBe(false);
      expect(updated!.weeklyReport).toBe(true);
    });
  });
});