/**
 * Task Graph and Dependency Resolution Engine
 * Handles topological ordering, status transitions, and dependency validation
 * for autonomous agent execution.
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'skipped';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AgentTaskItem {
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

/**
 * Validates that all dependencies exist and checks for cyclical dependencies.
 * Returns topologically ordered task IDs if valid, or throws an error.
 */
export function getTopologicalTaskOrder(tasks: AgentTaskItem[]): string[] {
  const taskMap = new Map<string, AgentTaskItem>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];

  function dfs(taskId: string) {
    if (visiting.has(taskId)) {
      throw new Error(`Circular dependency detected involving task: ${taskId}`);
    }
    if (visited.has(taskId)) return;

    visiting.add(taskId);
    const task = taskMap.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} references unknown dependency`);
    }

    for (const depId of task.dependencies) {
      if (!taskMap.has(depId)) {
        throw new Error(`Task ${taskId} depends on non-existent task ${depId}`);
      }
      dfs(depId);
    }

    visiting.delete(taskId);
    visited.add(taskId);
    order.push(taskId);
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  }

  return order;
}

/**
 * Determines which tasks are currently executable (all dependencies completed, and status is pending).
 */
export function getExecutableTasks(tasks: AgentTaskItem[]): AgentTaskItem[] {
  const completedIds = new Set(
    tasks.filter((t) => t.status === 'completed' || t.status === 'skipped').map((t) => t.id)
  );

  return tasks.filter((t) => {
    if (t.status !== 'pending') return false;
    return t.dependencies.every((depId) => completedIds.has(depId));
  });
}

/**
 * Checks if all tasks have reached a terminal state (completed, failed, blocked, or skipped).
 */
export function isExecutionFinished(tasks: AgentTaskItem[]): boolean {
  if (tasks.length === 0) return true;
  return tasks.every((t) => ['completed', 'failed', 'blocked', 'skipped'].includes(t.status));
}

/**
 * Calculates overall progress percentage from task statuses.
 */
export function calculateExecutionProgress(tasks: AgentTaskItem[]): {
  percentage: number;
  total: number;
  completed: number;
  inProgress: number;
  failed: number;
  pending: number;
} {
  const total = tasks.length;
  if (total === 0) {
    return { percentage: 0, total: 0, completed: 0, inProgress: 0, failed: 0, pending: 0 };
  }

  const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'skipped').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const failed = tasks.filter((t) => t.status === 'failed' || t.status === 'blocked').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;

  const percentage = Math.round((completed / total) * 100);

  return { percentage, total, completed, inProgress, failed, pending };
}

/**
 * If a task fails, marks all downstream dependent tasks as blocked.
 */
export function cascadeFailureBlocks(tasks: AgentTaskItem[], failedTaskId: string): AgentTaskItem[] {
  const blockedIds = new Set<string>();

  function markDownstream(currentId: string) {
    for (const t of tasks) {
      if (t.dependencies.includes(currentId) && !blockedIds.has(t.id)) {
        blockedIds.add(t.id);
        markDownstream(t.id);
      }
    }
  }

  markDownstream(failedTaskId);

  return tasks.map((t) => {
    if (blockedIds.has(t.id) && t.status === 'pending') {
      return {
        ...t,
        status: 'blocked',
        result: `Blocked due to failure of upstream dependency: ${failedTaskId}`,
      };
    }
    return t;
  });
}
