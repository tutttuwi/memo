/**
 * GitHub Memo App - Google Apps Script
 * 
 * GitHub APIを使用してリポジトリとファイルを管理するGASアプリケーション
 */

/**
 * Spreadsheetアクセス許可確認用関数
 */
function authorizeSpreadsheet() {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (spreadsheetId) {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    Logger.log('権限が正常に承認されました');
    }
}


/**
 * Webアプリケーションのエントリーポイント
 * HTMLファイルを返す
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('gas/index')
    .setTitle('GitHub Memo App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * POSTリクエストのエントリーポイント
 * スマホショートカットなどから呼び出されるAPI
 * 
 * リクエスト例:
 * POST /exec
 * {
 *   "key": "your_secret_key",
 *   "url": "https://example.com",
 *   "title": "記事タイトル（任意）",
 *   "comment": "コメント（任意）",
 *   "owner": "username（任意、デフォルト設定を使用）",
 *   "repo": "reponame（任意、デフォルト設定を使用）",
 *   "path": "file.md（任意、デフォルト設定を使用）"
 * }
 */
function doPost(e) {
  try {
    // リクエストデータの取得
    let requestData;
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else {
      // URLパラメータからも取得可能（GET互換）
      requestData = {
        key: e.parameter.key,
        url: e.parameter.url,
        title: e.parameter.title,
        comment: e.parameter.comment,
        owner: e.parameter.owner,
        repo: e.parameter.repo,
        path: e.parameter.path
      };
    }
    
    // セキュリティキーの検証
    const secretKey = PropertiesService.getScriptProperties().getProperty('API_SECRET_KEY');
    if (secretKey && requestData.key !== secretKey) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid API key'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // URLは必須
    if (!requestData.url) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'URL is required'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // デフォルト設定の取得
    const defaultOwner = PropertiesService.getScriptProperties().getProperty('DEFAULT_OWNER');
    const defaultRepo = PropertiesService.getScriptProperties().getProperty('DEFAULT_REPO');
    const defaultPath = PropertiesService.getScriptProperties().getProperty('DEFAULT_PATH') || 'links.md';
    
    // リポジトリ情報の決定
    const owner = requestData.owner || defaultOwner;
    const repo = requestData.repo || defaultRepo;
    const path = requestData.path || defaultPath;
    
    if (!owner || !repo) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Repository information is required. Set DEFAULT_OWNER and DEFAULT_REPO in ScriptProperties, or provide owner and repo in the request.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // コンテンツの生成
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
    
    let content = '';
    
    // タイトルがある場合は見出しとして追加
    if (requestData.title) {
      content += `## ${requestData.title}\n\n`;
    }
    
    // URLを追加
    content += `- [${requestData.url}](${requestData.url})\n`;
    
    // コメントがある場合は追加
    if (requestData.comment) {
      content += `  ${requestData.comment}\n`;
    }
    
    // 日付を追加
    content += `  - ${formattedDate}\n\n`;
    
    // ファイルに追記
    const commitTitle = requestData.title || 'Add link from mobile';
    updateFile(owner, repo, path, content, commitTitle);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'File updated successfully',
      owner: owner,
      repo: repo,
      path: path
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GitHub APIのベースURL
 */
const GITHUB_API_BASE = 'https://api.github.com';

/**
 * GitHub API用のヘッダーを取得
 */
function getGitHubHeaders() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('GITHUB_TOKENが設定されていません。ScriptPropertiesで設定してください。');
  }

  return {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

/**
 * GitHub APIリクエストを実行
 */
function fetchGitHubAPI(url, options = {}) {
  const headers = getGitHubHeaders();
  const response = UrlFetchApp.fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  const statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    const errorText = response.getContentText();
    let errorMessage = 'GitHub APIエラー';
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      errorMessage = `HTTP ${statusCode}: ${errorText}`;
    }
    throw new Error(errorMessage);
  }

  return JSON.parse(response.getContentText());
}

/**
 * 認証ユーザーのリポジトリ一覧を取得
 */
function getRepositories() {
  try {
    const url = `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`;
    const repos = fetchGitHubAPI(url);
    
    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: {
        login: repo.owner.login
      }
    }));
  } catch (error) {
    throw new Error('リポジトリ一覧の取得に失敗しました: ' + error.message);
  }
}

/**
 * リポジトリ内のファイル一覧を取得
 * @param {string} owner - リポジトリオーナー
 * @param {string} repo - リポジトリ名
 * @param {string} path - パス（デフォルト: ルート）
 */
function getFiles(owner, repo, path = '') {
  try {
    const encodedPath = encodeURIComponent(path || '');
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodedPath}`;
    const contents = fetchGitHubAPI(url);
    
    // 配列でない場合は配列に変換
    const items = Array.isArray(contents) ? contents : [contents];
    
    return items.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type,
      sha: item.sha
    }));
  } catch (error) {
    throw new Error('ファイル一覧の取得に失敗しました: ' + error.message);
  }
}

/**
 * ファイルの内容を取得
 * @param {string} owner - リポジトリオーナー
 * @param {string} repo - リポジトリ名
 * @param {string} path - ファイルパス
 */
function getFileContent(owner, repo, path) {
  try {
    const encodedPath = encodeURIComponent(path);
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodedPath}`;
    const data = fetchGitHubAPI(url);
    
    // Base64デコード
    const content = Utilities.newBlob(
      Utilities.base64Decode(data.content)
    ).getDataAsString('UTF-8');
    
    return {
      content: content,
      sha: data.sha
    };
  } catch (error) {
    throw new Error('ファイル内容の取得に失敗しました: ' + error.message);
  }
}

/**
 * ファイルを更新
 * @param {string} owner - リポジトリオーナー
 * @param {string} repo - リポジトリ名
 * @param {string} path - ファイルパス
 * @param {string} content - 追加するコンテンツ
 * @param {string} commitTitle - コミットタイトル（任意）
 */
function updateFile(owner, repo, path, content, commitTitle) {
  try {
    // 既存ファイルを取得
    let existingContent = '';
    let sha = null;
    
    try {
      const fileData = getFileContent(owner, repo, path);
      existingContent = fileData.content;
      sha = fileData.sha;
    } catch (error) {
      // ファイルが存在しない場合は新規作成
      existingContent = '';
    }
    
    // 日付生成
    const now = new Date();
    const formatted = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
    
    // 新しいエントリを追加
    const newEntry = `\n## ${formatted}\n\n${content}\n`;
    const updatedContent = existingContent + newEntry;
    
    // Base64エンコード（UTF-8明示）
    const encodedContent = Utilities.base64Encode(
      Utilities.newBlob(updatedContent, 'text/plain', 'UTF-8').getBytes()
    );
    
    // コミットメッセージ生成
    const safeTitle = commitTitle ? commitTitle.trim() : '';
    const commitMessage = safeTitle 
      ? `upd: ${safeTitle} - [${path}]`
      : `upd: from gas - [${path}]`;
    
    // APIリクエスト
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const payload = {
      message: commitMessage,
      content: encodedContent
    };
    
    // SHAが存在する場合は更新、存在しない場合は新規作成
    if (sha) {
      payload.sha = sha;
    }
    
    fetchGitHubAPI(url, {
      method: 'put',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
    
    return '更新成功！';
  } catch (error) {
    throw new Error('ファイルの更新に失敗しました: ' + error.message);
  }
}

/**
 * スプレッドシートIDを取得
 */
function getSpreadsheetId() {
  return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
}

/**
 * リポジトリ設定をスプレッドシートに保存
 * @param {string} owner - リポジトリオーナー
 * @param {string} repo - リポジトリ名
 * @param {string} filePath - ファイルパス
 */
function saveRepositoryConfig(owner, repo, filePath) {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    // スプレッドシートが設定されていない場合は何もしない
    return;
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let sheet = spreadsheet.getSheetByName('RepositoryConfig');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = spreadsheet.insertSheet('RepositoryConfig');
      sheet.appendRow(['Owner', 'Repo', 'FilePath', 'Updated']);
    }
    
    // 既存の設定を確認
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === owner && data[i][1] === repo && data[i][2] === filePath) {
        // 既存の設定を更新
        sheet.getRange(i + 1, 4).setValue(new Date());
        found = true;
        break;
      }
    }
    
    // 新規設定を追加
    if (!found) {
      sheet.appendRow([owner, repo, filePath, new Date()]);
    }
    
    return '設定を保存しました';
  } catch (error) {
    throw new Error('スプレッドシートへの保存に失敗しました: ' + error.message);
  }
}

/**
 * スプレッドシートからリポジトリ設定を読み込み
 */
function loadRepositoryConfig() {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    return [];
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('RepositoryConfig');
    
    if (!sheet) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return [];
    }
    
    // ヘッダーを除いて設定を返す
    const configs = [];
    for (let i = 1; i < data.length; i++) {
      configs.push({
        owner: data[i][0],
        repo: data[i][1],
        filePath: data[i][2]
      });
    }
    
    return configs;
  } catch (error) {
    throw new Error('スプレッドシートからの読み込みに失敗しました: ' + error.message);
  }
}
