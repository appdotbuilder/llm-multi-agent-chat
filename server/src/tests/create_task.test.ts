import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing purposes',
  agent_type: 'code-generator'
};

// Test input with minimal fields (null description)
const minimalInput: CreateTaskInput = {
  title: 'Minimal Task',
  description: null,
  agent_type: 'data-analyzer'
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const result = await createTask(testInput);

    // Validate returned task structure
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing purposes');
    expect(result.agent_type).toEqual('code-generator');
    expect(result.status).toEqual('pending');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with null description', async () => {
    const result = await createTask(minimalInput);

    // Validate minimal task creation
    expect(result.id).toBeDefined();
    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.agent_type).toEqual('data-analyzer');
    expect(result.status).toEqual('pending');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database correctly', async () => {
    const result = await createTask(testInput);

    // Query database to verify task was saved
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing purposes');
    expect(tasks[0].agent_type).toEqual('code-generator');
    expect(tasks[0].status).toEqual('pending');
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple tasks with different agent types', async () => {
    // Create tasks with different agent types
    const codeTask = await createTask({
      title: 'Code Generation Task',
      description: 'Generate TypeScript code',
      agent_type: 'code-generator'
    });

    const dataTask = await createTask({
      title: 'Data Analysis Task',
      description: 'Analyze dataset',
      agent_type: 'data-analyzer'
    });

    const writeTask = await createTask({
      title: 'Writing Task',
      description: null,
      agent_type: 'writer'
    });

    // Verify all tasks were created with correct agent types
    expect(codeTask.agent_type).toEqual('code-generator');
    expect(dataTask.agent_type).toEqual('data-analyzer');
    expect(writeTask.agent_type).toEqual('writer');

    // Verify all have default pending status
    expect(codeTask.status).toEqual('pending');
    expect(dataTask.status).toEqual('pending');
    expect(writeTask.status).toEqual('pending');

    // Verify all have unique IDs
    expect(codeTask.id).not.toEqual(dataTask.id);
    expect(dataTask.id).not.toEqual(writeTask.id);
    expect(codeTask.id).not.toEqual(writeTask.id);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createTask(testInput);
    const afterCreation = new Date();

    // Verify timestamps are within expected range
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should handle empty string description as valid', async () => {
    const emptyDescInput: CreateTaskInput = {
      title: 'Empty Description Task',
      description: '',
      agent_type: 'writer'
    };

    const result = await createTask(emptyDescInput);

    expect(result.title).toEqual('Empty Description Task');
    expect(result.description).toEqual('');
    expect(result.agent_type).toEqual('writer');
  });
});