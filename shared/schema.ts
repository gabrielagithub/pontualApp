import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#3B82F6"),
  estimatedHours: integer("estimated_hours"), // horas previstas
  deadline: timestamp("deadline"), // prazo
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taskItems = pgTable("task_items", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  isRunning: boolean("is_running").notNull().default(false),
  notes: text("notes"), // observações
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
}).extend({
  estimatedHours: z.number().nullable().optional(),
  deadline: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
  isActive: z.boolean().optional().default(true),
});

export const insertTaskItemSchema = createInsertSchema(taskItems).omit({
  id: true,
  createdAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  endTime: z.union([z.date(), z.string(), z.null()]).nullable().optional().transform(val => {
    if (!val) return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const updateTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  endTime: z.union([z.date(), z.string(), z.null()]).nullable().optional().transform(val => {
    if (!val) return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertTaskItem = z.infer<typeof insertTaskItemSchema>;
export type TaskItem = typeof taskItems.$inferSelect;

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type UpdateTimeEntry = z.infer<typeof updateTimeEntrySchema>;

export interface TimeEntryWithTask extends TimeEntry {
  task: Task;
}

export interface TaskWithStats extends Task {
  totalTime: number;
  activeEntries: number;
  items?: TaskItem[];
}
