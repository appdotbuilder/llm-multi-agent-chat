import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // Insert task record with default status 'pending'
    const result = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        agent_type: input.agent_type,
        status: 'pending', // New tasks start as pending
      })
      .returning()
      .execute();

    const task = result[0];
    return {
      ...task,
    };
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};