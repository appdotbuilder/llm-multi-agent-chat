import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Plus, Search, Bot } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Task, CreateTaskInput } from '../../../server/src/schema';
import { CreateTaskDialog } from './CreateTaskDialog';

interface TaskPanelProps {
  selectedTask: Task | null;
  onTaskSelect: (task: Task) => void;
}

export function TaskPanel({ selectedTask, onTaskSelect }: TaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = {
        status: statusFilter !== 'all' ? (statusFilter as 'pending' | 'running' | 'completed' | 'failed') : undefined,
        agent_type: agentTypeFilter !== 'all' ? agentTypeFilter : undefined,
        limit: 50,
        offset: 0,
      };
      const result = await trpc.getTasks.query(query);
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, agentTypeFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = tasks.filter((task: Task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateTask = async (data: CreateTaskInput) => {
    try {
      const newTask = await trpc.createTask.mutate(data);
      setTasks((prev: Task[]) => [newTask, ...prev]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'running': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'failed': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getAgentIcon = () => {
    return <Bot className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">🤖 Agent Tasks</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Agent Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="code-generator">Code Generator</SelectItem>
                <SelectItem value="data-analyzer">Data Analyzer</SelectItem>
                <SelectItem value="writer">Writer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No tasks found</p>
              <p className="text-sm text-gray-400">Create your first agent task to get started!</p>
            </div>
          ) : (
            filteredTasks.map((task: Task) => (
              <Card 
                key={task.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTask?.id === task.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => onTaskSelect(task)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium text-gray-900 line-clamp-2">
                      {task.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {getAgentIcon()}
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                {task.description && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {task.description}
                    </p>
                  </CardContent>
                )}
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{task.agent_type.replace('-', ' ')}</span>
                    <span>{task.created_at.toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}