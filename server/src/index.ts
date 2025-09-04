import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createTaskInputSchema,
  updateTaskInputSchema,
  getTasksQuerySchema,
  createExecutionResultInputSchema,
  getExecutionResultsQuerySchema,
  createChatMessageInputSchema,
  getChatMessagesQuerySchema,
} from './schema';

// Import handlers
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { getTaskById } from './handlers/get_task_by_id';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { createExecutionResult } from './handlers/create_execution_result';
import { getExecutionResults } from './handlers/get_execution_results';
import { createChatMessage } from './handlers/create_chat_message';
import { getChatMessages } from './handlers/get_chat_messages';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Task management endpoints
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),

  getTasks: publicProcedure
    .input(getTasksQuerySchema)
    .query(({ input }) => getTasks(input)),

  getTaskById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTaskById(input.id)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  deleteTask: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTask(input.id)),

  // Execution result endpoints
  createExecutionResult: publicProcedure
    .input(createExecutionResultInputSchema)
    .mutation(({ input }) => createExecutionResult(input)),

  getExecutionResults: publicProcedure
    .input(getExecutionResultsQuerySchema)
    .query(({ input }) => getExecutionResults(input)),

  // Chat message endpoints
  createChatMessage: publicProcedure
    .input(createChatMessageInputSchema)
    .mutation(({ input }) => createChatMessage(input)),

  getChatMessages: publicProcedure
    .input(getChatMessagesQuerySchema)
    .query(({ input }) => getChatMessages(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();