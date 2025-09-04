import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for better type safety and consistency
export const taskStatusEnum = pgEnum('task_status', ['pending', 'running', 'completed', 'failed']);
export const executionStatusEnum = pgEnum('execution_status', ['success', 'error', 'partial']);
export const contentTypeEnum = pgEnum('content_type', ['text', 'code', 'json', 'markdown']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'agent', 'system']);

// Tasks table - represents individual tasks assigned to agents
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  status: taskStatusEnum('status').notNull().default('pending'),
  agent_type: text('agent_type').notNull(), // Type of agent handling this task
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Execution results table - stores the output/results from task executions
export const executionResultsTable = pgTable('execution_results', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').notNull().references(() => tasksTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(), // The actual result content
  content_type: contentTypeEnum('content_type').notNull().default('text'),
  execution_time_ms: integer('execution_time_ms').notNull().default(0),
  status: executionStatusEnum('status').notNull().default('success'),
  error_message: text('error_message'), // Nullable - only set when status is 'error'
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Chat messages table - stores conversation history between users and agents
export const chatMessagesTable = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').notNull().references(() => tasksTable.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  agent_name: text('agent_name'), // Nullable - name of the specific agent when role is 'agent'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Relations for proper query building
export const tasksRelations = relations(tasksTable, ({ many }) => ({
  executionResults: many(executionResultsTable),
  chatMessages: many(chatMessagesTable),
}));

export const executionResultsRelations = relations(executionResultsTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [executionResultsTable.task_id],
    references: [tasksTable.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessagesTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [chatMessagesTable.task_id],
    references: [tasksTable.id],
  }),
}));

// TypeScript types for database operations
export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;

export type ExecutionResult = typeof executionResultsTable.$inferSelect;
export type NewExecutionResult = typeof executionResultsTable.$inferInsert;

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  tasks: tasksTable,
  executionResults: executionResultsTable,
  chatMessages: chatMessagesTable,
};

export const tableRelations = {
  tasksRelations,
  executionResultsRelations,
  chatMessagesRelations,
};