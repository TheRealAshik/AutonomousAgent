import { ai, MODELS, ThinkingLevel } from './geminiClient';
import { Type } from '@google/genai';
import * as githubService from '../services/githubService';

export interface GeneratedPlan {
  objective: string;
  problemAnalysis: string;
  proposedSolution: string;
  affectedFiles: string[];
  implementationStrategy: string;
  potentialRisks: string;
  testingStrategy: string;
  expectedDeliverables: string[];
  tasks: {
    id: string;
    title: string;
    description: string;
    status: 'pending';
    priority: 'low' | 'medium' | 'high' | 'critical';
    dependencies: string[];
    affectedFiles: string[];
    acceptanceCriteria: string[];
    result: null;
  }[];
}

/**
 * Gathers relevant repository context without assumptions.
 */
export async function collectRepositoryContext(
  token: string,
  owner: string,
  repo: string,
  defaultBranch?: string
): Promise<{
  repoInfo: any;
  treeOverview: string;
  manifests: Record<string, string>;
  workflowFiles: Record<string, string>;
  recentCommits: any[];
  readmeContent: string;
}> {
  const repoInfo = await githubService.getRepository(token, owner, repo);
  const branch = defaultBranch || repoInfo.default_branch;

  // 1. Get root directory items
  let rootFiles: any[] = [];
  try {
    rootFiles = await githubService.getDirectory(token, owner, repo, '', branch);
  } catch (e) {
    console.warn('Failed to read root directory', e);
  }

  // 2. Read key manifests
  const manifests: Record<string, string> = {};
  const manifestCandidates = ['package.json', 'tsconfig.json', 'go.mod', 'Cargo.toml', 'requirements.txt', 'pom.xml'];
  for (const candidate of manifestCandidates) {
    if (rootFiles.some((f) => f.name === candidate)) {
      try {
        const file = await githubService.getFile(token, owner, repo, candidate, branch);
        manifests[candidate] = file.content;
      } catch {}
    }
  }

  // 3. Read README
  let readmeContent = '';
  const readmeItem = rootFiles.find((f) => f.name.toLowerCase().startsWith('readme'));
  if (readmeItem) {
    try {
      const readme = await githubService.getFile(token, owner, repo, readmeItem.path, branch);
      readmeContent = readme.content.slice(0, 4000); // sample
    } catch {}
  }

  // 4. Read GitHub Actions workflows if available
  const workflowFiles: Record<string, string> = {};
  try {
    const workflowDir = await githubService.getDirectory(token, owner, repo, '.github/workflows', branch);
    for (const wf of workflowDir.slice(0, 3)) {
      if (wf.type === 'file') {
        const wfContent = await githubService.getFile(token, owner, repo, wf.path, branch);
        workflowFiles[wf.name] = wfContent.content;
      }
    }
  } catch {}

  // 5. Recent commits
  let recentCommits: any[] = [];
  try {
    recentCommits = await githubService.getCommits(token, owner, repo, branch, 5);
  } catch {}

  const treeOverview = rootFiles
    .map((f) => `${f.type === 'dir' ? '[DIR]' : '[FILE]'} ${f.path}`)
    .join('\n');

  return {
    repoInfo,
    treeOverview,
    manifests,
    workflowFiles,
    recentCommits,
    readmeContent,
  };
}

/**
 * Generates an intelligent, structured development plan and task decomposition.
 */
export async function generateExecutionPlan(
  userPrompt: string,
  repoContext: {
    owner: string;
    repo: string;
    branch: string;
    repoInfo: any;
    treeOverview: string;
    manifests: Record<string, string>;
    workflowFiles: Record<string, string>;
    recentCommits: any[];
    readmeContent: string;
  },
  modelName: string = MODELS.COMPLEX,
  enableHighThinking: boolean = true
): Promise<GeneratedPlan> {
  const systemInstruction = `You are a Principal Software Architect and Autonomous GitHub Development Agent.
Your role is to analyze a user's development request for repository "${repoContext.owner}/${repoContext.repo}", inspect the gathered repository context, and construct an authoritative, highly structured execution plan decomposed into discrete, executable engineering tasks.

RULES:
1. Every plan must be specific to the repository files, tech stack, and conventions detected.
2. Decompose into 3 to 6 independent or sequentially dependent tasks.
3. Every task MUST have a unique id (e.g. "task-1", "task-2"), clear title, actionable description, priority, dependencies (array of prerequisite task ids), affectedFiles, and acceptanceCriteria.
4. Independent tasks should have empty dependencies: []. Dependent tasks MUST explicitly name their prerequisite ids.
5. All task statuses MUST initially be "pending".
6. Do NOT invent fake files that contradict the repository architecture.
7. Return strictly valid JSON adhering to the provided schema.`;

  const contextPrompt = `USER DEVELOPMENT INSTRUCTION:
${userPrompt}

TARGET REPOSITORY CONTEXT:
Repository: ${repoContext.owner}/${repoContext.repo}
Default Branch: ${repoContext.branch}
Description: ${repoContext.repoInfo.description || 'None provided'}
Language / Environment: ${repoContext.repoInfo.language || 'Unknown'}

DIRECTORY ROOT OVERVIEW:
${repoContext.treeOverview || 'Empty or unavailable'}

PROJECT MANIFESTS:
${Object.entries(repoContext.manifests)
  .map(([k, v]) => `--- ${k} ---\n${v.slice(0, 1500)}`)
  .join('\n\n') || 'None found'}

CI WORKFLOWS:
${Object.entries(repoContext.workflowFiles)
  .map(([k, v]) => `--- ${k} ---\n${v.slice(0, 1000)}`)
  .join('\n\n') || 'No GitHub Actions workflows found'}

README SUMMARY:
${repoContext.readmeContent ? repoContext.readmeContent.slice(0, 1500) : 'No README found'}

RECENT COMMITS:
${repoContext.recentCommits
  .map((c: any) => `- [${c.sha.slice(0, 7)}] ${c.commit.message} (${c.commit.author.name})`)
  .join('\n') || 'None'}

Please construct the structured execution plan and task decomposition now.`;

  const config: any = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        objective: { type: Type.STRING, description: 'Concise statement of development goal' },
        problemAnalysis: { type: Type.STRING, description: 'Technical analysis of the current state and problem' },
        proposedSolution: { type: Type.STRING, description: 'Detailed architecture of the proposed technical solution' },
        affectedFiles: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Files and modules likely to be modified or created',
        },
        implementationStrategy: { type: Type.STRING, description: 'Step-by-step implementation approach' },
        potentialRisks: { type: Type.STRING, description: 'Identified risks and mitigation strategies' },
        testingStrategy: { type: Type.STRING, description: 'How the solution will be verified (CI, unit tests, lint)' },
        expectedDeliverables: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Deliverables resulting from this execution',
        },
        tasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['pending'] },
              priority: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
              dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
              affectedFiles: { type: Type.ARRAY, items: { type: Type.STRING } },
              acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['id', 'title', 'description', 'status', 'priority', 'dependencies', 'affectedFiles', 'acceptanceCriteria'],
          },
        },
      },
      required: [
        'objective',
        'problemAnalysis',
        'proposedSolution',
        'affectedFiles',
        'implementationStrategy',
        'potentialRisks',
        'testingStrategy',
        'expectedDeliverables',
        'tasks',
      ],
    },
  };

  if (enableHighThinking && (modelName === MODELS.COMPLEX || modelName === 'gemini-4-argon')) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts: [{ text: contextPrompt }] }],
    config,
  });

  const text = response.text || '{}';
  const plan: GeneratedPlan = JSON.parse(text);

  // Ensure every task has result: null
  plan.tasks = (plan.tasks || []).map((t) => ({
    ...t,
    status: 'pending',
    result: null,
  }));

  return plan;
}
