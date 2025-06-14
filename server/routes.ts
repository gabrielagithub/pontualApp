import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertTaskItemSchema, insertTimeEntrySchema, updateTimeEntrySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
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

  app.post("/api/time-entries", async (req, res) => {
    try {
      console.log("Received time entry data:", req.body);
      const validatedData = insertTimeEntrySchema.parse(req.body);
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

  const httpServer = createServer(app);
  return httpServer;
}
