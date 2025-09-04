import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type GetTasksQuery, type CreateTaskInput } from '../schema';
import { getTasks } from '../handlers/get_tasks';
import { eq } from 'drizzle-orm';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test tasks
  const createTestTask = async (overrides: Partial<CreateTaskInput> = {}) => {
    const defaultTask = {
      title: 'Test Task',
      description: 'A test task',
      agent_type: 'code-generator',
      ...overrides
    };

    const result = await db.insert(tasksTable)
      .values({
        title: defaultTask.title,
        description: defaultTask.description,
        agent_type: defaultTask.agent_type,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should return empty array when no tasks exist', async () => {
    const query: GetTasksQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getTasks(query);
    expect(result).toEqual([]);
  });

  it('should return all tasks with default pagination', async () => {
    // Create test tasks
    await createTestTask({ title: 'Task 1', agent_type: 'code-generator' });
    await createTestTask({ title: 'Task 2', agent_type: 'data-analyzer' });
    await createTestTask({ title: 'Task 3', agent_type: 'writer' });

    const query: GetTasksQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getTasks(query);

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Task 3'); // Should be newest first due to ordering
    expect(result[1].title).toEqual('Task 2');
    expect(result[2].title).toEqual('Task 1');
  });

  it('should filter by status', async () => {
    await createTestTask({ title: 'Pending Task', agent_type: 'code-generator' });
    
    // Create completed task by updating status
    const completedTask = await createTestTask({ title: 'Completed Task', agent_type: 'data-analyzer' });
    await db.update(tasksTable)
      .set({ status: 'completed' })
      .where(eq(tasksTable.id, completedTask.id))
      .execute();

    await createTestTask({ title: 'Another Pending Task', agent_type: 'writer' });

    const query: GetTasksQuery = {
      status: 'pending',
      limit: 50,
      offset: 0
    };

    const result = await getTasks(query);

    expect(result).toHaveLength(2);
    result.forEach(task => {
      expect(task.status).toEqual('pending');
    });
  });

  it('should filter by agent_type', async () => {
    await createTestTask({ title: 'Code Task 1', agent_type: 'code-generator' });
    await createTestTask({ title: 'Data Task', agent_type: 'data-analyzer' });
    await createTestTask({ title: 'Code Task 2', agent_type: 'code-generator' });

    const query: GetTasksQuery = {
      agent_type: 'code-generator',
      limit: 50,
      offset: 0
    };

    const result = await getTasks(query);

    expect(result).toHaveLength(2);
    result.forEach(task => {
      expect(task.agent_type).toEqual('code-generator');
    });
    expect(result[0].title).toEqual('Code Task 2'); // Newest first
    expect(result[1].title).toEqual('Code Task 1');
  });

  it('should filter by both status and agent_type', async () => {
    // Create various combinations of tasks
    await createTestTask({ title: 'Pending Code Task', agent_type: 'code-generator' });
    
    const completedCodeTask = await createTestTask({ title: 'Completed Code Task', agent_type: 'code-generator' });
    await db.update(tasksTable)
      .set({ status: 'completed' })
      .where(eq(tasksTable.id, completedCodeTask.id))
      .execute();

    await createTestTask({ title: 'Pending Data Task', agent_type: 'data-analyzer' });

    const query: GetTasksQuery = {
      status: 'pending',
      agent_type: 'code-generator',
      limit: 50,
      offset: 0
    };

    const result = await getTasks(query);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Pending Code Task');
    expect(result[0].status).toEqual('pending');
    expect(result[0].agent_type).toEqual('code-generator');
  });

  it('should handle pagination correctly', async () => {
    // Create 5 test tasks
    for (let i = 1; i <= 5; i++) {
      await createTestTask({ title: `Task ${i}`, agent_type: 'code-generator' });
    }

    // Get first page (limit 2)
    const firstPageQuery: GetTasksQuery = {
      limit: 2,
      offset: 0
    };

    const firstPage = await getTasks(firstPageQuery);
    expect(firstPage).toHaveLength(2);
    expect(firstPage[0].title).toEqual('Task 5'); // Newest first
    expect(firstPage[1].title).toEqual('Task 4');

    // Get second page (limit 2, offset 2)
    const secondPageQuery: GetTasksQuery = {
      limit: 2,
      offset: 2
    };

    const secondPage = await getTasks(secondPageQuery);
    expect(secondPage).toHaveLength(2);
    expect(secondPage[0].title).toEqual('Task 3');
    expect(secondPage[1].title).toEqual('Task 2');

    // Get remaining page
    const thirdPageQuery: GetTasksQuery = {
      limit: 2,
      offset: 4
    };

    const thirdPage = await getTasks(thirdPageQuery);
    expect(thirdPage).toHaveLength(1);
    expect(thirdPage[0].title).toEqual('Task 1');
  });

  it('should return tasks ordered by created_at descending (newest first)', async () => {
    // Create tasks with slight delays to ensure different timestamps
    const task1 = await createTestTask({ title: 'First Task' });
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    const task2 = await createTestTask({ title: 'Second Task' });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    const task3 = await createTestTask({ title: 'Third Task' });

    const query: GetTasksQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getTasks(query);

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Third Task');
    expect(result[1].title).toEqual('Second Task');
    expect(result[2].title).toEqual('First Task');

    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThanOrEqual(result[2].created_at.getTime());
  });

  it('should return tasks with all required fields', async () => {
    await createTestTask({
      title: 'Complete Task',
      description: 'A task with all fields',
      agent_type: 'data-analyzer'
    });

    const query: GetTasksQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getTasks(query);

    expect(result).toHaveLength(1);
    const task = result[0];

    expect(task.id).toBeDefined();
    expect(task.title).toEqual('Complete Task');
    expect(task.description).toEqual('A task with all fields');
    expect(task.status).toEqual('pending'); // Default status
    expect(task.agent_type).toEqual('data-analyzer');
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });

  it('should handle empty offset with results', async () => {
    await createTestTask({ title: 'Test Task' });

    const query: GetTasksQuery = {
      limit: 10,
      offset: 100 // Offset beyond available results
    };

    const result = await getTasks(query);
    expect(result).toEqual([]);
  });
});