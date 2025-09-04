import { db } from '../db';
import { executionResultsTable, tasksTable } from '../db/schema';
import { type CreateExecutionResultInput, type ExecutionResult } from '../schema';
import { eq } from 'drizzle-orm';

export const createExecutionResult = async (input: CreateExecutionResultInput): Promise<ExecutionResult> => {
  try {
    // Validate that the referenced task exists
    const existingTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.task_id))
      .execute();

    if (existingTask.length === 0) {
      throw new Error(`Task with id ${input.task_id} does not exist`);
    }

    // Insert execution result record
    const result = await db.insert(executionResultsTable)
      .values({
        task_id: input.task_id,
        content: input.content,
        content_type: input.content_type,
        execution_time_ms: input.execution_time_ms,
        status: input.status,
        error_message: input.error_message
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Execution result creation failed:', error);
    throw error;
  }
};