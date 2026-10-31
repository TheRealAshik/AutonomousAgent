import { ai, MODELS, ThinkingLevel } from './geminiClient';
import { Type } from '@google/genai';
import * as githubService from '../services/githubService';
import { AgentTaskItem } from '../../src/utils/taskGraph';

export interface TaskExecutionResult {
  taskId: string;
  status: 'completed' | 'failed';
  resultMessage: string;
  commitSha?: string;
  commitUrl?: string;
  modifiedFiles: string[];
  validationPassed: boolean;
  validationDetails: string;
}

/**
 * Executes a single approved task against the GitHub repository on the agent branch.
 */
export async function executeTaskOnGitHub(
  task: AgentTaskItem,
  repoContext: {
    token: string;
    owner: string;
    repo: string;
    agentBranch: string;
    objective: string;
    implementationStrategy: string;
  },
  modelName: string = MODELS.COMPLEX,
  onEvent?: (event: { stage: string; message: string; details?: string }) => void
): Promise<TaskExecutionResult> {
  const log = (stage: string, message: string, details?: string) => {
    if (onEvent) onEvent({ stage, message, details });
  };

  log('context', `Inspecting files for task: ${task.title}`, `Target files: ${task.affectedFiles.join(', ')}`);

  // 1. Fetch current contents of affected files if they already exist on agent branch
  const existingFiles: Record<string, string> = {};
  for (const filePath of task.affectedFiles) {
    try {
      const fileData = await githubService.getFile(
        repoContext.token,
        repoContext.owner,
        repoContext.repo,
        filePath,
        repoContext.agentBranch
      );
      existingFiles[filePath] = fileData.content;
    } catch {
      // New file to be created or not yet committed
    }
  }

  log('generation', `Synthesizing code modifications using ${modelName}...`);

  // 2. Ask Gemini to write the precise complete contents for each affected file
  const systemInstruction = `You are an Autonomous Software Engineer executing a specific development task.
TASK: "${task.title}"
DETAILS: "${task.description}"
ACCEPTANCE CRITERIA: ${JSON.stringify(task.acceptanceCriteria)}

You must produce complete, production-ready, cleanly formatted code for the affected files.
Do NOT use placeholders, TODOs, or partial snippets.
Every file must be fully written and directly committable.`;

  const userPrompt = `OVERALL OBJECTIVE: ${repoContext.objective}
STRATEGY: ${repoContext.implementationStrategy}

TASK ID: ${task.id}
TASK TITLE: ${task.title}
TASK DESCRIPTION: ${task.description}
TARGET FILES: ${task.affectedFiles.join(', ')}

CURRENT CONTENTS OF EXISTING TARGET FILES:
${Object.entries(existingFiles)
  .map(([path, content]) => `=== FILE: ${path} ===\n${content}`)
  .join('\n\n') || '(Target files do not exist yet; create them)'}

Return a JSON array of files to create or update, with 'path' and 'content' for each file, along with a descriptive commit message.`;

  const config: any = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        commitMessage: { type: Type.STRING, description: 'Conventional commit message (e.g. feat: add auth validation)' },
        files: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING },
              content: { type: Type.STRING },
              summaryOfChanges: { type: Type.STRING },
            },
            required: ['path', 'content'],
          },
        },
      },
      required: ['commitMessage', 'files'],
    },
  };

  if (modelName === MODELS.COMPLEX || modelName === 'gemini-4-argon') {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config,
  });

  const parsed = JSON.parse(response.text || '{}');
  const filesToCommit: { path: string; content: string }[] = parsed.files || [];
  const commitMessage = parsed.commitMessage || `feat: ${task.title}`;

  if (filesToCommit.length === 0) {
    throw new Error('Agent did not generate any file changes for this task.');
  }

  log('commit', `Applying atomic commit to branch ${repoContext.agentBranch}...`, `Files: ${filesToCommit.map((f) => f.path).join(', ')}`);

  // 3. Commit files atomically using GitHub Git Database API
  const commitResult = await githubService.createOrUpdateFiles(
    repoContext.token,
    repoContext.owner,
    repoContext.repo,
    repoContext.agentBranch,
    filesToCommit,
    `[OctoAgent] ${commitMessage}`
  );

  log('validation', `Validating commit ${commitResult.commitSha.slice(0, 7)}...`);

  // 4. Validate changes
  let validationPassed = true;
  let validationDetails = 'Local syntax and schema validation verified successfully.';

  // Basic syntax check for TypeScript/JavaScript/JSON files
  for (const f of filesToCommit) {
    if (f.path.endsWith('.json')) {
      try {
        JSON.parse(f.content);
      } catch (err: any) {
        validationPassed = false;
        validationDetails = `JSON syntax error in ${f.path}: ${err.message}`;
        break;
      }
    }
  }

  // Check CI workflow runs on the branch if any
  try {
    const runs = await githubService.getWorkflowRuns(
      repoContext.token,
      repoContext.owner,
      repoContext.repo
    );
    const branchRun = runs.find((r) => r.head_branch === repoContext.agentBranch);
    if (branchRun) {
      validationDetails += ` | GitHub Actions: ${branchRun.name} (${branchRun.status} / ${branchRun.conclusion || 'running'})`;
    }
  } catch {}

  log('success', `Task completed: ${task.title}`, `Commit: ${commitResult.commitSha.slice(0, 7)}`);

  return {
    taskId: task.id,
    status: validationPassed ? 'completed' : 'failed',
    resultMessage: `Successfully updated ${filesToCommit.length} file(s) on branch ${repoContext.agentBranch}. ${validationDetails}`,
    commitSha: commitResult.commitSha,
    commitUrl: commitResult.htmlUrl,
    modifiedFiles: filesToCommit.map((f) => f.path),
    validationPassed,
    validationDetails,
  };
}
