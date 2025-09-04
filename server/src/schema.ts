import { z } from 'zod';

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  agent_type: z.string(), // Type of agent (e.g., 'code-generator', 'data-analyzer', 'writer')
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Task = z.infer<typeof taskSchema>;

// Execution result schema
export const executionResultSchema = z.object({
  id: z.number(),
  task_id: z.number(),
  content: z.string(), // The actual result content (text, code, analysis, etc.)
  content_type: z.enum(['text', 'code', 'json', 'markdown']),
  execution_time_ms: z.number().int().nonnegative(),
  status: z.enum(['success', 'error', 'partial']),
  error_message: z.string().nullable(),
  created_at: z.coerce.date(),
});

export type ExecutionResult = z.infer<typeof executionResultSchema>;

// Chat message schema for agent interactions
export const chatMessageSchema = z.object({
  id: z.number(),
  task_id: z.number(),
  role: z.enum(['user', 'agent', 'system']),
  content: z.string(),
  agent_name: z.string().nullable(), // Name of the specific agent if role is 'agent'
  timestamp: z.coerce.date(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Input schemas for creating entities

export const createTaskInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  agent_type: z.string().min(1, 'Agent type is required'),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  agent_type: z.string().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const createExecutionResultInputSchema = z.object({
  task_id: z.number(),
  content: z.string(),
  content_type: z.enum(['text', 'code', 'json', 'markdown']),
  execution_time_ms: z.number().int().nonnegative(),
  status: z.enum(['success', 'error', 'partial']),
  error_message: z.string().nullable(),
});

export type CreateExecutionResultInput = z.infer<typeof createExecutionResultInputSchema>;

export const createChatMessageInputSchema = z.object({
  task_id: z.number(),
  role: z.enum(['user', 'agent', 'system']),
  content: z.string().min(1, 'Content is required'),
  agent_name: z.string().nullable(),
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;

// Query schemas

export const getTasksQuerySchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  agent_type: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;

export const getExecutionResultsQuerySchema = z.object({
  task_id: z.number(),
});

export type GetExecutionResultsQuery = z.infer<typeof getExecutionResultsQuerySchema>;

export const getChatMessagesQuerySchema = z.object({
  task_id: z.number(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type GetChatMessagesQuery = z.infer<typeof getChatMessagesQuerySchema>;