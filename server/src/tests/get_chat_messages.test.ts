import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, chatMessagesTable } from '../db/schema';
import { type GetChatMessagesQuery, type CreateTaskInput, type CreateChatMessageInput } from '../schema';
import { getChatMessages } from '../handlers/get_chat_messages';
import { eq } from 'drizzle-orm';

// Test data
const testTask: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing chat messages',
  agent_type: 'test-agent'
};

const createTestChatMessage = (taskId: number, content: string, role: 'user' | 'agent' | 'system' = 'user', agentName: string | null = null): CreateChatMessageInput => ({
  task_id: taskId,
  role,
  content,
  agent_name: agentName
});

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve chat messages for a specific task', async () => {
    // Create a test task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTask.title,
        description: testTask.description,
        agent_type: testTask.agent_type
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Create test chat messages
    const messages = [
      createTestChatMessage(taskId, 'Hello, I need help with something', 'user'),
      createTestChatMessage(taskId, 'Sure! I can help you with that.', 'agent', 'test-agent'),
      createTestChatMessage(taskId, 'Great, thank you!', 'user')
    ];

    for (const message of messages) {
      await db.insert(chatMessagesTable)
        .values({
          task_id: message.task_id,
          role: message.role,
          content: message.content,
          agent_name: message.agent_name
        })
        .execute();
    }

    // Query messages
    const query: GetChatMessagesQuery = {
      task_id: taskId,
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(query);

    // Verify results
    expect(result).toHaveLength(3);
    expect(result[0].content).toEqual('Hello, I need help with something');
    expect(result[0].role).toEqual('user');
    expect(result[0].agent_name).toBeNull();
    expect(result[1].content).toEqual('Sure! I can help you with that.');
    expect(result[1].role).toEqual('agent');
    expect(result[1].agent_name).toEqual('test-agent');
    expect(result[2].content).toEqual('Great, thank you!');
    expect(result[2].role).toEqual('user');

    // Verify all messages have required fields
    result.forEach(message => {
      expect(message.id).toBeDefined();
      expect(message.task_id).toEqual(taskId);
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  it('should return messages ordered by timestamp ASC (oldest first)', async () => {
    // Create a test task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTask.title,
        description: testTask.description,
        agent_type: testTask.agent_type
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Create messages with slight delay to ensure different timestamps
    const message1 = await db.insert(chatMessagesTable)
      .values({
        task_id: taskId,
        role: 'user',
        content: 'First message',
        agent_name: null
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const message2 = await db.insert(chatMessagesTable)
      .values({
        task_id: taskId,
        role: 'agent',
        content: 'Second message',
        agent_name: 'test-agent'
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const message3 = await db.insert(chatMessagesTable)
      .values({
        task_id: taskId,
        role: 'user',
        content: 'Third message',
        agent_name: null
      })
      .returning()
      .execute();

    const query: GetChatMessagesQuery = {
      task_id: taskId,
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(query);

    // Verify chronological order (oldest first)
    expect(result).toHaveLength(3);
    expect(result[0].content).toEqual('First message');
    expect(result[1].content).toEqual('Second message');
    expect(result[2].content).toEqual('Third message');

    // Verify timestamps are in ascending order
    expect(result[0].timestamp.getTime()).toBeLessThanOrEqual(result[1].timestamp.getTime());
    expect(result[1].timestamp.getTime()).toBeLessThanOrEqual(result[2].timestamp.getTime());
  });

  it('should support pagination with limit and offset', async () => {
    // Create a test task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTask.title,
        description: testTask.description,
        agent_type: testTask.agent_type
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Create 5 test messages
    for (let i = 1; i <= 5; i++) {
      await db.insert(chatMessagesTable)
        .values({
          task_id: taskId,
          role: 'user',
          content: `Message ${i}`,
          agent_name: null
        })
        .execute();

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    // Test first page
    const firstPageQuery: GetChatMessagesQuery = {
      task_id: taskId,
      limit: 2,
      offset: 0
    };

    const firstPage = await getChatMessages(firstPageQuery);
    expect(firstPage).toHaveLength(2);
    expect(firstPage[0].content).toEqual('Message 1');
    expect(firstPage[1].content).toEqual('Message 2');

    // Test second page
    const secondPageQuery: GetChatMessagesQuery = {
      task_id: taskId,
      limit: 2,
      offset: 2
    };

    const secondPage = await getChatMessages(secondPageQuery);
    expect(secondPage).toHaveLength(2);
    expect(secondPage[0].content).toEqual('Message 3');
    expect(secondPage[1].content).toEqual('Message 4');

    // Test remaining page
    const thirdPageQuery: GetChatMessagesQuery = {
      task_id: taskId,
      limit: 2,
      offset: 4
    };

    const thirdPage = await getChatMessages(thirdPageQuery);
    expect(thirdPage).toHaveLength(1);
    expect(thirdPage[0].content).toEqual('Message 5');
  });

  it('should return empty array for non-existent task', async () => {
    const query: GetChatMessagesQuery = {
      task_id: 99999, // Non-existent task ID
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(query);
    expect(result).toHaveLength(0);
  });

  it('should only return messages for the specified task', async () => {
    // Create two test tasks
    const task1Result = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        description: 'First task',
        agent_type: 'test-agent'
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        description: 'Second task',
        agent_type: 'test-agent'
      })
      .returning()
      .execute();

    const task1Id = task1Result[0].id;
    const task2Id = task2Result[0].id;

    // Create messages for both tasks
    await db.insert(chatMessagesTable)
      .values({
        task_id: task1Id,
        role: 'user',
        content: 'Message for task 1',
        agent_name: null
      })
      .execute();

    await db.insert(chatMessagesTable)
      .values({
        task_id: task2Id,
        role: 'user',
        content: 'Message for task 2',
        agent_name: null
      })
      .execute();

    await db.insert(chatMessagesTable)
      .values({
        task_id: task1Id,
        role: 'agent',
        content: 'Another message for task 1',
        agent_name: 'test-agent'
      })
      .execute();

    // Query messages for task 1 only
    const query: GetChatMessagesQuery = {
      task_id: task1Id,
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(query);

    // Should only return messages for task 1
    expect(result).toHaveLength(2);
    result.forEach(message => {
      expect(message.task_id).toEqual(task1Id);
    });
    expect(result[0].content).toEqual('Message for task 1');
    expect(result[1].content).toEqual('Another message for task 1');
  });

  it('should handle different message roles and agent names correctly', async () => {
    // Create a test task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: testTask.title,
        description: testTask.description,
        agent_type: testTask.agent_type
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Create messages with different roles
    const messages = [
      { role: 'user' as const, content: 'User message', agent_name: null },
      { role: 'agent' as const, content: 'Agent message', agent_name: 'code-generator' },
      { role: 'system' as const, content: 'System message', agent_name: null },
      { role: 'agent' as const, content: 'Another agent message', agent_name: 'data-analyzer' }
    ];

    for (const message of messages) {
      await db.insert(chatMessagesTable)
        .values({
          task_id: taskId,
          role: message.role,
          content: message.content,
          agent_name: message.agent_name
        })
        .execute();
    }

    const query: GetChatMessagesQuery = {
      task_id: taskId,
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(query);

    expect(result).toHaveLength(4);
    expect(result[0].role).toEqual('user');
    expect(result[0].agent_name).toBeNull();
    expect(result[1].role).toEqual('agent');
    expect(result[1].agent_name).toEqual('code-generator');
    expect(result[2].role).toEqual('system');
    expect(result[2].agent_name).toBeNull();
    expect(result[3].role).toEqual('agent');
    expect(result[3].agent_name).toEqual('data-analyzer');
  });
});