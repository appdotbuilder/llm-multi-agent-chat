import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, executionResultsTable } from '../db/schema';
import { type GetExecutionResultsQuery, type CreateTaskInput, type CreateExecutionResultInput } from '../schema';
import { getExecutionResults } from '../handlers/get_execution_results';

describe('getExecutionResults', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test task
  const createTestTask = async (): Promise<number> => {
    const taskInput: CreateTaskInput = {
      title: 'Test Task',
      description: 'A task for testing',
      agent_type: 'test-agent'
    };

    const result = await db.insert(tasksTable)
      .values(taskInput)
      .returning()
      .execute();

    return result[0].id;
  };

  // Helper function to create test execution results
  const createTestExecutionResults = async (taskId: number) => {
    const executionResults: CreateExecutionResultInput[] = [
      {
        task_id: taskId,
        content: 'First execution result',
        content_type: 'text',
        execution_time_ms: 1000,
        status: 'success',
        error_message: null
      },
      {
        task_id: taskId,
        content: '{"result": "json data"}',
        content_type: 'json',
        execution_time_ms: 2500,
        status: 'success',
        error_message: null
      },
      {
        task_id: taskId,
        content: 'Failed execution',
        content_type: 'text',
        execution_time_ms: 500,
        status: 'error',
        error_message: 'Something went wrong'
      }
    ];

    // Insert with slight delays to ensure different timestamps for ordering tests
    for (let i = 0; i < executionResults.length; i++) {
      await db.insert(executionResultsTable)
        .values(executionResults[i])
        .execute();
      
      // Small delay to ensure different timestamps
      if (i < executionResults.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  };

  it('should return execution results for a task', async () => {
    const taskId = await createTestTask();
    await createTestExecutionResults(taskId);

    const query: GetExecutionResultsQuery = {
      task_id: taskId
    };

    const results = await getExecutionResults(query);

    expect(results).toHaveLength(3);
    
    // Verify all results belong to the correct task
    results.forEach(result => {
      expect(result.task_id).toBe(taskId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    // Check specific content
    const contents = results.map(r => r.content);
    expect(contents).toContain('First execution result');
    expect(contents).toContain('{"result": "json data"}');
    expect(contents).toContain('Failed execution');
  });

  it('should return results ordered by created_at DESC (newest first)', async () => {
    const taskId = await createTestTask();
    await createTestExecutionResults(taskId);

    const query: GetExecutionResultsQuery = {
      task_id: taskId
    };

    const results = await getExecutionResults(query);

    expect(results).toHaveLength(3);

    // Verify results are ordered by created_at DESC
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].created_at.getTime()).toBeGreaterThanOrEqual(
        results[i + 1].created_at.getTime()
      );
    }

    // The last inserted result should be first (newest)
    expect(results[0].content).toBe('Failed execution');
    expect(results[0].error_message).toBe('Something went wrong');
  });

  it('should return empty array when no execution results exist for task', async () => {
    const taskId = await createTestTask();
    // Don't create any execution results

    const query: GetExecutionResultsQuery = {
      task_id: taskId
    };

    const results = await getExecutionResults(query);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return empty array for non-existent task', async () => {
    const query: GetExecutionResultsQuery = {
      task_id: 999999 // Non-existent task ID
    };

    const results = await getExecutionResults(query);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return correct data types for all fields', async () => {
    const taskId = await createTestTask();
    
    const executionResult: CreateExecutionResultInput = {
      task_id: taskId,
      content: 'Test content with all field types',
      content_type: 'markdown',
      execution_time_ms: 1500,
      status: 'partial',
      error_message: 'Partial completion warning'
    };

    await db.insert(executionResultsTable)
      .values(executionResult)
      .execute();

    const query: GetExecutionResultsQuery = {
      task_id: taskId
    };

    const results = await getExecutionResults(query);

    expect(results).toHaveLength(1);
    const result = results[0];

    // Verify data types
    expect(typeof result.id).toBe('number');
    expect(typeof result.task_id).toBe('number');
    expect(typeof result.content).toBe('string');
    expect(typeof result.content_type).toBe('string');
    expect(typeof result.execution_time_ms).toBe('number');
    expect(typeof result.status).toBe('string');
    expect(typeof result.error_message).toBe('string');
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify specific values
    expect(result.task_id).toBe(taskId);
    expect(result.content).toBe('Test content with all field types');
    expect(result.content_type).toBe('markdown');
    expect(result.execution_time_ms).toBe(1500);
    expect(result.status).toBe('partial');
    expect(result.error_message).toBe('Partial completion warning');
  });

  it('should handle multiple tasks correctly', async () => {
    // Create two different tasks
    const taskId1 = await createTestTask();
    const taskId2 = await createTestTask();

    // Add execution results to first task
    await db.insert(executionResultsTable)
      .values({
        task_id: taskId1,
        content: 'Result for task 1',
        content_type: 'text',
        execution_time_ms: 1000,
        status: 'success',
        error_message: null
      })
      .execute();

    // Add execution results to second task
    await db.insert(executionResultsTable)
      .values({
        task_id: taskId2,
        content: 'Result for task 2',
        content_type: 'code',
        execution_time_ms: 2000,
        status: 'success',
        error_message: null
      })
      .execute();

    // Query results for first task
    const query1: GetExecutionResultsQuery = {
      task_id: taskId1
    };

    const results1 = await getExecutionResults(query1);

    expect(results1).toHaveLength(1);
    expect(results1[0].task_id).toBe(taskId1);
    expect(results1[0].content).toBe('Result for task 1');

    // Query results for second task
    const query2: GetExecutionResultsQuery = {
      task_id: taskId2
    };

    const results2 = await getExecutionResults(query2);

    expect(results2).toHaveLength(1);
    expect(results2[0].task_id).toBe(taskId2);
    expect(results2[0].content).toBe('Result for task 2');
    expect(results2[0].content_type).toBe('code');
  });
});