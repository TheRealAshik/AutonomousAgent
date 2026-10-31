/**
 * GitHub API Service
 * Interacts with the official GitHub REST API and Git Database API
 * Supports repository exploration, file inspection, atomic multi-file commits,
 * and PR creation.
 */

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string | null;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepoSummary {
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

export interface GitHubFileItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  type: 'file' | 'dir';
}

export interface GitHubCommitItem {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
  created_at: string;
  updated_at: string;
}

async function githubFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE}${endpoint}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'OctoAgent-AI-Development-Platform',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    throw new Error('GitHub authentication failed: Personal Access Token is invalid or expired.');
  }

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining === '0') {
      const resetTime = response.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString() : 'shortly';
      throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}.`);
    }
    const errorBody = await response.text();
    throw new Error(`GitHub permission denied: ${errorBody || 'Token lacks required scopes for this resource.'}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `GitHub API request failed (${response.status}): ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message) msg = `GitHub API: ${parsed.message}`;
    } catch {
      if (errorText) msg += ` - ${errorText}`;
    }
    throw new Error(msg);
  }

  // If response is 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export async function validateToken(token: string): Promise<{
  user: GitHubUser;
  scopes: string;
}> {
  const url = `${GITHUB_API_BASE}/user`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'OctoAgent-AI-Development-Platform',
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid GitHub Personal Access Token. Please check token permissions.');
    }
    throw new Error(`GitHub Token validation failed with status ${response.status}`);
  }

  const scopes = response.headers.get('x-oauth-scopes') || 'repo,read:org';
  const user = (await response.json()) as GitHubUser;
  return { user, scopes };
}

export async function listUserRepositories(token: string): Promise<GitHubRepoSummary[]> {
  // Sort by recently updated
  return githubFetch<GitHubRepoSummary[]>(
    '/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator,organization_member',
    token
  );
}

export async function getRepository(token: string, owner: string, repo: string): Promise<GitHubRepoSummary> {
  return githubFetch<GitHubRepoSummary>(`/repos/${owner}/${repo}`, token);
}

export async function getBranches(token: string, owner: string, repo: string): Promise<{ name: string; commit: { sha: string } }[]> {
  return githubFetch<{ name: string; commit: { sha: string } }[]>(`/repos/${owner}/${repo}/branches?per_page=100`, token);
}

export async function getDirectory(
  token: string,
  owner: string,
  repo: string,
  path = '',
  ref?: string
): Promise<GitHubFileItem[]> {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return githubFetch<GitHubFileItem[]>(`/repos/${owner}/${repo}/contents/${cleanPath}${query}`, token);
}

export async function getFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<{ path: string; content: string; sha: string; size: number }> {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const data = await githubFetch<{
    path: string;
    sha: string;
    size: number;
    encoding?: string;
    content?: string;
  }>(`/repos/${owner}/${repo}/contents/${cleanPath}${query}`, token);

  let decodedContent = '';
  if (data.content && data.encoding === 'base64') {
    decodedContent = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  } else if (data.content) {
    decodedContent = data.content;
  }

  return {
    path: data.path,
    content: decodedContent,
    sha: data.sha,
    size: data.size,
  };
}

export async function searchCode(
  token: string,
  owner: string,
  repo: string,
  query: string
): Promise<{ total_count: number; items: { name: string; path: string; html_url: string }[] }> {
  const q = encodeURIComponent(`${query} repo:${owner}/${repo}`);
  return githubFetch(`/search/code?q=${q}&per_page=20`, token);
}

export async function getCommits(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
  limit = 15
): Promise<GitHubCommitItem[]> {
  const query = branch ? `?sha=${encodeURIComponent(branch)}&per_page=${limit}` : `?per_page=${limit}`;
  return githubFetch<GitHubCommitItem[]>(`/repos/${owner}/${repo}/commits${query}`, token);
}

export async function getIssues(
  token: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<any[]> {
  return githubFetch<any[]>(`/repos/${owner}/${repo}/issues?state=${state}&per_page=20`, token);
}

export async function getPullRequests(
  token: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'all'
): Promise<any[]> {
  return githubFetch<any[]>(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`, token);
}

export async function getWorkflowRuns(token: string, owner: string, repo: string): Promise<GitHubWorkflowRun[]> {
  try {
    const data = await githubFetch<{ workflow_runs: GitHubWorkflowRun[] }>(
      `/repos/${owner}/${repo}/actions/runs?per_page=10`,
      token
    );
    return data.workflow_runs || [];
  } catch {
    // Actions might be disabled or have no runs
    return [];
  }
}

/**
 * Creates a dedicated agent branch from a base branch (usually default branch)
 */
export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  newBranchName: string,
  fromBranch?: string
): Promise<{ ref: string; sha: string }> {
  // If fromBranch is not provided, get the default branch
  let baseBranch = fromBranch;
  if (!baseBranch) {
    const repoInfo = await getRepository(token, owner, repo);
    baseBranch = repoInfo.default_branch;
  }

  // Get SHA of base branch
  const refData = await githubFetch<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    token
  );
  const baseSha = refData.object.sha;

  // Create new ref
  const newRef = await githubFetch<{ ref: string; object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/refs`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${newBranchName}`,
        sha: baseSha,
      }),
    }
  );

  return { ref: newRef.ref, sha: newRef.object.sha };
}

/**
 * Creates an atomic commit updating or adding multiple files on a branch
 * using the GitHub Git Database API (blobs -> tree -> commit -> update ref)
 */
export async function createOrUpdateFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: { path: string; content: string }[],
  commitMessage: string
): Promise<{ commitSha: string; htmlUrl: string }> {
  if (files.length === 0) {
    throw new Error('No files provided for commit.');
  }

  // 1. Get the current commit SHA of the branch
  const branchRef = await githubFetch<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    token
  );
  const parentCommitSha = branchRef.object.sha;

  // 2. Get the commit to find the tree SHA
  const parentCommit = await githubFetch<{ tree: { sha: string } }>(
    `/repos/${owner}/${repo}/git/commits/${parentCommitSha}`,
    token
  );
  const baseTreeSha = parentCommit.tree.sha;

  // 3. Create blobs for each file
  const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
  for (const file of files) {
    const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
    const blob = await githubFetch<{ sha: string }>(
      `/repos/${owner}/${repo}/git/blobs`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        }),
      }
    );

    treeItems.push({
      path: cleanPath,
      mode: '100644', // standard file mode
      type: 'blob',
      sha: blob.sha,
    });
  }

  // 4. Create new tree
  const newTree = await githubFetch<{ sha: string }>(
    `/repos/${owner}/${repo}/git/trees`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    }
  );

  // 5. Create new commit
  const newCommit = await githubFetch<{ sha: string; html_url: string }>(
    `/repos/${owner}/${repo}/git/commits`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage,
        tree: newTree.sha,
        parents: [parentCommitSha],
      }),
    }
  );

  // 6. Update reference
  await githubFetch(
    `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false,
      }),
    }
  );

  return {
    commitSha: newCommit.sha,
    htmlUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
  };
}

/**
 * Creates a Pull Request from agent branch to base branch
 */
export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
): Promise<{ number: number; html_url: string; state: string }> {
  return githubFetch<{ number: number; html_url: string; state: string }>(
    `/repos/${owner}/${repo}/pulls`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    }
  );
}
