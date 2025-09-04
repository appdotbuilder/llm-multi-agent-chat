import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Helper function to create a test task
const createTestTask = async () => {
  const taskInput = {
    title: 'Original Task',
    description: 'Original description',
    agent_type: 'code-generator'
  };

  const result = await db.insert(tasksTable)
    .values({
      title: taskInput.title,
      description: taskInput.description,
      agent_type: taskInput.agent_type
    })
    .returning()
    .execute();

  return result[0];
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a task with all fields', async () => {
    // Create a test task first
    const originalTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      title: 'Updated Task Title',
      description: 'Updated description',
      status: 'completed',
      agent_type: 'data-analyzer'
    };

    const result = await updateTask(updateInput);

    // Verify the update was successful
    expect(result).not.toBeNull();
    expect(result!.id).toBe(originalTask.id);
    expect(result!.title).toBe('Updated Task Title');
    expect(result!.description).toBe('Updated description');
    expect(result!.status).toBe('completed');
    expect(result!.agent_type).toBe('data-analyzer');
    expect(result!.created_at).toEqual(originalTask.created_at);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalTask.updated_at.getTime());
  });

  it('should update only provided fields', async () => {
    // Create a test task first
    const originalTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      title: 'Only Title Updated',
      status: 'running'
    };

    const result = await updateTask(updateInput);

    // Verify only specified fields were updated
    expect(result).not.toBeNull();
    expect(result!.id).toBe(originalTask.id);
    expect(result!.title).toBe('Only Title Updated');
    expect(result!.description).toBe(originalTask.description); // Should remain unchanged
    expect(result!.status).toBe('running');
    expect(result!.agent_type).toBe(originalTask.agent_type); // Should remain unchanged
    expect(result!.created_at).toEqual(originalTask.created_at);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalTask.updated_at.getTime());
  });

  it('should handle description set to null', async () => {
    // Create a test task first
    const originalTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      description: null
    };

    const result = await updateTask(updateInput);

    // Verify description was set to null
    expect(result).not.toBeNull();
    expect(result!.id).toBe(originalTask.id);
    expect(result!.description).toBeNull();
    expect(result!.title).toBe(originalTask.title); // Should remain unchanged
    expect(result!.status).toBe(originalTask.status); // Should remain unchanged
    expect(result!.agent_type).toBe(originalTask.agent_type); // Should remain unchanged
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalTask.updated_at.getTime());
  });

  it('should return null for non-existent task ID', async () => {
    const updateInput: UpdateTaskInput = {
      id: 99999, // Non-existent ID
      title: 'This should fail'
    };

    const result = await updateTask(updateInput);

    expect(result).toBeNull();
  });

  it('should persist changes to database', async () => {
    // Create a test task first
    const originalTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      title: 'Database Persistence Test',
      status: 'failed'
    };

    await updateTask(updateInput);

    // Query the database directly to verify changes were persisted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, originalTask.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Database Persistence Test');
    expect(tasks[0].status).toBe('failed');
    expect(tasks[0].description).toBe(originalTask.description); // Should remain unchanged
    expect(tasks[0].agent_type).toBe(originalTask.agent_type); // Should remain unchanged
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at.getTime()).toBeGreaterThan(originalTask.updated_at.getTime());
  });

  it('should handle all status values', async () => {
    // Create a test task first
    const originalTask = await createTestTask();
    
    const statuses = ['pending', 'running', 'completed', 'failed'] as const;

    for (const status of statuses) {
      const updateInput: UpdateTaskInput = {
        id: originalTask.id,
        status: status
      };

      const result = await updateTask(updateInput);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(status);
    }
  });

  it('should update only the updated_at timestamp when no other fields provided', async () => {
    // Create a test task first
    const originalTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: originalTask.id
    };

    const result = await updateTask(updateInput);

    // Verify that only updated_at was changed
    expect(result).not.toBeNull();
    expect(result!.id).toBe(originalTask.id);
    expect(result!.title).toBe(originalTask.title);
    expect(result!.description).toBe(originalTask.description);
    expect(result!.status).toBe(originalTask.status);
    expect(result!.agent_type).toBe(originalTask.agent_type);
    expect(result!.created_at).toEqual(originalTask.created_at);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalTask.updated_at.getTime());
  });
});