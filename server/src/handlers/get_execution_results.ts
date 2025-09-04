import { db } from '../db';
import { executionResultsTable } from '../db/schema';
import { type GetExecutionResultsQuery, type ExecutionResult } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getExecutionResults(query: GetExecutionResultsQuery): Promise<ExecutionResult[]> {
  try {
    // Query execution results for the specific task, ordered by newest first
    const results = await db.select()
      .from(executionResultsTable)
      .where(eq(executionResultsTable.task_id, query.task_id))
      .orderBy(desc(executionResultsTable.created_at))
      .execute();

    // Return the results - all fields are already in the correct format
    // No numeric conversions needed since execution_time_ms is integer type
    return results;
  } catch (error) {
    console.error('Failed to get execution results:', error);
    throw error;
  }
}