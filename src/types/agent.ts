export type AgentSessionStatus =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'waiting_approval'
  | 'executing'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'skipped';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[];
  affectedFiles: string[];
  acceptanceCriteria: string[];
  result?: string | null;
  googleTaskId?: string | null;
}

export interface ExecutionEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'stage_change' | 'task_update' | 'tool_call' | 'git_commit' | 'validation' | 'error' | 'success';
  stage: string;
  message: string;
  details?: string;
}

export interface ExecutionPlan {
  objective: string;
  problemAnalysis: string;
  proposedSolution: string;
  affectedFiles: string[];
  implementationStrategy: string;
  potentialRisks: string;
  testingStrategy: string;
  expectedDeliverables: string[];
  tasks: AgentTask[];
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GitHubConnectedUser {
  login: string;
  avatar_url: string;
  name: string;
  email: string | null;
  html_url: string;
  scopes?: string;
  maskedToken?: string;
  encryptedToken?: string;
}

export interface AgentSessionRecord {
  id: string;
  userId: string;
  repoFullName: string;
  repoDefaultBranch: string;
  agentBranch: string;
  prompt: string;
  status: AgentSessionStatus;
  modelUsed: string;
  thinkingLevel: string;
  plan?: ExecutionPlan;
  events: ExecutionEvent[];
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  commitSha?: string;
  googleTasksSyncStatus?: string;
  googleDriveReportUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
