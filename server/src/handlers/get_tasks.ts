import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type GetTasksQuery, type Task } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export async function getTasks(query: GetTasksQuery): Promise<Task[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query.status) {
      conditions.push(eq(tasksTable.status, query.status));
    }

    if (query.agent_type) {
      conditions.push(eq(tasksTable.agent_type, query.agent_type));
    }

    // Build and execute the query in one chain
    const baseQuery = db.select().from(tasksTable);
    
    const results = conditions.length > 0
      ? await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(tasksTable.created_at))
          .limit(query.limit)
          .offset(query.offset)
          .execute()
      : await baseQuery
          .orderBy(desc(tasksTable.created_at))
          .limit(query.limit)
          .offset(query.offset)
          .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    throw error;
  }
}