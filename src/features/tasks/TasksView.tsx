import React, { useState } from 'react';
import {
  CheckSquare,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { AgentTask, GitHubRepository } from '../../types/agent';

interface TasksViewProps {
  tasks: AgentTask[];
  selectedRepo: GitHubRepository | null;
  workspaceToken: string | null;
  onSyncGoogleTasks: () => void;
  isSyncing: boolean;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  selectedRepo,
  workspaceToken,
  onSyncGoogleTasks,
  isSyncing,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'failed'>('all');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-400" />
            <span>Autonomous Tasks & Google Tasks Sync</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Decomposed tasks generated from approved architectural execution plans
          </p>
        </div>

        <div className="flex items-center gap-2">
          {workspaceToken ? (
            <button
              onClick={onSyncGoogleTasks}
              disabled={isSyncing || tasks.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white shadow transition"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Syncing...' : 'Sync to Google Tasks'}</span>
            </button>
          ) : (
            <div className="text-[11px] text-zinc-500 font-mono">
              Sign in with Google to sync with your actual Google Tasks account
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-xs w-fit">
        {(['all', 'pending', 'in_progress', 'completed', 'failed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-md uppercase font-mono text-[11px] transition ${
              filter === tab ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task, idx) => (
            <div
              key={task.id}
              className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 hover:border-zinc-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded">
                      #{idx + 1}
                    </span>
                    <h3 className="text-xs font-bold text-white">{task.title}</h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.2 rounded font-semibold uppercase ${
                        task.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : task.status === 'in_progress'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                          : task.status === 'failed'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{task.description}</p>
                </div>

                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold">
                  {task.priority}
                </span>
              </div>

              {/* Acceptance Criteria & Dependencies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-zinc-800/80">
                <div>
                  <span className="text-zinc-500">Acceptance Criteria:</span>
                  <ul className="list-disc list-inside text-zinc-400 space-y-0.5 mt-0.5">
                    {task.acceptanceCriteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <div>
                    <span className="text-zinc-500">Target Files:</span>{' '}
                    <span className="text-cyan-400/90">{task.affectedFiles.join(', ') || 'N/A'}</span>
                  </div>
                  {task.dependencies.length > 0 && (
                    <div>
                      <span className="text-zinc-500">Prerequisites:</span>{' '}
                      <span className="text-amber-400/90">{task.dependencies.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {task.result && (
                <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-emerald-400">
                  {task.result}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 text-xs">
          No tasks match the selected filter. Submit a development instruction in the Agent Workspace to generate tasks.
        </div>
      )}
    </div>
  );
};
