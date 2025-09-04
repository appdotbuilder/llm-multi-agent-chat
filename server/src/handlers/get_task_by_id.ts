import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Task } from '../schema';

export async function getTaskById(id: number): Promise<Task | null> {
  try {
    // Query the task by ID using drizzle ORM
    const results = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, id))
      .execute();

    // Return null if no task found, otherwise return the first result
    if (results.length === 0) {
      return null;
    }

    const task = results[0];
    
    // Return the task with proper type conversion for dates
    return {
      ...task,
      created_at: task.created_at,
      updated_at: task.updated_at
    };
  } catch (error) {
    console.error('Failed to get task by ID:', error);
    throw error;
  }
}