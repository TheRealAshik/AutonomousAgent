import React, { useState } from 'react';
import {
  FolderGit2,
  Search,
  GitBranch,
  Star,
  GitFork,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Lock,
  Globe,
  Loader2,
} from 'lucide-react';
import { GitHubConnectedUser, GitHubRepository } from '../../types/agent';

interface ProjectsViewProps {
  repositories: GitHubRepository[];
  selectedRepo: GitHubRepository | null;
  onSelectRepo: (repo: GitHubRepository) => void;
  rawGitHubToken: string;
  onOpenGitHubModal: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  repositories,
  selectedRepo,
  onSelectRepo,
  rawGitHubToken,
  onOpenGitHubModal,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  const filtered = repositories.filter((r) => {
    const matchSearch = r.full_name.toLowerCase().includes(search.toLowerCase());
    if (filter === 'public') return matchSearch && !r.private;
    if (filter === 'private') return matchSearch && r.private;
    return matchSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-emerald-400" />
            <span>Accessible GitHub Repositories</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Repositories accessible with your connected Personal Access Token
          </p>
        </div>

        <button
          onClick={onOpenGitHubModal}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-zinc-700 transition"
        >
          Manage PAT Token
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories by name or organization..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md transition ${filter === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            All ({repositories.length})
          </button>
          <button
            onClick={() => setFilter('public')}
            className={`px-3 py-1 rounded-md transition ${filter === 'public' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Public
          </button>
          <button
            onClick={() => setFilter('private')}
            className={`px-3 py-1 rounded-md transition ${filter === 'private' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Private
          </button>
        </div>
      </div>

      {/* Repository Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((repo) => {
            const isSelected = selectedRepo?.id === repo.id;

            return (
              <div
                key={repo.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-zinc-900 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40'
                    : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {repo.private ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      )}
                      <h3 className="text-xs font-bold text-white font-mono truncate" title={repo.full_name}>
                        {repo.name}
                      </h3>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold flex-shrink-0">
                        ACTIVE TARGET
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {repo.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <GitBranch className="w-3 h-3 text-emerald-400" />
                      <span>{repo.default_branch}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{repo.stargazers_count}</span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <GitFork className="w-3 h-3 text-zinc-400" />
                        <span>{repo.forks_count}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition"
                    >
                      <span>View on GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => onSelectRepo(repo)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-zinc-800 text-emerald-400 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select Target'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 text-xs space-y-3">
          <FolderGit2 className="w-8 h-8 text-zinc-600 mx-auto" />
          <p>No repositories found. Connect your GitHub token to explore accessible repos.</p>
          <button
            onClick={onOpenGitHubModal}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
          >
            Connect GitHub Token
          </button>
        </div>
      )}
    </div>
  );
};
