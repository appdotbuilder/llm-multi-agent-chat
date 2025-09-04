import { db } from '../db';
import { chatMessagesTable, tasksTable } from '../db/schema';
import { type CreateChatMessageInput, type ChatMessage } from '../schema';
import { eq } from 'drizzle-orm';

export const createChatMessage = async (input: CreateChatMessageInput): Promise<ChatMessage> => {
  try {
    // Validate that the task exists before creating the chat message
    const existingTask = await db.select({ id: tasksTable.id })
      .from(tasksTable)
      .where(eq(tasksTable.id, input.task_id))
      .execute();

    if (existingTask.length === 0) {
      throw new Error(`Task with id ${input.task_id} not found`);
    }

    // Insert chat message record
    const result = await db.insert(chatMessagesTable)
      .values({
        task_id: input.task_id,
        role: input.role,
        content: input.content,
        agent_name: input.agent_name
      })
      .returning()
      .execute();

    // Return the created chat message
    return result[0];
  } catch (error) {
    console.error('Chat message creation failed:', error);
    throw error;
  }
};