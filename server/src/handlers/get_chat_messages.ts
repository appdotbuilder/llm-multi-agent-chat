import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type GetChatMessagesQuery, type ChatMessage } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getChatMessages(query: GetChatMessagesQuery): Promise<ChatMessage[]> {
  try {
    // Build query with task_id filter, ordering, and pagination
    const results = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.task_id, query.task_id))
      .orderBy(asc(chatMessagesTable.timestamp)) // Oldest first
      .limit(query.limit)
      .offset(query.offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Chat messages retrieval failed:', error);
    throw error;
  }
}