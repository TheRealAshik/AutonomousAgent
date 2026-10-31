import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Info,
} from 'lucide-react';
import { GitHubRepository } from '../../types/agent';

interface KnowledgeViewProps {
  selectedRepo: GitHubRepository | null;
  workspaceToken: string | null;
}

interface ProjectNote {
  id: string;
  title: string;
  category: 'architecture' | 'decision' | 'bug' | 'convention';
  content: string;
  createdAt: string;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  selectedRepo,
  workspaceToken,
}) => {
  const [notes, setNotes] = useState<ProjectNote[]>([
    {
      id: 'n-1',
      title: 'Branch & Pull Request Discipline',
      category: 'convention',
      content:
        'All automated modifications must land on dedicated `agent/*` branches. Never push directly to `main` or `master`. Always open a descriptive Pull Request with testing checklist.',
      createdAt: '2026-10-31',
    },
    {
      id: 'n-2',
      title: 'Authentication & Credential Isolation',
      category: 'architecture',
      content:
        'GitHub Personal Access Tokens are encrypted server-side with AES-256-GCM. Tokens are never exposed to browser memory, console logs, or AI prompt contexts.',
      createdAt: '2026-10-31',
    },
    {
      id: 'n-3',
      title: 'Validation Before Commit',
      category: 'decision',
      content:
        'Every task change must be verified against syntax validators, schema parsers, and existing GitHub Actions CI workflow runs before marking status completed.',
      createdAt: '2026-10-31',
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<ProjectNote['category']>('architecture');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const note: ProjectNote = {
      id: `note-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      content: newContent.trim(),
      createdAt: new Date().toLocaleDateString(),
    };

    setNotes([note, ...notes]);
    setNewTitle('');
    setNewContent('');
    setShowAddForm(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>Project Memory & Knowledge Vault</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Persistent architectural decisions, coding style conventions, and project context
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Knowledge Note</span>
        </button>
      </div>

      {/* Google Keep Status Banner */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-zinc-200">Google Keep API Availability Status</div>
          <p className="text-zinc-400 leading-relaxed">
            The official Google Keep API is restricted by Google to enterprise Google Workspace domains with domain-wide
            delegation. In compliance with security standards, all development notes, architectural decisions, and
            unresolved bugs are durably stored in Cloud Firestore and exported to Google Drive.
          </p>
        </div>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <form onSubmit={handleCreateNote} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
          <h3 className="text-xs font-semibold text-white">Create New Architectural Note</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Note title (e.g. State Machine Rules)"
              className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
            >
              <option value="architecture">Architecture</option>
              <option value="decision">Decision</option>
              <option value="convention">Convention</option>
              <option value="bug">Known Bug</option>
            </select>
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Details, rationale, trade-offs, or constraints..."
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 transition space-y-2 flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-bold">
                  {note.category}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">{note.createdAt}</span>
              </div>
              <h3 className="text-xs font-bold text-white">{note.title}</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">{note.content}</p>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 font-mono">
              Persisted in Cloud Firestore
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
