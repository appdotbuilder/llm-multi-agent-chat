import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, executionResultsTable, chatMessagesTable } from '../db/schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task to be deleted',
        agent_type: 'test-agent',
        status: 'pending'
      })
      .returning()
      .execute();

    // Delete the task
    const result = await deleteTask(task.id);

    expect(result).toBe(true);

    // Verify task is deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should return false when task does not exist', async () => {
    // Try to delete non-existent task
    const result = await deleteTask(999);

    expect(result).toBe(false);
  });

  it('should cascade delete execution results', async () => {
    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Test Task with Results',
        description: 'A task with execution results',
        agent_type: 'test-agent',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create execution results for the task
    await db.insert(executionResultsTable)
      .values([
        {
          task_id: task.id,
          content: 'First result',
          content_type: 'text',
          execution_time_ms: 100,
          status: 'success',
          error_message: null
        },
        {
          task_id: task.id,
          content: 'Second result',
          content_type: 'json',
          execution_time_ms: 200,
          status: 'success',
          error_message: null
        }
      ])
      .execute();

    // Verify execution results exist before deletion
    const resultsBefore = await db.select()
      .from(executionResultsTable)
      .where(eq(executionResultsTable.task_id, task.id))
      .execute();

    expect(resultsBefore).toHaveLength(2);

    // Delete the task
    const deleteResult = await deleteTask(task.id);

    expect(deleteResult).toBe(true);

    // Verify execution results are cascade deleted
    const resultsAfter = await db.select()
      .from(executionResultsTable)
      .where(eq(executionResultsTable.task_id, task.id))
      .execute();

    expect(resultsAfter).toHaveLength(0);
  });

  it('should cascade delete chat messages', async () => {
    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Test Task with Messages',
        description: 'A task with chat messages',
        agent_type: 'test-agent',
        status: 'running'
      })
      .returning()
      .execute();

    // Create chat messages for the task
    await db.insert(chatMessagesTable)
      .values([
        {
          task_id: task.id,
          role: 'user',
          content: 'Hello agent',
          agent_name: null
        },
        {
          task_id: task.id,
          role: 'agent',
          content: 'Hello user',
          agent_name: 'test-agent'
        },
        {
          task_id: task.id,
          role: 'system',
          content: 'Task started',
          agent_name: null
        }
      ])
      .execute();

    // Verify chat messages exist before deletion
    const messagesBefore = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.task_id, task.id))
      .execute();

    expect(messagesBefore).toHaveLength(3);

    // Delete the task
    const deleteResult = await deleteTask(task.id);

    expect(deleteResult).toBe(true);

    // Verify chat messages are cascade deleted
    const messagesAfter = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.task_id, task.id))
      .execute();

    expect(messagesAfter).toHaveLength(0);
  });

  it('should cascade delete both execution results and chat messages', async () => {
    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Complete Test Task',
        description: 'A task with both results and messages',
        agent_type: 'comprehensive-agent',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create execution results
    await db.insert(executionResultsTable)
      .values({
        task_id: task.id,
        content: 'Task completed successfully',
        content_type: 'markdown',
        execution_time_ms: 5000,
        status: 'success',
        error_message: null
      })
      .execute();

    // Create chat messages
    await db.insert(chatMessagesTable)
      .values([
        {
          task_id: task.id,
          role: 'user',
          content: 'Please complete this task',
          agent_name: null
        },
        {
          task_id: task.id,
          role: 'agent',
          content: 'Task completed',
          agent_name: 'comprehensive-agent'
        }
      ])
      .execute();

    // Verify both results and messages exist
    const resultsBefore = await db.select()
      .from(executionResultsTable)
      .where(eq(executionResultsTable.task_id, task.id))
      .execute();

    const messagesBefore = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.task_id, task.id))
      .execute();

    expect(resultsBefore).toHaveLength(1);
    expect(messagesBefore).toHaveLength(2);

    // Delete the task
    const deleteResult = await deleteTask(task.id);

    expect(deleteResult).toBe(true);

    // Verify both are cascade deleted
    const resultsAfter = await db.select()
      .from(executionResultsTable)
      .where(eq(executionResultsTable.task_id, task.id))
      .execute();

    const messagesAfter = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.task_id, task.id))
      .execute();

    expect(resultsAfter).toHaveLength(0);
    expect(messagesAfter).toHaveLength(0);

    // Verify task is deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should handle multiple task deletions independently', async () => {
    // Create multiple test tasks
    const [task1] = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        description: 'First task',
        agent_type: 'agent-1',
        status: 'pending'
      })
      .returning()
      .execute();

    const [task2] = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        description: 'Second task',
        agent_type: 'agent-2',
        status: 'running'
      })
      .returning()
      .execute();

    // Delete only the first task
    const deleteResult1 = await deleteTask(task1.id);
    expect(deleteResult1).toBe(true);

    // Verify first task is deleted, second still exists
    const tasks1 = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task1.id))
      .execute();

    const tasks2 = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task2.id))
      .execute();

    expect(tasks1).toHaveLength(0);
    expect(tasks2).toHaveLength(1);
    expect(tasks2[0].title).toBe('Task 2');
  });
});