import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateTask(input: UpdateTaskInput): Promise<Task | null> {
  try {
    // Extract the ID from input
    const { id, ...updateFields } = input;

    // Build the update object dynamically, only including provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date(), // Always update the timestamp
    };

    // Only include fields that are provided in the input
    if (updateFields.title !== undefined) {
      updateData['title'] = updateFields.title;
    }

    if (updateFields.description !== undefined) {
      updateData['description'] = updateFields.description;
    }

    if (updateFields.status !== undefined) {
      updateData['status'] = updateFields.status;
    }

    if (updateFields.agent_type !== undefined) {
      updateData['agent_type'] = updateFields.agent_type;
    }

    // Update the task and return the updated record
    const result = await db.update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, id))
      .returning()
      .execute();

    // Return null if no task was found with the given ID
    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
}