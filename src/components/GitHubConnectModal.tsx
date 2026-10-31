import React, { useState } from 'react';
import {
  Github,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { GitHubConnectedUser, GitHubRepository } from '../types/agent';

interface GitHubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GitHubConnectedUser | null;
  onConnectSuccess: (user: GitHubConnectedUser, repos: GitHubRepository[], rawToken: string) => void;
  onDisconnect: () => void;
}

export const GitHubConnectModal: React.FC<GitHubConnectModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onConnectSuccess,
  onDisconnect,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleValidateAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please provide a valid GitHub Personal Access Token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/github/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate GitHub token.');
      }

      onConnectSuccess(
        {
          login: data.user.login,
          name: data.user.name,
          avatar_url: data.user.avatar_url,
          email: data.user.email,
          html_url: data.user.html_url,
          scopes: data.scopes,
          maskedToken: data.maskedToken,
          encryptedToken: data.encryptedToken,
        },
        data.repositories,
        tokenInput.trim()
      );
      setTokenInput('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">GitHub Access Token</h3>
              <p className="text-xs text-zinc-400">Authenticate repository operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {currentUser ? (
            <div className="p-4 rounded-lg bg-zinc-950 border border-emerald-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.login}
                    className="w-10 h-10 rounded-full border border-zinc-700"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-white">@{currentUser.login}</h4>
                    <p className="text-xs text-zinc-400">{currentUser.name || 'GitHub User'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected</span>
                </div>
              </div>

              <div className="text-xs font-mono text-zinc-400 pt-2 border-t border-zinc-800/80 space-y-1">
                <div>
                  <span className="text-zinc-500">Token:</span> {currentUser.maskedToken || '••••••••'} (AES-256-GCM Encrypted)
                </div>
                {currentUser.scopes && (
                  <div>
                    <span className="text-zinc-500">Scopes:</span> {currentUser.scopes}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-xs text-red-300 font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect Token</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleValidateAndConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Personal Access Token (classic or fine-grained)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_... or github_pat_..."
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Recommended scopes guide */}
              <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recommended Token Permissions</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-400">
                  <li><strong className="text-zinc-300">Contents:</strong> Read & Write (branch & commits)</li>
                  <li><strong className="text-zinc-300">Pull requests:</strong> Read & Write (open PRs)</li>
                  <li><strong className="text-zinc-300">Metadata:</strong> Read-only</li>
                  <li><strong className="text-zinc-300">Actions:</strong> Read-only (inspect CI checks)</li>
                </ul>
                <div className="pt-1">
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                  >
                    <span>Generate token on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !tokenInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white transition shadow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating Token...</span>
                    </>
                  ) : (
                    <span>Validate & Connect</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
