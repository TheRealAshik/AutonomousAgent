import React, { useState } from 'react';
import {
  X,
  Check,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import { AgentTask, ExecutionPlan, TaskPriority } from '../types/agent';

interface PlanReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ExecutionPlan;
  onApprove: (updatedTasks: AgentTask[]) => void;
}

export const PlanReviewModal: React.FC<PlanReviewModalProps> = ({
  isOpen,
  onClose,
  plan,
  onApprove,
}) => {
  const [tasks, setTasks] = useState<AgentTask[]>(plan.tasks || []);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateTask = (id: string, updates: Partial<AgentTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTask = () => {
    const newId = `task-${Date.now().toString(36)}`;
    const newTask: AgentTask = {
      id: newId,
      title: 'New Engineering Task',
      description: 'Describe actionable steps to be implemented by agent.',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      affectedFiles: [],
      acceptanceCriteria: ['Implement requested modifications', 'Pass syntax & validation'],
      result: null,
    };
    setTasks((prev) => [...prev, newTask]);
    setEditingTaskId(newId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Review & Edit Task Decomposition</h3>
              <p className="text-xs text-zinc-400">Modify tasks, adjust priorities, or add constraints before agent execution</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task list body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-xs font-mono text-zinc-400 font-medium">
              {tasks.length} Decomposed Tasks (Strict Dependency Execution Order)
            </span>
            <button
              onClick={handleAddTask}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Task</span>
            </button>
          </div>

          <div className="space-y-3">
            {tasks.map((task, idx) => {
              const isEditing = editingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border transition ${
                    isEditing
                      ? 'bg-zinc-950 border-emerald-500/60 shadow-lg'
                      : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => handleUpdateTask(task.id, { title: e.target.value })}
                          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-medium text-white focus:outline-none focus:border-emerald-500 w-80"
                        />
                      ) : (
                        <h4 className="text-xs font-semibold text-zinc-200">{task.title}</h4>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={task.priority}
                        onChange={(e) =>
                          handleUpdateTask(task.id, { priority: e.target.value as TaskPriority })
                        }
                        className="bg-zinc-900 border border-zinc-800 text-[11px] rounded px-2 py-1 text-zinc-300 font-mono"
                      >
                        <option value="low">LOW</option>
                        <option value="medium">MEDIUM</option>
                        <option value="high">HIGH</option>
                        <option value="critical">CRITICAL</option>
                      </select>

                      <button
                        onClick={() => setEditingTaskId(isEditing ? null : task.id)}
                        className="p-1 rounded text-zinc-400 hover:text-white transition"
                        title={isEditing ? 'Done Editing' : 'Edit Task'}
                      >
                        {isEditing ? <Check className="w-4 h-4 text-emerald-400" /> : <Edit2 className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 transition"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task details */}
                  <div className="mt-2 text-xs text-zinc-400 space-y-2">
                    {isEditing ? (
                      <textarea
                        value={task.description}
                        onChange={(e) => handleUpdateTask(task.id, { description: e.target.value })}
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <p className="leading-relaxed">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-500">
                      {task.dependencies.length > 0 && (
                        <div>
                          <span className="text-zinc-600">Depends on:</span>{' '}
                          <span className="text-amber-400/90">{task.dependencies.join(', ')}</span>
                        </div>
                      )}
                      {task.affectedFiles.length > 0 && (
                        <div>
                          <span className="text-zinc-600">Files:</span>{' '}
                          <span className="text-cyan-400/90">{task.affectedFiles.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Changes will execute on a dedicated agent branch.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onApprove(tasks)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition"
            >
              <span>Approve & Start Execution</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
