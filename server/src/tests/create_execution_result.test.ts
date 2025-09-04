import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { executionResultsTable, tasksTable } from '../db/schema';
import { type CreateExecutionResultInput, type CreateTaskInput } from '../schema';
import { createExecutionResult } from '../handlers/create_execution_result';
import { eq } from 'drizzle-orm';

// Test task for creating execution results
const testTask: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing execution results',
  agent_type: 'test-agent'
};

// Simple test execution result input
const testExecutionResultInput: CreateExecutionResultInput = {
  task_id: 1, // Will be updated with actual task ID
  content: 'Test execution result content',
  content_type: 'text',
  execution_time_ms: 1500,
  status: 'success',
  error_message: null
};

describe('createExecutionResult', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let taskId: number;

  beforeEach(async () => {
    // Create a test task first
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTask.title,
        description: testTask.description,
        agent_type: testTask.agent_type
      })
      .returning()
      .execute();
    taskId = taskResult[0].id;
  });

  it('should create an execution result', async () => {
    const input = { ...testExecutionResultInput, task_id: taskId };
    const result = await createExecutionResult(input);

    // Basic field validation
    expect(result.task_id).toEqual(taskId);
    expect(result.content).toEqual('Test execution result content');
    expect(result.content_type).toEqual('text');
    expect(result.execution_time_ms).toEqual(1500);
    expect(result.status).toEqual('success');
    expect(result.error_message).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save execution result to database', async () => {
    const input = { ...testExecutionResultInput, task_id: taskId };
    const result = await createExecutionResult(input);

    // Query using proper drizzle syntax
    const executionResults = await db.select()
      .from(executionResultsTable)
      .where(eq(executionResultsTable.id, result.id))
      .execute();

    expect(executionResults).toHaveLength(1);
    expect(executionResults[0].task_id).toEqual(taskId);
    expect(executionResults[0].content).toEqual('Test execution result content');
    expect(executionResults[0].content_type).toEqual('text');
    expect(executionResults[0].execution_time_ms).toEqual(1500);
    expect(executionResults[0].status).toEqual('success');
    expect(executionResults[0].error_message).toBeNull();
    expect(executionResults[0].created_at).toBeInstanceOf(Date);
  });

  it('should create execution result with error status and message', async () => {
    const errorInput: CreateExecutionResultInput = {
      task_id: taskId,
      content: 'Partial result before error',
      content_type: 'json',
      execution_time_ms: 800,
      status: 'error',
      error_message: 'Connection timeout occurred'
    };

    const result = await createExecutionResult(errorInput);

    expect(result.status).toEqual('error');
    expect(result.error_message).toEqual('Connection timeout occurred');
    expect(result.content_type).toEqual('json');
    expect(result.execution_time_ms).toEqual(800);
  });

  it('should create execution result with different content types', async () => {
    const codeInput: CreateExecutionResultInput = {
      task_id: taskId,
      content: 'function hello() { return "world"; }',
      content_type: 'code',
      execution_time_ms: 250,
      status: 'success',
      error_message: null
    };

    const result = await createExecutionResult(codeInput);

    expect(result.content).toEqual('function hello() { return "world"; }');
    expect(result.content_type).toEqual('code');
    expect(result.execution_time_ms).toEqual(250);
  });

  it('should throw error when task does not exist', async () => {
    const invalidInput: CreateExecutionResultInput = {
      task_id: 99999, // Non-existent task ID
      content: 'This should fail',
      content_type: 'text',
      execution_time_ms: 100,
      status: 'success',
      error_message: null
    };

    expect(createExecutionResult(invalidInput)).rejects.toThrow(/task with id 99999 does not exist/i);
  });

  it('should handle partial execution status correctly', async () => {
    const partialInput: CreateExecutionResultInput = {
      task_id: taskId,
      content: 'Partial analysis completed',
      content_type: 'markdown',
      execution_time_ms: 3000,
      status: 'partial',
      error_message: 'Analysis incomplete due to time constraints'
    };

    const result = await createExecutionResult(partialInput);

    expect(result.status).toEqual('partial');
    expect(result.content_type).toEqual('markdown');
    expect(result.error_message).toEqual('Analysis incomplete due to time constraints');
    expect(result.execution_time_ms).toEqual(3000);
  });
});