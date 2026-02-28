const OWNER = "tutttuwi";
const REPO = "output";

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index");
}

function submitForm(category, content, commitTitle) {

  const GITHUB_TOKEN = PropertiesService
    .getScriptProperties()
    .getProperty("GITHUB_TOKEN");

  const fileMap = {
    "english": "src/content/posts/memo_english.md",
    "it": "src/content/posts/memo_it.md"
  };

  const path = fileMap[category];
  if (!path) throw new Error("Invalid category");

  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

  const headers = {
    Authorization: "Bearer " + GITHUB_TOKEN,
    Accept: "application/vnd.github+json"
  };

  // 既存ファイル取得
  const response = UrlFetchApp.fetch(apiUrl, { headers });
  const data = JSON.parse(response.getContentText());

  const existingContent = Utilities.newBlob(
    Utilities.base64Decode(data.content)
  ).getDataAsString("UTF-8");

  // 日付生成
  const now = new Date();
  const formatted =
    Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd HH:mm");

  const newEntry = `\n## ${formatted}\n\n${content}\n`;

  const updatedContent = existingContent + newEntry;

  // ✅ UTF-8明示でエンコード（重要）
  const encodedContent = Utilities.base64Encode(
    Utilities.newBlob(updatedContent, "text/plain", "UTF-8").getBytes()
  );

  // ✅ commit message生成
  const safeTitle = commitTitle ? commitTitle.trim() : "";
  const commitMessage = `upd: from gas - [${category}] ${safeTitle}`;

  const payload = {
    message: commitMessage,
    content: encodedContent,
    sha: data.sha
  };

  UrlFetchApp.fetch(apiUrl, {
    method: "put",
    headers,
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });

  return "更新成功！";
}