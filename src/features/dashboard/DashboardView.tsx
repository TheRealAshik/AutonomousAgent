import React from 'react';
import {
  GitBranch,
  Bot,
  Sparkles,
  Github,
  HardDrive,
  CheckSquare,
  BookOpen,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GitHubConnectedUser, GitHubRepository, AgentSessionRecord } from '../../types/agent';

interface DashboardViewProps {
  user: User | null;
  githubUser: GitHubConnectedUser | null;
  selectedRepo: GitHubRepository | null;
  workspaceToken: string | null;
  sessions: AgentSessionRecord[];
  onSelectTab: (tab: any) => void;
  onOpenGitHubModal: () => void;
  onSelectRepo: (repo: GitHubRepository) => void;
  onQuickStartPrompt: (prompt: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  githubUser,
  selectedRepo,
  workspaceToken,
  sessions,
  onSelectTab,
  onOpenGitHubModal,
  onQuickStartPrompt,
}) => {
  const samplePrompts = [
    { title: 'Refactor Authentication', prompt: 'Audit repository authentication flow, add robust session validation, and fix potential token leaks.' },
    { title: 'Implement Health & Telemetry', prompt: 'Create a dedicated /health endpoint and structured logging module for production observability.' },
    { title: 'Add GitHub Actions CI', prompt: 'Inspect package.json and create a GitHub Actions CI workflow for automated linting, type-checking, and unit tests.' },
    { title: 'Fix Architectural Debt', prompt: 'Identify circular dependencies or outdated helper patterns and modernize module exports.' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-500/10 via-cyan-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
              Autonomous Software Engineering
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by Gemini 4 Argon
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Welcome back, {user?.displayName || (githubUser ? `@${githubUser.login}` : 'Engineer')}
          </h2>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Delegate software development instructions directly to your AI agent. OctoAgent analyzes repository
            architecture, breaks down tasks into actionable dependencies, executes atomic multi-file commits on
            dedicated branches, validates tests, and integrates with Google Workspace.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onSelectTab('agent')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow"
            >
              <Bot className="w-4 h-4" />
              <span>Launch Agent Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {!githubUser && (
              <button
                onClick={onOpenGitHubModal}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 transition"
              >
                <Github className="w-4 h-4" />
                <span>Connect GitHub Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics & Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* GitHub Status */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">GitHub Repository</span>
            <Github className="w-4 h-4 text-zinc-400" />
          </div>
          {selectedRepo ? (
            <div>
              <div className="text-sm font-bold text-white truncate">{selectedRepo.name}</div>
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 mt-0.5">
                <GitBranch className="w-3 h-3 text-emerald-400" />
                <span>{selectedRepo.default_branch}</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-amber-400/90 font-medium">No repo selected</div>
              <button
                onClick={() => onSelectTab('projects')}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 underline mt-1"
              >
                Browse accessible repos
              </button>
            </div>
          )}
        </div>

        {/* Intelligence Engine */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">AI Model Engine</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">gemini-4-argon</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>High Thinking Mode Active</span>
          </div>
        </div>

        {/* Google Workspace */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Workspace Integration</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${workspaceToken ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {workspaceToken ? 'Connected' : 'Sign-in Required'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center gap-2">
            <span>Drive: {workspaceToken ? 'Active' : 'Idle'}</span>
            <span>•</span>
            <span>Tasks: {workspaceToken ? 'Synced' : 'Idle'}</span>
          </div>
        </div>

        {/* Database & Security */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Security Vault</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">Cloud Firestore</div>
          <div className="text-[11px] text-zinc-400">
            Strict ABAC & AES-256-GCM
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Recommended Development Tasks
          </h3>
          <span className="text-[11px] text-zinc-500">Click to load into Agent Workspace</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {samplePrompts.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                onQuickStartPrompt(item.prompt);
                onSelectTab('agent');
              }}
              className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-left transition group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{item.title}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                {item.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Executions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Recent Agent Executions
          </h3>
          <button
            onClick={() => onSelectTab('history')}
            className="text-[11px] text-emerald-400 hover:underline"
          >
            View all history
          </button>
        </div>

        {sessions.length > 0 ? (
          <div className="border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/80 bg-zinc-950">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-zinc-300">{session.repoFullName}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="font-mono text-zinc-500">{session.agentBranch}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-semibold uppercase ${
                      session.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : session.status === 'executing'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-1">{session.prompt}</p>
                </div>

                <div className="flex items-center gap-3">
                  {session.pullRequestUrl && (
                    <a
                      href={session.pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:underline font-mono"
                    >
                      <span>PR #{session.pullRequestNumber}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => onSelectTab('agent')}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-zinc-900/30 border border-zinc-800/60 text-zinc-500 text-xs">
            No agent sessions yet. Select a repository and submit your first development request!
          </div>
        )}
      </div>
    </div>
  );
};
