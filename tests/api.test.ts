import request from 'supertest';
import express, { Express } from 'express';
import { registerRoutes } from '../server/routes';
import { MemStorage } from '../server/storage';

describe('API Integration Tests', () => {
  let app: Express;
  let server: any;
  
  const validAuth = Buffer.from('admin:admin123').toString('base64');

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Usar MemStorage para testes isolados
    process.env.NODE_ENV = 'test';
    
    server = await registerRoutes(app as any);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        database: expect.any(String),
        version: '1.0.0'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      await request(app)
        .get('/api/tasks')
        .expect(401);
    });

    it('should accept valid credentials', async () => {
      await request(app)
        .get('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);
    });

    it('should reject invalid credentials', async () => {
      const invalidAuth = Buffer.from('admin:wrong').toString('base64');
      await request(app)
        .get('/api/tasks')
        .set('Authorization', `Basic ${invalidAuth}`)
        .expect(401);
    });
  });

  describe('Tasks API', () => {
    it('should get empty tasks list initially', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create a new task', async () => {
      const taskData = {
        name: 'Test Task',
        description: 'Test Description',
        color: '#3B82F6',
        estimatedHours: 2,
        deadline: '2025-12-31T23:59:59.000Z'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: taskData.name,
        description: taskData.description,
        color: taskData.color,
        estimatedHours: taskData.estimatedHours,
        isActive: true,
        isCompleted: false
      });
      expect(response.body.id).toBeDefined();
    });

    it('should get task by ID', async () => {
      // First create a task
      const taskData = {
        name: 'Get Task Test',
        description: 'Test getting task by ID'
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Then get it
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.id).toBe(taskId);
      expect(response.body.name).toBe(taskData.name);
    });

    it('should update a task', async () => {
      // Create task first
      const taskData = { name: 'Update Test Task' };
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Update task
      const updateData = { name: 'Updated Task Name' };
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Basic ${validAuth}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('should complete a task', async () => {
      // Create task first
      const taskData = { name: 'Complete Test Task' };
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Complete task
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.isCompleted).toBe(true);
      expect(response.body.completedAt).toBeDefined();
    });

    it('should reopen a completed task', async () => {
      // Create and complete task first
      const taskData = { name: 'Reopen Test Task' };
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      await request(app)
        .patch(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      // Reopen task
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/reopen`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.isCompleted).toBe(false);
      expect(response.body.completedAt).toBeNull();
    });
  });

  describe('Task Items API', () => {
    let taskId: number;

    beforeEach(async () => {
      // Create a task for testing task items
      const taskData = { name: 'Task for Items Test' };
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .send(taskData)
        .expect(201);
      taskId = response.body.id;
    });

    it('should create a task item', async () => {
      const itemData = {
        taskId,
        title: 'Test Item',
        description: 'Test item description'
      };

      const response = await request(app)
        .post('/api/task-items')
        .set('Authorization', `Basic ${validAuth}`)
        .send(itemData)
        .expect(201);

      expect(response.body).toMatchObject({
        taskId,
        title: itemData.title,
        description: itemData.description,
        completed: false
      });
    });

    it('should get task items for a task', async () => {
      // Create an item first
      const itemData = { taskId, title: 'Get Items Test' };
      await request(app)
        .post('/api/task-items')
        .set('Authorization', `Basic ${validAuth}`)
        .send(itemData)
        .expect(201);

      // Get items
      const response = await request(app)
        .get(`/api/tasks/${taskId}/items`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should update a task item', async () => {
      // Create item first
      const itemData = { taskId, title: 'Update Item Test' };
      const createResponse = await request(app)
        .post('/api/task-items')
        .set('Authorization', `Basic ${validAuth}`)
        .send(itemData)
        .expect(201);

      const itemId = createResponse.body.id;

      // Update item
      const updateData = { title: 'Updated Item Title', completed: true };
      const response = await request(app)
        .put(`/api/task-items/${itemId}`)
        .set('Authorization', `Basic ${validAuth}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.completed).toBe(true);
    });
  });

  describe('Time Entries API', () => {
    let taskId: number;

    beforeEach(async () => {
      // Create a task for testing time entries
      const taskData = { name: 'Task for Time Entries Test' };
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .send(taskData)
        .expect(201);
      taskId = response.body.id;
    });

    it('should start a timer', async () => {
      const timerData = { taskId };

      const response = await request(app)
        .post('/api/time-entries/start')
        .set('Authorization', `Basic ${validAuth}`)
        .send(timerData)
        .expect(201);

      expect(response.body).toMatchObject({
        taskId,
        isRunning: true
      });
      expect(response.body.startTime).toBeDefined();
      expect(response.body.endTime).toBeNull();
    });

    it('should get running time entries', async () => {
      // Start a timer first
      await request(app)
        .post('/api/time-entries/start')
        .set('Authorization', `Basic ${validAuth}`)
        .send({ taskId })
        .expect(201);

      // Get running entries
      const response = await request(app)
        .get('/api/time-entries/running')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].isRunning).toBe(true);
    });

    it('should create manual time entry', async () => {
      const entryData = {
        taskId,
        duration: 3600, // 1 hour in seconds
        notes: 'Manual time entry test'
      };

      const response = await request(app)
        .post('/api/time-entries')
        .set('Authorization', `Basic ${validAuth}`)
        .send(entryData)
        .expect(201);

      expect(response.body).toMatchObject({
        taskId,
        duration: entryData.duration,
        notes: entryData.notes,
        isRunning: false
      });
    });

    it('should get all time entries', async () => {
      // Create a manual entry first
      await request(app)
        .post('/api/time-entries')
        .set('Authorization', `Basic ${validAuth}`)
        .send({ taskId, duration: 1800 })
        .expect(201);

      // Get all entries
      const response = await request(app)
        .get('/api/time-entries')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Dashboard API', () => {
    it('should get dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body).toMatchObject({
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

    it('should get time by task report', async () => {
      const response = await request(app)
        .get('/api/dashboard/time-by-task')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get daily stats report', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const response = await request(app)
        .get(`/api/dashboard/daily-stats?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent task', async () => {
      await request(app)
        .get('/api/tasks/99999')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(404);
    });

    it('should handle validation errors', async () => {
      const invalidTaskData = {
        // Missing required name field
        description: 'Task without name'
      };

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .send(invalidTaskData)
        .expect(400);
    });

    it('should handle invalid JSON', async () => {
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Basic ${validAuth}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });
});