import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { getTaskById } from '../handlers/get_task_by_id';

// Test task input data
const testTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing purposes',
  agent_type: 'code-generator'
};

const testTaskInputWithoutDescription: CreateTaskInput = {
  title: 'Test Task No Description',
  description: null,
  agent_type: 'data-analyzer'
};

describe('getTaskById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return task when found by ID', async () => {
    // Create a test task in the database
    const insertResult = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        agent_type: testTaskInput.agent_type
      })
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test the handler
    const result = await getTaskById(createdTask.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTask.id);
    expect(result!.title).toEqual('Test Task');
    expect(result!.description).toEqual('A task for testing purposes');
    expect(result!.status).toEqual('pending'); // Default status
    expect(result!.agent_type).toEqual('code-generator');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when task not found', async () => {
    // Try to get a task that doesn't exist
    const result = await getTaskById(999999);

    // Verify null is returned
    expect(result).toBeNull();
  });

  it('should handle task with null description', async () => {
    // Create a test task with null description
    const insertResult = await db.insert(tasksTable)
      .values({
        title: testTaskInputWithoutDescription.title,
        description: testTaskInputWithoutDescription.description,
        agent_type: testTaskInputWithoutDescription.agent_type
      })
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test the handler
    const result = await getTaskById(createdTask.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTask.id);
    expect(result!.title).toEqual('Test Task No Description');
    expect(result!.description).toBeNull();
    expect(result!.agent_type).toEqual('data-analyzer');
  });

  it('should handle different task statuses correctly', async () => {
    // Create a task with completed status
    const insertResult = await db.insert(tasksTable)
      .values({
        title: 'Completed Task',
        description: 'A completed task',
        agent_type: 'writer',
        status: 'completed'
      })
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test the handler
    const result = await getTaskById(createdTask.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTask.id);
    expect(result!.status).toEqual('completed');
    expect(result!.title).toEqual('Completed Task');
    expect(result!.agent_type).toEqual('writer');
  });

  it('should handle task with different agent types', async () => {
    // Create tasks with different agent types
    const agentTypes = ['code-generator', 'data-analyzer', 'writer', 'custom-agent'];
    
    for (const agentType of agentTypes) {
      const insertResult = await db.insert(tasksTable)
        .values({
          title: `Task for ${agentType}`,
          description: `Task handled by ${agentType}`,
          agent_type: agentType
        })
        .returning()
        .execute();

      const createdTask = insertResult[0];
      const result = await getTaskById(createdTask.id);

      expect(result).not.toBeNull();
      expect(result!.agent_type).toEqual(agentType);
      expect(result!.title).toEqual(`Task for ${agentType}`);
    }
  });

  it('should return correct timestamp data types', async () => {
    // Create a test task
    const insertResult = await db.insert(tasksTable)
      .values({
        title: 'Timestamp Test Task',
        description: 'Testing timestamp handling',
        agent_type: 'test-agent'
      })
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test the handler
    const result = await getTaskById(createdTask.id);

    // Verify timestamp types and values
    expect(result).not.toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Verify timestamps are reasonable (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(result!.created_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(result!.created_at.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(result!.updated_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(result!.updated_at.getTime()).toBeLessThanOrEqual(now.getTime());
  });
});