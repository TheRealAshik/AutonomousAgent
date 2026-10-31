import React from 'react';
import {
  History,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { AgentSessionRecord } from '../../types/agent';

interface HistoryViewProps {
  sessions: AgentSessionRecord[];
  onSelectSession?: (session: AgentSessionRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ sessions }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <span>Execution History & Audit Trail</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Complete log of previous autonomous development sessions, atomic commits, and Pull Requests
        </p>
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 hover:border-zinc-700 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">{session.repoFullName}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="font-mono text-zinc-400 text-xs flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-emerald-400" />
                      <span>{session.agentBranch}</span>
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800">
                      {session.modelUsed}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.2 rounded font-semibold uppercase ${
                        session.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : session.status === 'executing'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{session.prompt}</p>
                </div>

                <div className="text-[11px] font-mono text-zinc-500 flex-shrink-0">
                  {new Date(session.createdAt).toLocaleString()}
                </div>
              </div>

              {session.plan && (
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-1">
                  <span className="text-zinc-400 font-mono text-[11px] font-semibold">Objective:</span>
                  <p className="text-zinc-200">{session.plan.objective}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                <div className="flex items-center gap-4 text-zinc-400 font-mono text-[11px]">
                  <span>Tasks: {session.plan?.tasks?.length || 0}</span>
                  {session.commitSha && <span>Commit: {session.commitSha.slice(0, 7)}</span>}
                </div>

                <div className="flex items-center gap-3">
                  {session.pullRequestUrl && (
                    <a
                      href={session.pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:underline font-mono text-xs font-semibold"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>PR #{session.pullRequestNumber}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 text-xs space-y-2">
          <History className="w-8 h-8 text-zinc-600 mx-auto" />
          <p>No past executions recorded yet.</p>
        </div>
      )}
    </div>
  );
};
