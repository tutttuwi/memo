/**
 * GitHub Memo App - Google Apps Script (API)
 * 
 * 外部公開API用のGASプロジェクト
 * スマホショートカットなどから呼び出されるAPIエンドポイント
 */

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
    
    // タイトルの取得（指定されていない場合はURLから取得）
    let title = requestData.title;
    if (!title) {
      try {
        title = fetchPageTitle(requestData.url);
      } catch (error) {
        // タイトル取得に失敗した場合は空のまま
        Logger.log('タイトル取得エラー: ' + error.message);
      }
    }
    
    // コンテンツの生成
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
    
    let content = '';
    
    // URLを追加（タイトルがある場合はタイトルをリンクの表示テキストとして使用）
    const linkText = title || requestData.url;
    content += `- [${linkText}](${requestData.url})\n`;
    
    // コメントがある場合は追加
    if (requestData.comment) {
      content += `  ${requestData.comment}\n`;
    }
    
    // 日付を追加
    content += `  - ${formattedDate}\n`;
    
    // ファイルに追記
    const commitTitle = title || 'Add link from mobile';
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
 * URLからページのタイトルを取得
 * @param {string} url - 取得するURL
 * @return {string} ページのタイトル（取得できない場合は空文字列）
 */
function fetchPageTitle(url) {
  try {
    // URLを取得（タイムアウト30秒、最大10MB）
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false
    });
    
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`HTTP ${statusCode}: ページの取得に失敗しました`);
    }
    
    // HTMLコンテンツを取得
    const html = response.getContentText('UTF-8');
    
    // <title>タグを抽出（大文字小文字を区別しない）
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      let title = titleMatch[1].trim();
      
      // HTMLエンティティをデコード
      title = title.replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&amp;/g, '&')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'")
                   .replace(/&nbsp;/g, ' ');
      
      // 改行やタブを削除
      title = title.replace(/[\r\n\t]+/g, ' ').trim();
      
      // 長すぎる場合は切り詰め（200文字まで）
      if (title.length > 200) {
        title = title.substring(0, 200) + '...';
      }
      
      return title || '';
    }
    
    return '';
  } catch (error) {
    Logger.log('タイトル取得エラー: ' + error.message);
    throw new Error('ページタイトルの取得に失敗しました: ' + error.message);
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
    // const now = new Date();
    // const formatted = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
    
    // 新しいエントリを追加
    const newEntry = `${content}\n`;
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
