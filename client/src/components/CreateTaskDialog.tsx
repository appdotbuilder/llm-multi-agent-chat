import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Bot, Loader2 } from 'lucide-react';
import type { CreateTaskInput } from '../../../server/src/schema';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
}

export function CreateTaskDialog({ open, onOpenChange, onSubmit }: CreateTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: null,
    agent_type: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.agent_type) return;
    
    setIsLoading(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        title: '',
        description: null,
        agent_type: '',
      });
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const agentTypes = [
    { value: 'code-generator', label: '💻 Code Generator', description: 'Generates and reviews code' },
    { value: 'data-analyzer', label: '📊 Data Analyzer', description: 'Analyzes data and creates insights' },
    { value: 'writer', label: '✍️ Writer', description: 'Creates and edits written content' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Create New Agent Task
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="Enter task title..."
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the task in detail..."
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: CreateTaskInput) => ({
                  ...prev,
                  description: e.target.value || null,
                }))
              }
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent_type">Agent Type</Label>
            <Select 
              value={formData.agent_type || undefined} 
              onValueChange={(value: string) =>
                setFormData((prev: CreateTaskInput) => ({ ...prev, agent_type: value }))
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an agent type..." />
              </SelectTrigger>
              <SelectContent>
                {agentTypes.map((agent) => (
                  <SelectItem key={agent.value} value={agent.value}>
                    <div className="flex flex-col items-start">
                      <span>{agent.label}</span>
                      <span className="text-xs text-gray-500">{agent.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title || !formData.agent_type}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}