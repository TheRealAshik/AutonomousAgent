/**
 * OctoAgent AI - Autonomous GitHub Development Agent
 * Full-stack platform powered by Gemini models and Google Workspace
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  testConnection,
  db,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { Navbar } from './components/Navbar';
import { Sidebar, MobileBottomNav, NavTab } from './components/Sidebar';
import { GitHubConnectModal } from './components/GitHubConnectModal';
import { PlanReviewModal } from './components/PlanReviewModal';

import { DashboardView } from './features/dashboard/DashboardView';
import { AgentWorkspaceView } from './features/agent/AgentWorkspaceView';
import { ProjectsView } from './features/projects/ProjectsView';
import { TasksView } from './features/tasks/TasksView';
import { KnowledgeView } from './features/knowledge/KnowledgeView';
import { IntegrationsView } from './features/integrations/IntegrationsView';
import { HistoryView } from './features/history/HistoryView';
import { SettingsView } from './features/settings/SettingsView';

import {
  AgentSessionRecord,
  AgentTask,
  ExecutionPlan,
  GitHubConnectedUser,
  GitHubRepository,
} from './types/agent';

const SEED_REPO: GitHubRepository = {
  id: 101,
  name: 'cloud-commerce-core',
  full_name: 'octo-org/cloud-commerce-core',
  owner: {
    login: 'octo-org',
    avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  },
  private: false,
  html_url: 'https://github.com/octo-org/cloud-commerce-core',
  description: 'High-throughput e-commerce backend microservices in TypeScript with OAuth and telemetry.',
  default_branch: 'main',
  updated_at: new Date().toISOString(),
  stargazers_count: 142,
  forks_count: 28,
  open_issues_count: 5,
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null);

  // GitHub Credentials State
  const [rawGitHubToken, setRawGitHubToken] = useState<string>('');
  const [githubUser, setGithubUser] = useState<GitHubConnectedUser | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([SEED_REPO]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(SEED_REPO);

  // Active View Tab
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Intelligence Settings
  const [activeModel, setActiveModel] = useState<string>('gemini-4-argon');
  const [isHighThinking, setIsHighThinking] = useState<boolean>(true);

  // Modals
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isPlanReviewOpen, setIsPlanReviewOpen] = useState(false);

  // Active Plan & Tasks
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null);
  const [approvedTasks, setApprovedTasks] = useState<AgentTask[]>([]);
  const [quickPrompt, setQuickPrompt] = useState<string>('');

  // History & Sessions
  const [sessions, setSessions] = useState<AgentSessionRecord[]>([]);

  // 1. Initialize Firebase Auth and test connection on boot
  useEffect(() => {
    testConnection().catch((err) => console.warn('Firestore initial ping:', err));

    const unsubscribe = initAuth(
      async (currentUser, token) => {
        setUser(currentUser);
        if (token) setWorkspaceToken(token);
        // Ensure user profile document exists
        try {
          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('User profile sync notice:', e);
        }
      },
      () => {
        setUser(null);
        setWorkspaceToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Listen to user sessions in Firestore if logged in
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/agentSessions`;
    try {
      const q = collection(db, 'users', user.uid, 'agentSessions');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: AgentSessionRecord[] = [];
          snapshot.forEach((d) => list.push(d.data() as AgentSessionRecord));
          if (list.length > 0) {
            setSessions(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, path);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore snapshot setup notice:', e);
    }
  }, [user]);

  // Auth actions
  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setWorkspaceToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setWorkspaceToken(null);
  };

  // GitHub actions
  const handleGitHubConnectSuccess = (
    user: GitHubConnectedUser,
    repos: GitHubRepository[],
    token: string
  ) => {
    setGithubUser(user);
    setRawGitHubToken(token);
    if (repos && repos.length > 0) {
      setRepositories(repos);
      setSelectedRepo(repos[0]);
    }
  };

  const handleDisconnectGitHub = () => {
    setGithubUser(null);
    setRawGitHubToken('');
    setRepositories([SEED_REPO]);
    setSelectedRepo(SEED_REPO);
    setIsGitHubModalOpen(false);
  };

  // Plan approval handler
  const handleApprovePlan = (updatedTasks: AgentTask[]) => {
    setApprovedTasks(updatedTasks);
    setIsPlanReviewOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        user={user}
        workspaceToken={workspaceToken}
        githubUser={githubUser}
        selectedRepo={selectedRepo}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onGoogleSignIn={handleGoogleSignIn}
        onLogout={handleLogout}
        activeModel={activeModel}
        isHighThinking={isHighThinking}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Workspace Body (Row layout on desktop; full width on mobile) */}
      <div className="flex-1 flex flex-row min-w-0 w-full overflow-hidden relative">
        {/* Navigation Sidebar (Desktop aside + Mobile slide-over drawer) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileMenuOpen(false);
          }}
          activeExecutionsCount={approvedTasks.filter((t) => t.status === 'in_progress').length}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />

        {/* View Router (Always 100% width on mobile) */}
        <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden bg-zinc-900/30">
          {currentTab === 'dashboard' && (
            <DashboardView
              user={user}
              githubUser={githubUser}
              selectedRepo={selectedRepo}
              workspaceToken={workspaceToken}
              sessions={sessions}
              onSelectTab={setCurrentTab}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
              onSelectRepo={setSelectedRepo}
              onQuickStartPrompt={(p) => setQuickPrompt(p)}
            />
          )}

          {currentTab === 'agent' && (
            <AgentWorkspaceView
              githubUser={githubUser}
              rawGitHubToken={rawGitHubToken}
              selectedRepo={selectedRepo}
              onSelectRepo={setSelectedRepo}
              repositories={repositories}
              workspaceToken={workspaceToken}
              activeModel={activeModel}
              setActiveModel={setActiveModel}
              isHighThinking={isHighThinking}
              setIsHighThinking={setIsHighThinking}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
              onOpenPlanReview={(plan) => {
                setCurrentPlan(plan);
                setIsPlanReviewOpen(true);
              }}
              currentPlan={currentPlan}
              setCurrentPlan={setCurrentPlan}
              approvedTasks={approvedTasks}
              setApprovedTasks={setApprovedTasks}
              initialPrompt={quickPrompt}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsView
              repositories={repositories}
              selectedRepo={selectedRepo}
              onSelectRepo={(r) => {
                setSelectedRepo(r);
                setCurrentTab('agent');
              }}
              rawGitHubToken={rawGitHubToken}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              tasks={approvedTasks}
              selectedRepo={selectedRepo}
              workspaceToken={workspaceToken}
              onSyncGoogleTasks={() => {
                setCurrentTab('agent');
              }}
              isSyncing={false}
            />
          )}

          {currentTab === 'knowledge' && (
            <KnowledgeView
              selectedRepo={selectedRepo}
              workspaceToken={workspaceToken}
            />
          )}

          {currentTab === 'integrations' && (
            <IntegrationsView
              githubUser={githubUser}
              user={user}
              workspaceToken={workspaceToken}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
              onGoogleSignIn={handleGoogleSignIn}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              sessions={sessions}
              onSelectSession={(s) => {
                if (s.plan) {
                  setCurrentPlan(s.plan);
                  setApprovedTasks(s.plan.tasks);
                  setCurrentTab('agent');
                }
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              activeModel={activeModel}
              setActiveModel={setActiveModel}
              isHighThinking={isHighThinking}
              setIsHighThinking={setIsHighThinking}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar: Positioned at bottom of screen on mobile */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsMobileMenuOpen(false);
        }}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* GitHub Connect Modal */}
      <GitHubConnectModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        currentUser={githubUser}
        onConnectSuccess={handleGitHubConnectSuccess}
        onDisconnect={handleDisconnectGitHub}
      />

      {/* Plan Review Modal */}
      {currentPlan && (
        <PlanReviewModal
          isOpen={isPlanReviewOpen}
          onClose={() => setIsPlanReviewOpen(false)}
          plan={currentPlan}
          onApprove={handleApprovePlan}
        />
      )}
    </div>
  );
}
