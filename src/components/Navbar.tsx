import React, { useState } from 'react';
import {
  GitBranch,
  Bot,
  Sparkles,
  Github,
  HardDrive,
  CheckSquare,
  BookOpen,
  LogOut,
  Layers,
  ShieldCheck,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GitHubConnectedUser, GitHubRepository } from '../types/agent';

interface NavbarProps {
  user: User | null;
  workspaceToken: string | null;
  githubUser: GitHubConnectedUser | null;
  selectedRepo: GitHubRepository | null;
  onOpenGitHubModal: () => void;
  onGoogleSignIn: () => void;
  onLogout: () => void;
  activeModel: string;
  isHighThinking: boolean;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  workspaceToken,
  githubUser,
  selectedRepo,
  onOpenGitHubModal,
  onGoogleSignIn,
  onLogout,
  activeModel,
  isHighThinking,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-3 md:px-4 text-zinc-200 select-none z-30 sticky top-0">
      <div className="h-14 flex items-center justify-between">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-2 md:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-1.5 md:hidden rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 active:bg-zinc-800 transition touch-manipulation"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="flex items-center gap-2 font-mono font-semibold tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-sm md:text-base font-bold">OCTOAGENT</span>
            <span className="text-[9px] md:text-[10px] uppercase font-sans font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 hidden xs:inline">
              AI DEV
            </span>
          </div>

          {/* Desktop Intelligence Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-zinc-400 font-medium">{activeModel}</span>
            {isHighThinking && (
              <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                HIGH THINKING
              </span>
            )}
          </div>
        </div>

        {/* Center Target Repo (Desktop) */}
        {selectedRepo ? (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs max-w-xs truncate">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-zinc-400 font-mono">Target:</span>
            <span className="font-semibold text-zinc-200 truncate">{selectedRepo.name}</span>
            <span className="text-zinc-500 text-[11px] font-mono">({selectedRepo.default_branch})</span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 text-xs text-amber-400/90 bg-amber-950/20 px-3 py-1 rounded-full border border-amber-900/40">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>No repository selected</span>
          </div>
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 md:gap-2.5">
          {/* Workspace status pill (desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
            <span title="Google Drive connected" className={workspaceToken ? 'text-emerald-400' : 'text-zinc-600'}>
              <HardDrive className="w-3.5 h-3.5 inline" />
            </span>
            <span title="Google Tasks connected" className={workspaceToken ? 'text-blue-400' : 'text-zinc-600'}>
              <CheckSquare className="w-3.5 h-3.5 inline" />
            </span>
            <span title="Google Keep support check" className="text-amber-500/70">
              <BookOpen className="w-3.5 h-3.5 inline" />
            </span>
          </div>

          {/* GitHub Connection */}
          {githubUser ? (
            <button
              onClick={onOpenGitHubModal}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs text-zinc-200 transition touch-manipulation"
              title={`Connected as @${githubUser.login}`}
            >
              <img src={githubUser.avatar_url} alt={githubUser.login} className="w-4 h-4 rounded-full" />
              <span className="font-mono hidden sm:inline text-xs">@{githubUser.login}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </button>
          ) : (
            <button
              onClick={onOpenGitHubModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 font-medium transition touch-manipulation"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Connect PAT</span>
              <span className="xs:hidden">PAT</span>
            </button>
          )}

          {/* Google / Firebase Auth */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1.5 md:pl-2 border-l border-zinc-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-zinc-700 flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-1 text-zinc-400 hover:text-red-400 transition"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition touch-manipulation"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span className="hidden xs:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-banner with target repo & model details */}
      <div className="md:hidden pb-2 pt-0.5 flex items-center justify-between text-[11px] font-mono border-t border-zinc-900 text-zinc-400">
        <div className="flex items-center gap-1.5 truncate">
          <GitBranch className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{selectedRepo ? selectedRepo.name : 'No repo selected'}</span>
        </div>
        <div className="flex items-center gap-1 text-cyan-400 flex-shrink-0">
          <Sparkles className="w-3 h-3" />
          <span>{activeModel.replace('gemini-', '')}</span>
          {isHighThinking && <span className="text-[9px] px-1 bg-cyan-950 rounded border border-cyan-800">HIGH</span>}
        </div>
      </div>
    </header>
  );
};
