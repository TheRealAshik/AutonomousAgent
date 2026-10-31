import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  GitBranch,
  FolderTree,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  GitPullRequest,
  HardDrive,
  CheckSquare,
  BookOpen,
  ChevronRight,
  Loader2,
  Terminal,
  ShieldAlert,
  ArrowRight,
  Layers,
  FileDiff,
  ListTodo,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AgentSessionRecord,
  AgentTask,
  ExecutionEvent,
  ExecutionPlan,
  GitHubConnectedUser,
  GitHubRepository,
} from '../../types/agent';
import {
  calculateExecutionProgress,
  getExecutableTasks,
  isExecutionFinished,
} from '../../utils/taskGraph';

interface AgentWorkspaceViewProps {
  githubUser: GitHubConnectedUser | null;
  rawGitHubToken: string;
  selectedRepo: GitHubRepository | null;
  onSelectRepo: (repo: GitHubRepository) => void;
  repositories: GitHubRepository[];
  workspaceToken: string | null;
  activeModel: string;
  setActiveModel: (m: string) => void;
  isHighThinking: boolean;
  setIsHighThinking: (ht: boolean) => void;
  onOpenGitHubModal: () => void;
  onOpenPlanReview: (plan: ExecutionPlan) => void;
  currentPlan: ExecutionPlan | null;
  setCurrentPlan: (p: ExecutionPlan | null) => void;
  approvedTasks: AgentTask[];
  setApprovedTasks: React.Dispatch<React.SetStateAction<AgentTask[]>>;
  initialPrompt?: string;
  onSaveSessionToFirestore?: (session: Partial<AgentSessionRecord>) => void;
}

export const AgentWorkspaceView: React.FC<AgentWorkspaceViewProps> = ({
  githubUser,
  rawGitHubToken,
  selectedRepo,
  onSelectRepo,
  repositories,
  workspaceToken,
  activeModel,
  setActiveModel,
  isHighThinking,
  setIsHighThinking,
  onOpenGitHubModal,
  onOpenPlanReview,
  currentPlan,
  setCurrentPlan,
  approvedTasks,
  setApprovedTasks,
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [agentBranch, setAgentBranch] = useState<string>('');
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [prCreated, setPrCreated] = useState<{ number: number; html_url: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'tasks' | 'events'>('plan');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mobile active section ('workspace' | 'tasks' | 'repo')
  const [mobileSection, setMobileSection] = useState<'workspace' | 'tasks' | 'repo'>('workspace');

  // File explorer states
  const [repoFiles, setRepoFiles] = useState<{ path: string; type: string }[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Workspace export statuses
  const [tasksSyncSuccess, setTasksSyncSuccess] = useState<string | null>(null);
  const [driveExportUrl, setDriveExportUrl] = useState<string | null>(null);
  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Load root files when repository changes
  useEffect(() => {
    if (!selectedRepo || !rawGitHubToken) return;
    setLoadingFiles(true);
    fetch(`/api/github/tree?owner=${selectedRepo.owner.login}&repo=${selectedRepo.name}`, {
      headers: { 'x-github-token': rawGitHubToken },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setRepoFiles(data.files);
        }
      })
      .catch((err) => console.error('Failed to load repo files:', err))
      .finally(() => setLoadingFiles(false));
  }, [selectedRepo, rawGitHubToken]);

  const addEvent = (
    type: ExecutionEvent['type'],
    stage: string,
    message: string,
    details?: string
  ) => {
    const newEvent: ExecutionEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      stage,
      message,
      details,
    };
    setEvents((prev) => [newEvent, ...prev]);
  };

  // Stage 1-4: Request analysis & planning
  const handleAnalyzeAndPlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    if (!selectedRepo) {
      setErrorMessage('Please select a target GitHub repository first.');
      return;
    }
    if (!rawGitHubToken) {
      onOpenGitHubModal();
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setCurrentPlan(null);
    setApprovedTasks([]);
    setPrCreated(null);
    setTasksSyncSuccess(null);
    setDriveExportUrl(null);

    addEvent('info', 'request', `Development instruction received: "${prompt.slice(0, 80)}..."`);
    addEvent('info', 'context', `Collecting repository context for ${selectedRepo.full_name}...`);

    try {
      const response = await fetch('/api/agent/analyze-and-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': rawGitHubToken,
        },
        body: JSON.stringify({
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          prompt: prompt.trim(),
          model: activeModel,
          enableHighThinking: isHighThinking,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate execution plan.');
      }

      addEvent('success', 'planning', 'Synthesized architectural plan & task decomposition.');
      addEvent('info', 'approval', 'Waiting for user plan review & approval.');
      setCurrentPlan(data.plan);
      setApprovedTasks(data.plan.tasks);
      setActiveTab('plan');
      setMobileSection('workspace');
    } catch (err: any) {
      setErrorMessage(err.message);
      addEvent('error', 'planning', `Plan generation failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Stage 6: Execution Engine
  const handleStartExecution = async () => {
    if (!currentPlan || approvedTasks.length === 0 || !selectedRepo) return;

    setIsExecuting(true);
    setErrorMessage(null);
    setActiveTab('tasks');
    setMobileSection('tasks');

    const branchSlug = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 24)
      .replace(/-+$/, '');
    const newBranch = `agent/${branchSlug || 'feat'}-${Date.now().toString(36)}`;

    addEvent('stage_change', 'branching', `Creating dedicated agent branch: ${newBranch}`);

    try {
      const branchRes = await fetch('/api/agent/create-branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': rawGitHubToken,
        },
        body: JSON.stringify({
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          branchName: newBranch,
          fromBranch: selectedRepo.default_branch,
        }),
      });

      const branchData = await branchRes.json();
      if (!branchRes.ok) {
        throw new Error(branchData.error || 'Failed to create agent branch on GitHub.');
      }

      setAgentBranch(newBranch);
      addEvent('success', 'branching', `Branch ready: refs/heads/${newBranch}`);

      let currentTaskList = [...approvedTasks];

      while (!isExecutionFinished(currentTaskList)) {
        const executable = getExecutableTasks(currentTaskList);
        if (executable.length === 0) {
          addEvent('error', 'execution', 'Execution stopped: remaining tasks are blocked.');
          break;
        }

        const taskToRun = executable[0];
        setCurrentTaskId(taskToRun.id);

        currentTaskList = currentTaskList.map((t) =>
          t.id === taskToRun.id ? { ...t, status: 'in_progress' } : t
        );
        setApprovedTasks([...currentTaskList]);

        addEvent('task_update', 'task', `Starting task: ${taskToRun.title}`, taskToRun.description);

        try {
          const taskRes = await fetch('/api/agent/execute-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-github-token': rawGitHubToken,
            },
            body: JSON.stringify({
              owner: selectedRepo.owner.login,
              repo: selectedRepo.name,
              agentBranch: newBranch,
              task: taskToRun,
              objective: currentPlan.objective,
              implementationStrategy: currentPlan.implementationStrategy,
              model: activeModel,
            }),
          });

          const taskData = await taskRes.json();
          if (!taskRes.ok) {
            throw new Error(taskData.error || 'Task execution failed.');
          }

          if (taskData.events) {
            taskData.events.forEach((ev: any) => {
              addEvent(ev.type || 'info', ev.stage, ev.message, ev.details);
            });
          }

          currentTaskList = currentTaskList.map((t) =>
            t.id === taskToRun.id
              ? {
                  ...t,
                  status: 'completed',
                  result: taskData.result?.resultMessage || 'Executed successfully',
                }
              : t
          );
          setApprovedTasks([...currentTaskList]);
        } catch (taskErr: any) {
          addEvent('error', 'task_failed', `Task "${taskToRun.title}" failed: ${taskErr.message}`);

          currentTaskList = currentTaskList.map((t) =>
            t.id === taskToRun.id
              ? { ...t, status: 'failed', result: `Error: ${taskErr.message}` }
              : t
          );
          setApprovedTasks([...currentTaskList]);
        }
      }

      addEvent('success', 'validation', 'Task execution cycle completed. Ready for Pull Request.');
    } catch (err: any) {
      setErrorMessage(err.message);
      addEvent('error', 'execution', `Execution error: ${err.message}`);
    } finally {
      setIsExecuting(false);
      setCurrentTaskId(null);
    }
  };

  // Stage 8: Create real Pull Request
  const handleCreatePullRequest = async () => {
    if (!selectedRepo || !agentBranch || !currentPlan) return;

    try {
      addEvent('stage_change', 'pr', `Preparing Pull Request from ${agentBranch} to ${selectedRepo.default_branch}...`);

      const prBody = `## 🤖 OctoAgent AI Autonomous Development Report

### 🎯 Objective
${currentPlan.objective}

### 🔍 Problem Analysis
${currentPlan.problemAnalysis}

### 💡 Proposed Solution
${currentPlan.proposedSolution}

### 🛠️ Tasks Executed
${approvedTasks
  .map(
    (t) =>
      `- [x] **${t.title}** (${t.priority.toUpperCase()} priority)\n  - ${t.description}\n  - *Result*: ${t.result || 'Applied to branch'}`
  )
  .join('\n')}

### 🛡️ Testing & Validation Strategy
${currentPlan.testingStrategy}

---
*Created by [OctoAgent AI](https://github.com) development agent using ${activeModel}.*`;

      const res = await fetch('/api/agent/create-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': rawGitHubToken,
        },
        body: JSON.stringify({
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          title: `[OctoAgent] ${currentPlan.objective.slice(0, 70)}`,
          body: prBody,
          head: agentBranch,
          base: selectedRepo.default_branch,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to open Pull Request on GitHub.');
      }

      setPrCreated(data.pullRequest);
      addEvent('success', 'pr', `Pull Request #${data.pullRequest.number} opened successfully!`, data.pullRequest.html_url);
    } catch (err: any) {
      setErrorMessage(err.message);
      addEvent('error', 'pr', `Failed to open PR: ${err.message}`);
    }
  };

  // Google Tasks sync
  const handleSyncToGoogleTasks = async () => {
    if (!workspaceToken || !selectedRepo || approvedTasks.length === 0) return;
    setIsSyncingTasks(true);
    try {
      const res = await fetch('/api/workspace/sync-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workspaceToken}`,
        },
        body: JSON.stringify({
          repoFullName: selectedRepo.full_name,
          sessionId: Date.now().toString(),
          tasks: approvedTasks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync Google Tasks.');

      setTasksSyncSuccess(`Synced ${data.tasks.length} tasks to list "${data.taskListTitle}"`);
      addEvent('success', 'workspace', `Synchronized tasks with Google Tasks: ${data.taskListTitle}`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSyncingTasks(false);
    }
  };

  // Google Drive export
  const handleExportToGoogleDrive = async () => {
    if (!workspaceToken || !selectedRepo || !currentPlan) return;
    setIsExportingDrive(true);
    try {
      const markdownContent = `# Development Plan & Execution Report: ${currentPlan.objective}
**Repository:** ${selectedRepo.full_name}
**Agent Model:** ${activeModel}
**Date:** ${new Date().toLocaleString()}

## Problem Analysis
${currentPlan.problemAnalysis}

## Solution Architecture
${currentPlan.proposedSolution}

## Task Decomposition
${approvedTasks.map((t, idx) => `### Task ${idx + 1}: ${t.title}
- **Status:** ${t.status}
- **Priority:** ${t.priority}
- **Description:** ${t.description}
- **Acceptance Criteria:** ${t.acceptanceCriteria.join('; ')}
- **Result:** ${t.result || 'Pending'}
`).join('\n')}

## Testing & Risk Mitigation
${currentPlan.testingStrategy}
`;

      const res = await fetch('/api/workspace/export-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workspaceToken}`,
        },
        body: JSON.stringify({
          repoFullName: selectedRepo.full_name,
          title: `OctoAgent_${currentPlan.objective.slice(0, 30).replace(/[^a-zA-Z0-9]+/g, '_')}`,
          markdownContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to export to Google Drive.');

      setDriveExportUrl(data.webViewLink);
      addEvent('success', 'workspace', `Exported plan to Google Drive: ${data.fileName}`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsExportingDrive(false);
    }
  };

  const progress = calculateExecutionProgress(approvedTasks);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* MOBILE SEGMENTED CONTROL BAR */}
      <div className="lg:hidden border-b border-zinc-800 bg-zinc-950 p-1.5 flex items-center justify-around flex-shrink-0 z-10">
        <button
          onClick={() => setMobileSection('workspace')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium text-center transition ${
            mobileSection === 'workspace'
              ? 'bg-zinc-800 text-white font-bold shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Prompt & Plan
        </button>
        <button
          onClick={() => setMobileSection('tasks')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium text-center transition flex items-center justify-center gap-1 ${
            mobileSection === 'tasks'
              ? 'bg-zinc-800 text-white font-bold shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Tasks</span>
          {approvedTasks.length > 0 && (
            <span className="text-[10px] px-1 bg-emerald-950 text-emerald-400 rounded-full font-mono">
              {progress.completed}/{progress.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setMobileSection('repo')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium text-center transition ${
            mobileSection === 'repo'
              ? 'bg-zinc-800 text-white font-bold shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Repo Info
        </button>
      </div>

      {/* LEFT PANEL: Repo context & Explorer */}
      <div
        className={`${
          mobileSection === 'repo' ? 'flex' : 'hidden'
        } lg:flex w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950 flex-col justify-between overflow-y-auto flex-shrink-0`}
      >
        <div className="p-3 md:p-4 space-y-4">
          {/* Target Repo Picker */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">
              Active Repository
            </label>
            {repositories.length > 0 ? (
              <select
                value={selectedRepo?.full_name || ''}
                onChange={(e) => {
                  const found = repositories.find((r) => r.full_name === e.target.value);
                  if (found) onSelectRepo(found);
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                {repositories.map((r) => (
                  <option key={r.id} value={r.full_name}>
                    {r.full_name} ({r.default_branch})
                  </option>
                ))}
              </select>
            ) : (
              <button
                onClick={onOpenGitHubModal}
                className="w-full py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-emerald-400 hover:bg-zinc-850 transition text-left"
              >
                + Connect GitHub to pick repo
              </button>
            )}
          </div>

          {/* Repo Info Card */}
          {selectedRepo && (
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">{selectedRepo.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {selectedRepo.private ? 'Private' : 'Public'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2">
                {selectedRepo.description || 'No description provided.'}
              </p>
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/60">
                <span>⭐ {selectedRepo.stargazers_count}</span>
                <span>🔀 {selectedRepo.forks_count}</span>
                <span>❗ {selectedRepo.open_issues_count} issues</span>
              </div>
            </div>
          )}

          {/* Dedicated Agent Branch Info */}
          {agentBranch && (
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-xs space-y-1">
              <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                <span>Dedicated Agent Branch</span>
              </div>
              <div className="font-mono text-zinc-200 text-[11px] truncate">{agentBranch}</div>
              <div className="text-[10px] text-zinc-500">Never modifies default branch directly</div>
            </div>
          )}

          {/* Root File Tree */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase text-zinc-500 font-semibold">
              <span className="flex items-center gap-1">
                <FolderTree className="w-3.5 h-3.5 text-zinc-400" />
                <span>Repository Tree</span>
              </span>
              {loadingFiles && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
              {repoFiles.length > 0 ? (
                repoFiles.slice(0, 20).map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 truncate py-0.5"
                  >
                    <FileCode className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                    <span className="truncate">{f.path}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 italic py-2">Connect token to inspect files</div>
              )}
            </div>
          </div>
        </div>

        {/* Intelligence Settings Quick Switch */}
        <div className="p-3 md:p-4 border-t border-zinc-800 bg-zinc-950/70 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">Model Engine:</span>
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white font-mono"
            >
              <option value="gemini-4-argon">gemini-4-argon</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash</option>
            </select>
          </div>

          <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer pt-1">
            <span className="text-[11px] font-mono text-zinc-400">High Thinking:</span>
            <input
              type="checkbox"
              checked={isHighThinking}
              onChange={(e) => setIsHighThinking(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
            />
          </label>
        </div>
      </div>

      {/* CENTER PANEL: Prompt Composer & Plan Presentation */}
      <div
        className={`${
          mobileSection === 'workspace' ? 'flex' : 'hidden'
        } lg:flex flex-1 flex-col justify-between overflow-y-auto bg-zinc-900/40`}
      >
        <div className="p-3 md:p-6 space-y-4 md:space-y-6">
          {/* Natural Language Prompt Composer */}
          <div className="p-3 md:p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-white">Development Instruction</span>
              </div>
              <span className="text-[10px] md:text-[11px] font-mono text-zinc-500 hidden sm:inline">
                Inspects repository & plans before modifying code
              </span>
            </div>

            <form onSubmit={handleAnalyzeAndPlan} className="space-y-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Implement robust OAuth token refresh logic with exponential backoff and add unit tests in src/auth..."
                rows={3}
                disabled={isAnalyzing || isExecuting}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 md:p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-sans transition resize-none leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Repository-grounded reasoning</span>
                </div>

                <button
                  type="submit"
                  disabled={isAnalyzing || isExecuting || !prompt.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white transition shadow touch-manipulation"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing & Planning...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze & Generate Plan</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Navigation Tabs (Plan | Tasks | Timeline) */}
          {currentPlan && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                      activeTab === 'plan'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Architectural Plan
                  </button>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'tasks'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Tasks</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-700 text-zinc-300 font-mono">
                      {approvedTasks.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('events')}
                    className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'events'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Events</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-700 text-zinc-300 font-mono">
                      {events.length}
                    </span>
                  </button>
                </div>

                {/* Plan Approval Bar */}
                <div className="flex items-center gap-2 pt-1 sm:pt-0">
                  <button
                    onClick={() => onOpenPlanReview(currentPlan)}
                    disabled={isExecuting}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 font-medium transition touch-manipulation"
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>Edit Tasks</span>
                  </button>

                  <button
                    onClick={handleStartExecution}
                    disabled={isExecuting || approvedTasks.length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white shadow transition touch-manipulation"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Executing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Approve & Execute</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TAB 1: Plan Details */}
              {activeTab === 'plan' && (
                <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-white">{currentPlan.objective}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                      <span className="font-mono text-[11px] text-emerald-400 uppercase font-semibold">
                        Problem Analysis
                      </span>
                      <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {currentPlan.problemAnalysis}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                      <span className="font-mono text-[11px] text-cyan-400 uppercase font-semibold">
                        Proposed Solution Architecture
                      </span>
                      <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {currentPlan.proposedSolution}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 space-y-1">
                      <span className="font-mono text-[11px] text-zinc-400 uppercase font-semibold">
                        Affected Modules
                      </span>
                      <ul className="list-disc list-inside text-zinc-300 font-mono text-[11px] space-y-0.5">
                        {currentPlan.affectedFiles.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 space-y-1">
                      <span className="font-mono text-[11px] text-amber-400 uppercase font-semibold">
                        Potential Risks
                      </span>
                      <p className="text-zinc-300 leading-relaxed text-[11px]">
                        {currentPlan.potentialRisks}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 space-y-1">
                      <span className="font-mono text-[11px] text-blue-400 uppercase font-semibold">
                        Testing & CI Strategy
                      </span>
                      <p className="text-zinc-300 leading-relaxed text-[11px]">
                        {currentPlan.testingStrategy}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Tasks Decomposition List */}
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  {approvedTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className={`p-3.5 md:p-4 rounded-xl border transition ${
                        task.id === currentTaskId
                          ? 'bg-zinc-950 border-emerald-500 shadow-lg ring-1 ring-emerald-500/30'
                          : task.status === 'completed'
                          ? 'bg-zinc-950/80 border-emerald-900/50'
                          : task.status === 'failed'
                          ? 'bg-zinc-950/80 border-red-900/50'
                          : 'bg-zinc-950/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 md:gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                              #{idx + 1}
                            </span>
                            <h4 className="text-xs font-bold text-white">{task.title}</h4>
                            <span
                              className={`text-[9px] md:text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
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

                        <span className="text-[9px] md:text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold flex-shrink-0">
                          {task.priority}
                        </span>
                      </div>

                      {task.result && (
                        <div className="mt-2.5 p-2 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-emerald-300 break-words">
                          {task.result}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Event stream */}
              {activeTab === 'events' && (
                <div className="p-3 md:p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 font-mono text-xs">
                  <div className="text-[11px] text-zinc-500 uppercase font-semibold pb-1 border-b border-zinc-800">
                    Live Autonomous Execution Stream
                  </div>
                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {events.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-1.5 text-[11px] leading-tight">
                        <span className="text-zinc-600 flex-shrink-0">[{ev.timestamp}]</span>
                        <span
                          className={`uppercase font-bold text-[9px] px-1 rounded flex-shrink-0 ${
                            ev.type === 'error'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : ev.type === 'success'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {ev.stage}
                        </span>
                        <span className="text-zinc-300 break-words">{ev.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pull Request Card after execution completes */}
              {progress.percentage === 100 && !prCreated && (
                <div className="p-4 md:p-5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Tasks Executed on Branch: {agentBranch}</span>
                    </div>
                    <p className="text-xs text-zinc-300">
                      Atomic commits applied. Request user approval to open GitHub PR.
                    </p>
                  </div>

                  <button
                    onClick={handleCreatePullRequest}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg transition touch-manipulation"
                  >
                    <GitPullRequest className="w-4 h-4" />
                    <span>Open GitHub Pull Request</span>
                  </button>
                </div>
              )}

              {prCreated && (
                <div className="p-4 md:p-5 rounded-xl bg-zinc-950 border border-emerald-500/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <GitPullRequest className="w-4 h-4 flex-shrink-0" />
                      <span>Pull Request #{prCreated.number} Opened on GitHub</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Proposed changes are ready for team review and merging.
                    </p>
                  </div>

                  <a
                    href={prCreated.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-emerald-400 transition"
                  >
                    <span>View PR on GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Live progress, Workspace sync & Artifacts */}
      <div
        className={`${
          mobileSection === 'tasks' ? 'flex' : 'hidden'
        } lg:flex w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-950 p-3 md:p-4 space-y-4 md:space-y-5 overflow-y-auto flex-shrink-0`}
      >
        {/* Execution Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-zinc-400 font-semibold uppercase text-[11px]">
              Execution Progress
            </span>
            <span className="font-mono text-emerald-400 font-bold">{progress.percentage}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-1 pt-1 text-center font-mono text-[10px]">
            <div className="p-1 rounded bg-zinc-900 border border-zinc-800">
              <div className="text-zinc-500">TOTAL</div>
              <div className="text-zinc-200 font-bold">{progress.total}</div>
            </div>
            <div className="p-1 rounded bg-zinc-900 border border-zinc-800">
              <div className="text-emerald-500">DONE</div>
              <div className="text-emerald-400 font-bold">{progress.completed}</div>
            </div>
            <div className="p-1 rounded bg-zinc-900 border border-zinc-800">
              <div className="text-blue-400">BUSY</div>
              <div className="text-blue-300 font-bold">{progress.inProgress}</div>
            </div>
            <div className="p-1 rounded bg-zinc-900 border border-zinc-800">
              <div className="text-zinc-500">WAIT</div>
              <div className="text-zinc-400 font-bold">{progress.pending}</div>
            </div>
          </div>
        </div>

        {/* Google Workspace Synchronization */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Google Tasks Sync</span>
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                workspaceToken ? 'text-emerald-400 bg-emerald-950' : 'text-zinc-500 bg-zinc-800'
              }`}
            >
              {workspaceToken ? 'Ready' : 'Auth Required'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Sync approved tasks to an actionable Google Tasks checklist.
          </p>
          <button
            onClick={handleSyncToGoogleTasks}
            disabled={!workspaceToken || isSyncingTasks || approvedTasks.length === 0}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-medium disabled:opacity-40 transition touch-manipulation"
          >
            {isSyncingTasks ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>Sync to Google Tasks</span>
            )}
          </button>
          {tasksSyncSuccess && (
            <div className="text-[11px] text-emerald-400 font-mono leading-tight">
              ✓ {tasksSyncSuccess}
            </div>
          )}
        </div>

        {/* Google Drive Artifacts */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Google Drive Export</span>
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                workspaceToken ? 'text-emerald-400 bg-emerald-950' : 'text-zinc-500 bg-zinc-800'
              }`}
            >
              {workspaceToken ? 'Ready' : 'Auth Required'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Persist markdown implementation report and architecture plan to Google Drive.
          </p>
          <button
            onClick={handleExportToGoogleDrive}
            disabled={!workspaceToken || isExportingDrive || !currentPlan}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium disabled:opacity-40 transition touch-manipulation"
          >
            {isExportingDrive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>Export Report to Drive</span>
            )}
          </button>
          {driveExportUrl && (
            <a
              href={driveExportUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-mono truncate"
            >
              <span>View in Google Drive</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          )}
        </div>

        {/* Google Keep Status */}
        <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Google Keep Notes</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Google Keep API is reserved for enterprise domains. Project notes and unresolved bugs are safely preserved in Cloud Firestore & Google Drive.
          </p>
        </div>
      </div>
    </div>
  );
};
