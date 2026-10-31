import React from 'react';
import {
  Boxes,
  Github,
  HardDrive,
  CheckSquare,
  BookOpen,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { GitHubConnectedUser } from '../../types/agent';
import { User } from 'firebase/auth';

interface IntegrationsViewProps {
  githubUser: GitHubConnectedUser | null;
  user: User | null;
  workspaceToken: string | null;
  onOpenGitHubModal: () => void;
  onGoogleSignIn: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  githubUser,
  user,
  workspaceToken,
  onOpenGitHubModal,
  onGoogleSignIn,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3.5 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          <Boxes className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>Workspace & Platform Integrations</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Manage authorized service connections, credentials, and persistent integrations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4 pb-4">
        {/* GitHub Integration */}
        <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white flex-shrink-0">
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">GitHub Integration</h3>
                  <p className="text-[11px] text-zinc-400">REST API & Git Database API</p>
                </div>
              </div>

              {githubUser ? (
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 flex-shrink-0">
                  Not Connected
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Enables autonomous file inspection, atomic multi-file commit generation, branch management, and Pull Request creation.
            </p>

            {githubUser && (
              <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400 space-y-1 break-all">
                <div>Account: <strong className="text-white">@{githubUser.login}</strong></div>
                <div>Token: <span className="text-emerald-400">{githubUser.maskedToken || '••••••••'}</span> (AES-256-GCM)</div>
                <div>Scopes: <span className="text-zinc-300">{githubUser.scopes || 'repo'}</span></div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>AES-256-GCM Vault</span>
            </div>
            <button
              onClick={onOpenGitHubModal}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 font-medium transition touch-manipulation"
            >
              {githubUser ? 'Configure Token' : 'Connect PAT Token'}
            </button>
          </div>
        </div>

        {/* Firebase & Firestore */}
        <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Firebase & Cloud Firestore</h3>
                  <p className="text-[11px] text-zinc-400">Persistent Database & Auth</p>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Provisioned</span>
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Provides user session isolation, task dependency persistence, execution event logs, and security enforcement through Firestore security rules.
            </p>

            <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400 space-y-1 break-all">
              <div>Project: <strong className="text-white">realashik</strong></div>
              <div>Database: <span className="text-zinc-300">ai-studio-devagentai-...</span></div>
              <div>Auth: <span className="text-emerald-400">{user ? user.email : 'Waiting for Sign-in'}</span></div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex justify-end">
            {!user ? (
              <button
                onClick={onGoogleSignIn}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium transition touch-manipulation"
              >
                Sign in with Google
              </button>
            ) : (
              <span className="text-xs text-zinc-500 font-mono">User Session Active</span>
            )}
          </div>
        </div>

        {/* Google Tasks */}
        <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Google Tasks Integration</h3>
                  <p className="text-[11px] text-zinc-400">Actionable Engineering Tasklists</p>
                </div>
              </div>

              {workspaceToken ? (
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorized</span>
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 flex-shrink-0">
                  Requires OAuth
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Synchronizes agent-generated tasks, acceptance criteria, and completion states directly into your personal Google Tasks account.
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-zinc-500 truncate">Scope: .../auth/tasks</span>
            {!workspaceToken && (
              <button
                onClick={onGoogleSignIn}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium transition touch-manipulation"
              >
                Authorize
              </button>
            )}
          </div>
        </div>

        {/* Google Drive */}
        <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Google Drive Integration</h3>
                  <p className="text-[11px] text-zinc-400">Artifacts & Report Storage</p>
                </div>
              </div>

              {workspaceToken ? (
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorized</span>
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 flex-shrink-0">
                  Requires OAuth
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Durable document repository storing execution plans, architectural decisions, and final reports under logical folder hierarchies.
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-zinc-500 truncate">OctoAgent Workspace</span>
            {!workspaceToken && (
              <button
                onClick={onGoogleSignIn}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium transition touch-manipulation"
              >
                Authorize
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
