import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteTask(id: number): Promise<boolean> {
  try {
    // Delete the task - cascading deletes will handle execution results and chat messages
    const result = await db.delete(tasksTable)
      .where(eq(tasksTable.id, id))
      .execute();

    // Check if any rows were affected (task was found and deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
}