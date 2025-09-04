import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatMessagesTable, tasksTable } from '../db/schema';
import { type CreateChatMessageInput, type CreateTaskInput } from '../schema';
import { createChatMessage } from '../handlers/create_chat_message';
import { eq } from 'drizzle-orm';

// Test input for creating a chat message
const testChatMessageInput: CreateChatMessageInput = {
  task_id: 1,
  role: 'user',
  content: 'Hello, can you help me with this task?',
  agent_name: null
};

// Test input for creating a task (prerequisite)
const testTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing chat messages',
  agent_type: 'code-generator'
};

describe('createChatMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a chat message with user role', async () => {
    // Create prerequisite task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        agent_type: testTaskInput.agent_type
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create chat message
    const chatInput = { ...testChatMessageInput, task_id: task.id };
    const result = await createChatMessage(chatInput);

    // Basic field validation
    expect(result.task_id).toEqual(task.id);
    expect(result.role).toEqual('user');
    expect(result.content).toEqual('Hello, can you help me with this task?');
    expect(result.agent_name).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should create a chat message with agent role and agent name', async () => {
    // Create prerequisite task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        agent_type: testTaskInput.agent_type
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create chat message with agent role
    const agentChatInput: CreateChatMessageInput = {
      task_id: task.id,
      role: 'agent',
      content: 'Sure! I can help you with code generation.',
      agent_name: 'CodeGenBot'
    };

    const result = await createChatMessage(agentChatInput);

    expect(result.task_id).toEqual(task.id);
    expect(result.role).toEqual('agent');
    expect(result.content).toEqual('Sure! I can help you with code generation.');
    expect(result.agent_name).toEqual('CodeGenBot');
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should create a system message', async () => {
    // Create prerequisite task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        agent_type: testTaskInput.agent_type
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create system message
    const systemChatInput: CreateChatMessageInput = {
      task_id: task.id,
      role: 'system',
      content: 'Task has been assigned to code-generator agent.',
      agent_name: null
    };

    const result = await createChatMessage(systemChatInput);

    expect(result.task_id).toEqual(task.id);
    expect(result.role).toEqual('system');
    expect(result.content).toEqual('Task has been assigned to code-generator agent.');
    expect(result.agent_name).toBeNull();
  });

  it('should save chat message to database', async () => {
    // Create prerequisite task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        agent_type: testTaskInput.agent_type
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create chat message
    const chatInput = { ...testChatMessageInput, task_id: task.id };
    const result = await createChatMessage(chatInput);

    // Query using proper drizzle syntax
    const chatMessages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(chatMessages).toHaveLength(1);
    expect(chatMessages[0].task_id).toEqual(task.id);
    expect(chatMessages[0].role).toEqual('user');
    expect(chatMessages[0].content).toEqual('Hello, can you help me with this task?');
    expect(chatMessages[0].agent_name).toBeNull();
    expect(chatMessages[0].timestamp).toBeInstanceOf(Date);
  });

  it('should throw error when task_id does not exist', async () => {
    // Try to create chat message with non-existent task_id
    const invalidChatInput: CreateChatMessageInput = {
      task_id: 999,
      role: 'user',
      content: 'This should fail',
      agent_name: null
    };

    await expect(createChatMessage(invalidChatInput)).rejects.toThrow(/Task with id 999 not found/i);
  });

  it('should handle multiple chat messages for the same task', async () => {
    // Create prerequisite task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        agent_type: testTaskInput.agent_type
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create multiple chat messages
    const userMessage = await createChatMessage({
      task_id: task.id,
      role: 'user',
      content: 'First message',
      agent_name: null
    });

    const agentMessage = await createChatMessage({
      task_id: task.id,
      role: 'agent',
      content: 'Agent response',
      agent_name: 'TestAgent'
    });

    const systemMessage = await createChatMessage({
      task_id: task.id,
      role: 'system',
      content: 'System notification',
      agent_name: null
    });

    // Verify all messages were created with different IDs
    expect(userMessage.id).not.toEqual(agentMessage.id);
    expect(agentMessage.id).not.toEqual(systemMessage.id);
    expect(userMessage.task_id).toEqual(task.id);
    expect(agentMessage.task_id).toEqual(task.id);
    expect(systemMessage.task_id).toEqual(task.id);

    // Verify all messages exist in database
    const allMessages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.task_id, task.id))
      .execute();

    expect(allMessages).toHaveLength(3);
  });
});