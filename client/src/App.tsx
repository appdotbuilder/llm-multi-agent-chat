import { TaskPanel } from '@/components/TaskPanel';
import { ExecutionPanel } from '@/components/ExecutionPanel';
import { useState } from 'react';
import type { Task } from '../../server/src/schema';

function App() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left Panel - Task List */}
        <div className="w-1/2 border-r border-gray-200 bg-white">
          <TaskPanel 
            selectedTask={selectedTask} 
            onTaskSelect={setSelectedTask} 
          />
        </div>

        {/* Right Panel - Execution Results */}
        <div className="w-1/2 bg-white">
          <ExecutionPanel selectedTask={selectedTask} />
        </div>
      </div>
    </div>
  );
}

export default App;