/**
 * Google Workspace Integration Service
 * Interacts with Google Tasks, Google Drive, and Google Keep
 * using the client-provided Google Workspace Bearer token.
 */

// Google Tasks API
export interface GoogleTask {
  id?: string;
  title: string;
  notes?: string;
  status?: 'needsAction' | 'completed';
  due?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
}

export async function listTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Tasks API list lists error (${response.status}): ${err}`);
  }
  const data = await response.json();
  return data.items || [];
}

export async function createTaskList(accessToken: string, title: string): Promise<GoogleTaskList> {
  const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Tasks API create list error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function createGoogleTask(
  accessToken: string,
  taskListId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task.title,
      notes: task.notes,
      due: task.due,
      status: 'needsAction',
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Tasks API create task error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function updateGoogleTaskStatus(
  accessToken: string,
  taskListId: string,
  taskId: string,
  completed: boolean
): Promise<GoogleTask> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction',
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Tasks API update task error (${response.status}): ${err}`);
  }
  return response.json();
}

// Google Drive API
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
}

export async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFile> {
  // Query existing folder
  const query = parentFolderId
    ? `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`
    : `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0];
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Google Drive create folder error (${createRes.status}): ${err}`);
  }

  return createRes.json();
}

export async function uploadDriveMarkdownFile(
  accessToken: string,
  fileName: string,
  content: string,
  parentFolderId?: string
): Promise<DriveFile> {
  const metadata = {
    name: fileName,
    mimeType: 'text/markdown',
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  // Multipart upload
  const boundary = '-------OctoAgentDriveUploadBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/markdown\r\n\r\n' +
    content +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Google Drive upload error (${uploadRes.status}): ${err}`);
  }

  return uploadRes.json();
}

// Google Keep API status check
export async function testGoogleKeepAccess(accessToken: string): Promise<{
  supported: boolean;
  message: string;
}> {
  try {
    const res = await fetch('https://keep.googleapis.com/v1/notes?pageSize=1', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      return {
        supported: true,
        message: 'Google Keep API connected and active.',
      };
    }
    if (res.status === 403) {
      return {
        supported: false,
        message:
          'Google Keep API is restricted to enterprise accounts with domain-wide delegation. Personal development notes are safely archived in Firestore and Google Drive.',
      };
    }
    return {
      supported: false,
      message: `Google Keep API returned status ${res.status}: Not available for current consumer account.`,
    };
  } catch (err: any) {
    return {
      supported: false,
      message: `Google Keep check failed: ${err.message}`,
    };
  }
}
