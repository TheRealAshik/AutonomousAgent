import { Router, Request, Response } from 'express';
import * as githubService from '../services/githubService';
import * as workspaceService from '../services/workspaceService';
import { generateExecutionPlan, collectRepositoryContext } from '../agent/planner';
import { executeTaskOnGitHub } from '../agent/executor';
import { encryptToken, decryptToken, maskToken } from '../security/crypto';
import { MODELS } from '../agent/geminiClient';

export const apiRouter = Router();

// Middleware to extract token (either raw or encrypted header)
function extractGitHubToken(req: Request): string {
  const authHeader = req.headers['x-github-token'] as string;
  if (!authHeader) {
    throw new Error('Missing GitHub credentials. Please connect your GitHub Personal Access Token.');
  }

  // If token is encrypted
  if (authHeader.startsWith('enc:')) {
    const userId = (req.headers['x-user-id'] as string) || '';
    return decryptToken(authHeader.slice(4), userId);
  }

  return authHeader;
}

// 1. Validate GitHub Token
apiRouter.post('/github/validate', async (req: Request, res: Response) => {
  try {
    const { token, userId } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Personal Access Token is required.' });
    }

    const { user, scopes } = await githubService.validateToken(token);
    const repos = await githubService.listUserRepositories(token);

    // Encrypt token for safe server-side storage
    const encryptedToken = encryptToken(token, userId || user.login);

    res.json({
      success: true,
      user,
      scopes,
      repoCount: repos.length,
      repositories: repos.slice(0, 30),
      encryptedToken: `enc:${encryptedToken}`,
      maskedToken: maskToken(token),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2. List Repositories
apiRouter.get('/github/repositories', async (req: Request, res: Response) => {
  try {
    const token = extractGitHubToken(req);
    const repos = await githubService.listUserRepositories(token);
    res.json({ repositories: repos });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 3. Get Repository Details & Branches
apiRouter.get('/github/repo-details', async (req: Request, res: Response) => {
  try {
    const token = extractGitHubToken(req);
    const owner = req.query.owner as string;
    const repo = req.query.repo as string;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo query params are required.' });
    }

    const [repoInfo, branches, rootFiles, workflowRuns] = await Promise.all([
      githubService.getRepository(token, owner, repo),
      githubService.getBranches(token, owner, repo),
      githubService.getDirectory(token, owner, repo, ''),
      githubService.getWorkflowRuns(token, owner, repo),
    ]);

    res.json({ repoInfo, branches, rootFiles, workflowRuns });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Get Directory Tree
apiRouter.get('/github/tree', async (req: Request, res: Response) => {
  try {
    const token = extractGitHubToken(req);
    const owner = req.query.owner as string;
    const repo = req.query.repo as string;
    const path = (req.query.path as string) || '';
    const ref = req.query.ref as string;

    const files = await githubService.getDirectory(token, owner, repo, path, ref);
    res.json({ files });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 5. Get File Content
apiRouter.get('/github/file', async (req: Request, res: Response) => {
  try {
    const token = extractGitHubToken(req);
    const owner = req.query.owner as string;
    const repo = req.query.repo as string;
    const path = req.query.path as string;
    const ref = req.query.ref as string;

    if (!path) {
      return res.status(400).json({ error: 'path is required.' });
    }

    const file = await githubService.getFile(token, owner, repo, path, ref);
    res.json({ file });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 6. Stage 1-4: Request Analysis, Context Collection, Intelligent Planning, Task Decomposition
apiRouter.post('/agent/analyze-and-plan', async (req: Request, res: Response) => {
  try {
    const token = extractGitHubToken(req);
    const { owner, repo, prompt, model, enableHighThinking } = req.body;

    if (!owner || !repo || !prompt) {
      return res.status(400).json({ error: 'owner, repo, and prompt are required.' });
    }

    // Step 1: Collect genuine repository context
    const repoContext = await collectRepositoryContext(token, owner, repo);

    // Step 2: Generate plan using Gemini with high thinking if selected
    const selectedModel = model || MODELS.COMPLEX;
    const plan = await generateExecutionPlan(
      prompt,
      {
        owner,
        repo,
        branch: repoContext.repoInfo.default_branch,
        ...repoContext,
      },
      selectedModel,
      enableHighThinking !== false
    );

    res.json({
      success: true,
      plan,
      repoSummary: {
        owner,
        repo,
        defaultBranch: repoContext.repoInfo.default_branch,
        language: repoContext.repoInfo.language,
      },
    });
  } catch (error: any) {
    console.error('Analyze and plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Stage 6: Create dedicated agent branch
apiRouter.post('/agent/create-branch', async (req: Request, res: Response) => {
  try {
    const token = extractGitHubToken(req);
    const { owner, repo, branchName, fromBranch } = req.body;

    const safeBranch = branchName || `agent/${Date.now().toString(36)}`;
    const result = await githubService.createBranch(token, owner, repo, safeBranch, fromBranch);
    res.json({ success: true, branch: safeBranch, ref: result.ref, sha: result.sha });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 8. Stage 6: Execute single task
apiRouter.post('/agent/execute-task', async (req: Request, res: Response) => {
  try {
    const token = extractGitHubToken(req);
    const { owner, repo, agentBranch, task, objective, implementationStrategy, model } = req.body;

    if (!owner || !repo || !agentBranch || !task) {
      return res.status(400).json({ error: 'Missing required execution parameters.' });
    }

    const events: any[] = [];
    const onEvent = (ev: { stage: string; message: string; details?: string }) => {
      events.push({ ...ev, timestamp: new Date().toISOString() });
    };

    const result = await executeTaskOnGitHub(
      task,
      {
        token,
        owner,
        repo,
        agentBranch,
        objective: objective || task.title,
        implementationStrategy: implementationStrategy || task.description,
      },
      model || MODELS.COMPLEX,
      onEvent
    );

    res.json({ success: true, result, events });
  } catch (error: any) {
    console.error('Task execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Stage 8: Create Pull Request
apiRouter.post('/agent/create-pr', async (req: Request, res: Response) => {
  try {
    const token = extractGitHubToken(req);
    const { owner, repo, title, body, head, base } = req.body;

    if (!owner || !repo || !title || !head || !base) {
      return res.status(400).json({ error: 'owner, repo, title, head, and base are required for PR.' });
    }

    const pr = await githubService.createPullRequest(token, owner, repo, title, body, head, base);
    res.json({ success: true, pullRequest: pr });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 10. Workspace: Sync to Google Tasks
apiRouter.post('/workspace/sync-tasks', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Google Workspace Bearer token.' });
    }
    const accessToken = authHeader.split(' ')[1];
    const { repoFullName, sessionId, tasks } = req.body;

    // Create or find task list for this session
    const listTitle = `OctoAgent: ${repoFullName || 'Project'} #${(sessionId || '').slice(0, 6)}`;
    const taskList = await workspaceService.createTaskList(accessToken, listTitle);

    const createdTasks: any[] = [];
    for (const t of tasks || []) {
      const gTask = await workspaceService.createGoogleTask(accessToken, taskList.id, {
        title: `[${t.priority?.toUpperCase() || 'HIGH'}] ${t.title}`,
        notes: `${t.description}\n\nAffected files: ${(t.affectedFiles || []).join(', ')}\nAcceptance criteria:\n${(t.acceptanceCriteria || []).map((c: string) => `- ${c}`).join('\n')}`,
      });
      createdTasks.push({ agentTaskId: t.id, googleTaskId: gTask.id });
    }

    res.json({
      success: true,
      taskListId: taskList.id,
      taskListTitle: taskList.title,
      tasks: createdTasks,
    });
  } catch (error: any) {
    console.error('Google Tasks sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11. Workspace: Export to Google Drive
apiRouter.post('/workspace/export-drive', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Google Workspace Bearer token.' });
    }
    const accessToken = authHeader.split(' ')[1];
    const { repoFullName, title, markdownContent } = req.body;

    // 1. Root folder: "OctoAgent Workspace"
    const rootFolder = await workspaceService.findOrCreateFolder(accessToken, 'OctoAgent Workspace');
    // 2. Repo folder: "owner-repo"
    const safeRepoName = (repoFullName || 'General').replace('/', '_');
    const projectFolder = await workspaceService.findOrCreateFolder(accessToken, safeRepoName, rootFolder.id);

    // 3. Upload file
    const fileName = `${title || 'Execution_Plan'}_${new Date().toISOString().slice(0, 10)}.md`;
    const file = await workspaceService.uploadDriveMarkdownFile(accessToken, fileName, markdownContent, projectFolder.id);

    res.json({
      success: true,
      fileId: file.id,
      fileName: file.name,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    });
  } catch (error: any) {
    console.error('Google Drive export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 12. Workspace: Check Google Keep Access
apiRouter.get('/workspace/check-keep', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Google Workspace Bearer token.' });
    }
    const accessToken = authHeader.split(' ')[1];
    const status = await workspaceService.testGoogleKeepAccess(accessToken);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ supported: false, message: error.message });
  }
});
