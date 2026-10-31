import { FunctionDeclaration, Type } from '@google/genai';

/**
 * Centralized Gemini Function Declarations for Autonomous Development Agent
 */

export const githubGetRepositoryDeclaration: FunctionDeclaration = {
  name: 'github_get_repository',
  description: 'Retrieve detailed information about a GitHub repository including default branch and stats.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      owner: { type: Type.STRING, description: 'Repository owner (e.g. facebook)' },
      repo: { type: Type.STRING, description: 'Repository name (e.g. react)' },
    },
    required: ['owner', 'repo'],
  },
};

export const githubGetDirectoryDeclaration: FunctionDeclaration = {
  name: 'github_get_directory',
  description: 'List the files and directories in a specific path of the repository.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      owner: { type: Type.STRING, description: 'Repository owner' },
      repo: { type: Type.STRING, description: 'Repository name' },
      path: { type: Type.STRING, description: 'Directory path (empty string for root)' },
      ref: { type: Type.STRING, description: 'Branch or commit SHA (optional)' },
    },
    required: ['owner', 'repo'],
  },
};

export const githubGetFileDeclaration: FunctionDeclaration = {
  name: 'github_get_file',
  description: 'Retrieve the text content of a source file from the repository.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      owner: { type: Type.STRING, description: 'Repository owner' },
      repo: { type: Type.STRING, description: 'Repository name' },
      path: { type: Type.STRING, description: 'Path to file (e.g. src/auth/login.ts)' },
      ref: { type: Type.STRING, description: 'Branch or commit SHA' },
    },
    required: ['owner', 'repo', 'path'],
  },
};

export const githubSearchCodeDeclaration: FunctionDeclaration = {
  name: 'github_search_code',
  description: 'Search for functions, variables, or text across the repository.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      owner: { type: Type.STRING, description: 'Repository owner' },
      repo: { type: Type.STRING, description: 'Repository name' },
      query: { type: Type.STRING, description: 'Search term or symbol' },
    },
    required: ['owner', 'repo', 'query'],
  },
};

export const githubGetCommitsDeclaration: FunctionDeclaration = {
  name: 'github_get_commits',
  description: 'Retrieve recent commit history of a repository or branch.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      owner: { type: Type.STRING, description: 'Repository owner' },
      repo: { type: Type.STRING, description: 'Repository name' },
      branch: { type: Type.STRING, description: 'Branch name (optional)' },
      limit: { type: Type.INTEGER, description: 'Number of commits (default 10)' },
    },
    required: ['owner', 'repo'],
  },
};

export const githubGetWorkflowRunsDeclaration: FunctionDeclaration = {
  name: 'github_get_workflow_runs',
  description: 'Inspect GitHub Actions workflow runs and CI test results.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      owner: { type: Type.STRING, description: 'Repository owner' },
      repo: { type: Type.STRING, description: 'Repository name' },
    },
    required: ['owner', 'repo'],
  },
};

export const agentToolDeclarations = [
  githubGetRepositoryDeclaration,
  githubGetDirectoryDeclaration,
  githubGetFileDeclaration,
  githubSearchCodeDeclaration,
  githubGetCommitsDeclaration,
  githubGetWorkflowRunsDeclaration,
];
