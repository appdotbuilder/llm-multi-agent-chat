import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Code, 
  Database, 
  MessageSquare,
  Bot,
  User,
  Settings,
  RefreshCw
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Task, ExecutionResult, ChatMessage } from '../../../server/src/schema';

interface ExecutionPanelProps {
  selectedTask: Task | null;
}

export function ExecutionPanel({ selectedTask }: ExecutionPanelProps) {
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const loadExecutionResults = useCallback(async (taskId: number) => {
    setIsLoadingResults(true);
    try {
      const results = await trpc.getExecutionResults.query({ task_id: taskId });
      setExecutionResults(results);
    } catch (error) {
      console.error('Failed to load execution results:', error);
    } finally {
      setIsLoadingResults(false);
    }
  }, []);

  const loadChatMessages = useCallback(async (taskId: number) => {
    setIsLoadingMessages(true);
    try {
      const messages = await trpc.getChatMessages.query({ task_id: taskId, limit: 50, offset: 0 });
      setChatMessages(messages);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTask) {
      loadExecutionResults(selectedTask.id);
      loadChatMessages(selectedTask.id);
    } else {
      setExecutionResults([]);
      setChatMessages([]);
    }
  }, [selectedTask, loadExecutionResults, loadChatMessages]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'partial': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'code': return <Code className="w-4 h-4" />;
      case 'json': return <Database className="w-4 h-4" />;
      case 'markdown': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user': return <User className="w-4 h-4" />;
      case 'agent': return <Bot className="w-4 h-4" />;
      case 'system': return <Settings className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const handleRefresh = () => {
    if (selectedTask) {
      loadExecutionResults(selectedTask.id);
      loadChatMessages(selectedTask.id);
    }
  };

  if (!selectedTask) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Task</h3>
          <p className="text-gray-500">Choose a task from the left panel to view its execution results and chat history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="text-xs capitalize">
                  {selectedTask.agent_type.replace('-', ' ')}
                </Badge>
                <Badge 
                  className={
                    selectedTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedTask.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    selectedTask.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }
                >
                  {selectedTask.status}
                </Badge>
              </div>
            </div>
          </div>
          
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {selectedTask.description && (
          <p className="text-gray-600 text-sm">{selectedTask.description}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="results" className="flex flex-col h-full">
          <TabsList className="mx-6 mt-4 grid w-fit grid-cols-2">
            <TabsTrigger value="results" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Results ({executionResults.length})
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat ({chatMessages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="flex-1 mt-4 mx-6 mb-6">
            <ScrollArea className="h-full">
              {isLoadingResults ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : executionResults.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No execution results yet</p>
                  <p className="text-sm text-gray-400">Results will appear here when the agent completes tasks.</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {executionResults.map((result: ExecutionResult) => (
                    <Card key={result.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <CardTitle className="text-sm font-medium">
                              Execution Result
                            </CardTitle>
                            <div className="flex items-center gap-1">
                              {getContentTypeIcon(result.content_type)}
                              <span className="text-xs text-gray-500 capitalize">
                                {result.content_type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatExecutionTime(result.execution_time_ms)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {result.error_message && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                              <XCircle className="w-4 h-4" />
                              Error
                            </div>
                            <p className="text-red-600 text-sm">{result.error_message}</p>
                          </div>
                        )}
                        <div className="bg-gray-50 p-3 rounded-md">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                            {result.content}
                          </pre>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          Created: {result.created_at.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 mt-4 mx-6 mb-6">
            <ScrollArea className="h-full">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No chat messages yet</p>
                  <p className="text-sm text-gray-400">Agent conversations will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {chatMessages.map((message: ChatMessage) => (
                    <div key={message.id} className="flex gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                        message.role === 'user' ? 'bg-blue-100' :
                        message.role === 'agent' ? 'bg-green-100' :
                        'bg-gray-100'
                      }`}>
                        {getRoleIcon(message.role)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm capitalize">
                            {message.role === 'agent' && message.agent_name 
                              ? message.agent_name 
                              : message.role}
                          </span>
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}