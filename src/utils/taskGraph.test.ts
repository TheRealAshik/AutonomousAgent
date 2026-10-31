import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTopologicalTaskOrder,
  getExecutableTasks,
  isExecutionFinished,
  calculateExecutionProgress,
  cascadeFailureBlocks,
  AgentTaskItem,
} from './taskGraph';

test('getTopologicalTaskOrder handles linear and branched dependencies', () => {
  const tasks: AgentTaskItem[] = [
    {
      id: 'task-3',
      title: 'Deploy or PR',
      description: 'Open PR',
      status: 'pending',
      priority: 'high',
      dependencies: ['task-2'],
      affectedFiles: [],
      acceptanceCriteria: [],
    },
    {
      id: 'task-1',
      title: 'Analyze and plan',
      description: 'Read repo',
      status: 'completed',
      priority: 'high',
      dependencies: [],
      affectedFiles: [],
      acceptanceCriteria: [],
    },
    {
      id: 'task-2',
      title: 'Implement feature',
      description: 'Write code',
      status: 'pending',
      priority: 'high',
      dependencies: ['task-1'],
      affectedFiles: [],
      acceptanceCriteria: [],
    },
  ];

  const order = getTopologicalTaskOrder(tasks);
  assert.equal(order.indexOf('task-1') < order.indexOf('task-2'), true);
  assert.equal(order.indexOf('task-2') < order.indexOf('task-3'), true);
});

test('getTopologicalTaskOrder detects cyclical dependencies', () => {
  const cyclicalTasks: AgentTaskItem[] = [
    {
      id: 'task-a',
      title: 'Task A',
      description: '',
      status: 'pending',
      priority: 'medium',
      dependencies: ['task-b'],
      affectedFiles: [],
      acceptanceCriteria: [],
    },
    {
      id: 'task-b',
      title: 'Task B',
      description: '',
      status: 'pending',
      priority: 'medium',
      dependencies: ['task-a'],
      affectedFiles: [],
      acceptanceCriteria: [],
    },
  ];

  assert.throws(() => {
    getTopologicalTaskOrder(cyclicalTasks);
  }, /Circular dependency/);
});

test('getExecutableTasks returns only tasks whose dependencies are met', () => {
  const tasks: AgentTaskItem[] = [
    {
      id: 'task-1',
      title: 'Setup',
      description: '',
      status: 'completed',
      priority: 'high',
      dependencies: [],
      affectedFiles: [],
      acceptanceCriteria: [],
    },
    {
      id: 'task-2',
      title: 'Core logic',
      description: '',
      status: 'pending',
      priority: 'high',
      dependencies: ['task-1'],
      affectedFiles: [],
      acceptanceCriteria: [],
    },
    {
      id: 'task-3',
      title: 'E2E Test',
      description: '',
      status: 'pending',
      priority: 'medium',
      dependencies: ['task-2'],
      affectedFiles: [],
      acceptanceCriteria: [],
    },
  ];

  const executable = getExecutableTasks(tasks);
  assert.equal(executable.length, 1);
  assert.equal(executable[0].id, 'task-2');
});

test('calculateExecutionProgress calculates metrics correctly', () => {
  const tasks: AgentTaskItem[] = [
    { id: '1', title: 'T1', description: '', status: 'completed', priority: 'high', dependencies: [], affectedFiles: [], acceptanceCriteria: [] },
    { id: '2', title: 'T2', description: '', status: 'completed', priority: 'high', dependencies: [], affectedFiles: [], acceptanceCriteria: [] },
    { id: '3', title: 'T3', description: '', status: 'in_progress', priority: 'high', dependencies: [], affectedFiles: [], acceptanceCriteria: [] },
    { id: '4', title: 'T4', description: '', status: 'pending', priority: 'high', dependencies: [], affectedFiles: [], acceptanceCriteria: [] },
  ];

  const stats = calculateExecutionProgress(tasks);
  assert.equal(stats.total, 4);
  assert.equal(stats.completed, 2);
  assert.equal(stats.percentage, 50);
  assert.equal(isExecutionFinished(tasks), false);
});

test('cascadeFailureBlocks marks downstream tasks as blocked', () => {
  const tasks: AgentTaskItem[] = [
    { id: '1', title: 'Task 1', description: '', status: 'failed', priority: 'high', dependencies: [], affectedFiles: [], acceptanceCriteria: [] },
    { id: '2', title: 'Task 2', description: '', status: 'pending', priority: 'high', dependencies: ['1'], affectedFiles: [], acceptanceCriteria: [] },
    { id: '3', title: 'Task 3', description: '', status: 'pending', priority: 'high', dependencies: ['2'], affectedFiles: [], acceptanceCriteria: [] },
    { id: '4', title: 'Task 4 Independent', description: '', status: 'pending', priority: 'low', dependencies: [], affectedFiles: [], acceptanceCriteria: [] },
  ];

  const updated = cascadeFailureBlocks(tasks, '1');
  const task2 = updated.find((t) => t.id === '2');
  const task3 = updated.find((t) => t.id === '3');
  const task4 = updated.find((t) => t.id === '4');

  assert.equal(task2?.status, 'blocked');
  assert.equal(task3?.status, 'blocked');
  assert.equal(task4?.status, 'pending');
});
