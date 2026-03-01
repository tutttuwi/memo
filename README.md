# GitHub Memo App

Google Apps Script (GAS) と React を使用した、GitHubリポジトリにメモを追加できるWebアプリケーションです。

## 機能概要

- **リポジトリ選択**: GitHub API経由でリポジトリ一覧を取得し、検索機能付きで選択可能
- **ファイル選択**: 選択したリポジトリ内のファイル一覧を取得し、検索機能付きで選択可能
- **メモ追加**: Markdown形式でメモを記入し、リアルタイムプレビューを表示
- **自動保存**: 選択したリポジトリ/ファイル設定をlocalStorageまたはスプレッドシートに保存
- **下書き機能**: 入力中の内容をlocalStorageに自動保存
- **レスポンシブデザイン**: スマートフォンでも使いやすいUI

## 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - ビルドツール
- **Tailwind CSS** - スタイリング
- **Marked** - Markdownパーサー

### バックエンド
- **Google Apps Script** - サーバーサイドロジック
- **GitHub REST API** - リポジトリ・ファイル管理

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd memo
```

### 2. フロントエンドのセットアップ

```bash
cd frontend
npm install
```

### 3. フロントエンドのビルド

```bash
npm run build
```

ビルド成果物は `gas/` ディレクトリに出力されます。
**注意**: すべてのJavaScriptとCSSは `index.html` にインライン化され、単一ファイルとして出力されます。GAS環境では外部アセットファイルにアクセスできないため、この構成になっています。

### 4. Google Apps Script プロジェクトの作成

1. [Google Apps Script](https://script.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名を設定（例: "GitHub Memo App"）

### 5. clasp のセットアップ

```bash
# clasp をインストール（未インストールの場合）
npm install -g @google/clasp

# Google Apps Script にログイン
clasp login

# プロジェクトを初期化（既存のGASプロジェクトIDを指定）
clasp create --type webapp --title "GitHub Memo App"
# または既存プロジェクトに接続
clasp clone <SCRIPT_ID>
```

### 6. GASプロジェクトへのデプロイ

```bash
# プロジェクトルートで実行
clasp push
```

### 7. GAS設定

#### ScriptProperties の設定

GASエディタで以下のプロパティを設定します：

1. **GITHUB_TOKEN** (必須)
   - GitHub Personal Access Token を設定
   - 権限: `repo` (リポジトリへのフルアクセス)

2. **SPREADSHEET_ID** (任意)
   - 設定を保存するスプレッドシートのID
   - 設定しない場合はlocalStorageのみ使用

3. **API_SECRET_KEY** (推奨)
   - スマホショートカット経由のAPI呼び出しを保護するための秘密鍵
   - ランダムな文字列を生成して設定（例: `openssl rand -hex 32`）

4. **DEFAULT_OWNER** (スマホショートカット用)
   - デフォルトのGitHubユーザー名または組織名
   - ショートカットから呼び出す際に毎回指定する必要がなくなります

5. **DEFAULT_REPO** (スマホショートカット用)
   - デフォルトのリポジトリ名
   - ショートカットから呼び出す際に毎回指定する必要がなくなります

6. **DEFAULT_PATH** (スマホショートカット用、任意)
   - デフォルトのファイルパス（例: `links.md`）
   - 未設定の場合は `links.md` が使用されます

設定方法：
```javascript
// GASエディタで実行
function setProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'GITHUB_TOKEN': 'your_github_token_here',
    'SPREADSHEET_ID': 'your_spreadsheet_id_here', // 任意
    'API_SECRET_KEY': 'your_random_secret_key_here', // 推奨（セキュリティのため）
    'DEFAULT_OWNER': 'your_username', // スマホショートカット用
    'DEFAULT_REPO': 'your_repo_name', // スマホショートカット用
    'DEFAULT_PATH': 'links.md' // スマホショートカット用（任意）
  });
}
```

#### GitHub Personal Access Token の作成

1. GitHub にログイン
2. Settings > Developer settings > Personal access tokens > Tokens (classic)
3. "Generate new token (classic)" をクリック
4. 必要な権限を選択：
   - `repo` - リポジトリへのフルアクセス
5. トークンを生成し、コピー
6. GASのScriptPropertiesに設定

### 8. Webアプリケーションとして公開

1. GASエディタで「公開」>「ウェブアプリケーションとして公開」
2. 実行ユーザーを「自分」に設定
3. アクセス権限を「全員（匿名ユーザーを含む）」に設定
4. 「公開」をクリック
5. 表示されたURLをコピー
   - URLの形式: `https://script.google.com/macros/s/XXXX/exec`
   - このURLは後でスマホショートカットで使用します

## スマホショートカット経由での利用

スマートフォンから「共有」機能を使って、任意のURLや情報をGitHubリポジトリに追記できます。

### 全体構成

```
スマホ（共有）
   ↓
ショートカットアプリ（iOS/Android）
   ↓
GAS API（POST）
   ↓
GitHub REST API
   ↓
リポジトリ更新
```

### iOS（iPhone）での設定手順

#### 1. ショートカットアプリの準備

1. iPhoneの「ショートカット」アプリを開く
2. 「+」ボタンで新しいショートカットを作成
3. ショートカット名を設定（例: 「GitHubに保存」）

#### 2. 入力タイプの設定

1. 「入力」セクションで「共有シートで表示」をONにする
2. 「入力タイプを許可」で「URL」を選択
3. 必要に応じて「テキスト」も選択（コメント入力用）

#### 3. アクションの追加

以下のアクションを順番に追加します：

**方法A: POSTメソッドを使用（推奨）**

**① URLの内容を取得（POST）**
- アクション: 「URLの内容を取得」
- メソッド: `POST`
- URL: 以下の形式で設定
  ```
  https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
  ```
  - `YOUR_SCRIPT_ID`: GASのWebアプリURLから取得したスクリプトID
- リクエスト本文: `JSON`形式で設定
  ```json
  {
    "key": "YOUR_SECRET_KEY",
    "url": "[ショートカット入力]"
  }
  ```
  - `YOUR_SECRET_KEY`: ScriptPropertiesで設定した`API_SECRET_KEY`
  - `[ショートカット入力]`: 変数として「ショートカット入力」を選択
- ヘッダー: `Content-Type: application/json`（自動設定される場合があります）

**方法B: GETメソッドを使用（シンプル）**

**① URLの内容を取得（GET）**
- アクション: 「URLの内容を取得」
- メソッド: `GET`
- URL: 以下の形式で設定
  ```
  https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?key=YOUR_SECRET_KEY&url=[ショートカット入力]
  ```
  - `YOUR_SCRIPT_ID`: GASのWebアプリURLから取得したスクリプトID
  - `YOUR_SECRET_KEY`: ScriptPropertiesで設定した`API_SECRET_KEY`
  - `[ショートカット入力]`: 変数として「ショートカット入力」を選択

**② 結果の表示（任意）**
- アクション: 「結果を表示」
- 成功メッセージを表示する場合に追加

**補足**: POSTメソッドの方が推奨される理由
- セキュリティ: URLにパラメータが表示されない（ブラウザ履歴に残らない）
- データ量: より多くのデータを送信可能
- 形式: JSON形式で構造化されたデータを送信可能

#### 4. ショートカットの完成例

**POSTメソッドを使用する場合：**

```
1. 入力を受け取る（URL）
2. URLの内容を取得
   - URL: https://script.google.com/macros/s/XXXX/exec
   - メソッド: POST
   - リクエスト本文: JSON
     {
       "key": "xxxxx",
       "url": "[ショートカット入力]"
     }
3. 結果を表示（任意）
```

**GETメソッドを使用する場合：**

```
1. 入力を受け取る（URL）
2. URLの内容を取得
   - URL: https://script.google.com/macros/s/XXXX/exec?key=xxxxx&url=[ショートカット入力]
   - メソッド: GET
3. 結果を表示（任意）
```

#### 5. 使い方

1. Safariやその他のアプリでURLを開く
2. 「共有」ボタンをタップ
3. 「GitHubに保存」ショートカットを選択
4. 自動的にGitHubリポジトリに追記されます

### Androidでの設定手順

Androidでは「ショートカット」アプリの代わりに、以下の方法が利用できます：

#### 方法1: Tasker（有料アプリ）を使用

1. Taskerをインストール
2. 新しいタスクを作成
3. HTTP Requestアクションを追加
4. GASのURLを設定

#### 方法2: 共有メニューから直接URLを開く

1. ブラウザで以下のURLをブックマークに追加：
   ```
   https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?key=YOUR_SECRET_KEY&url=
   ```
2. 共有したいURLをコピー
3. ブックマークを開き、URLの後に貼り付け

### API仕様

#### エンドポイント

```
POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

または

```
GET https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?key=xxx&url=xxx
```

#### リクエストパラメータ

| パラメータ | 必須 | 説明                                                          |
| ---------- | ---- | ------------------------------------------------------------- |
| `key`      | 推奨 | API_SECRET_KEY（ScriptPropertiesで設定）                      |
| `url`      | 必須 | 保存したいURL                                                 |
| `title`    | 任意 | 記事のタイトル                                                |
| `comment`  | 任意 | コメント                                                      |
| `owner`    | 任意 | GitHubユーザー名（DEFAULT_OWNERが設定されていない場合は必須） |
| `repo`     | 任意 | リポジトリ名（DEFAULT_REPOが設定されていない場合は必須）      |
| `path`     | 任意 | ファイルパス（デフォルト: `links.md`）                        |

#### リクエスト例（POST）

```json
{
  "key": "your_secret_key",
  "url": "https://example.com/article",
  "title": "素晴らしい記事",
  "comment": "後で読む",
  "owner": "username",
  "repo": "repo-name",
  "path": "links.md"
}
```

#### リクエスト例（POST - 推奨）

```bash
curl -X POST https://script.google.com/macros/s/XXXX/exec \
  -H "Content-Type: application/json" \
  -d '{
    "key": "your_secret_key",
    "url": "https://example.com/article",
    "title": "素晴らしい記事",
    "comment": "後で読む"
  }'
```

#### リクエスト例（GET - シンプル）

```
https://script.google.com/macros/s/XXXX/exec?key=xxxxx&url=https://example.com&title=記事タイトル&comment=コメント
```

**注意**: GETメソッドの場合、URLの長さ制限（約2000文字）に注意してください。長いデータを送信する場合はPOSTメソッドを使用してください。

#### レスポンス

成功時：
```json
{
  "success": true,
  "message": "File updated successfully",
  "owner": "username",
  "repo": "repo-name",
  "path": "links.md"
}
```

エラー時：
```json
{
  "success": false,
  "error": "Error message"
}
```

#### 保存される形式

GitHubファイルには以下の形式で追記されます：

```markdown
## 記事タイトル（titleがある場合）

- [https://example.com](https://example.com)
  コメント（commentがある場合）
  - 2026-03-01 12:34

```

### セキュリティに関する注意事項

⚠️ **重要**: Webアプリを「全員（匿名ユーザーを含む）」に公開する場合、必ず`API_SECRET_KEY`を設定してください。

- `API_SECRET_KEY`を設定しないと、誰でもAPIを呼び出せてしまいます
- 秘密鍵は推測困難なランダムな文字列にしてください
- 例: `openssl rand -hex 32` で生成した文字列

### トラブルシューティング（スマホショートカット）

#### エラー: "Invalid API key"
- ScriptPropertiesで`API_SECRET_KEY`が正しく設定されているか確認
- ショートカットのURLに`key`パラメータが正しく含まれているか確認

#### エラー: "Repository information is required"
- ScriptPropertiesで`DEFAULT_OWNER`と`DEFAULT_REPO`が設定されているか確認
- または、リクエストに`owner`と`repo`パラメータを含める

#### エラー: "URL is required"
- ショートカットの入力タイプで「URL」が選択されているか確認
- 共有元のアプリがURLを正しく渡しているか確認

#### ショートカットが共有シートに表示されない
- ショートカットの設定で「共有シートで表示」がONになっているか確認
- 入力タイプで「URL」が選択されているか確認

## 使い方

### 基本的な使い方

1. WebアプリケーションのURLにアクセス
2. **リポジトリ選択**: 検索ボックスでリポジトリを検索・選択
3. **ファイル選択**: 選択したリポジトリ内のファイルを検索・選択
4. **メモ入力**: 
   - コミットタイトル（任意）を入力
   - Markdown形式で本文を入力
   - リアルタイムでプレビューが表示されます
5. **保存**: 「GitHubに保存」ボタンをクリック、または `Ctrl + Enter` で送信

### 機能詳細

#### 検索機能
- リポジトリ選択とファイル選択の両方で検索可能
- リアルタイムでフィルタリング
- キーボード操作対応（矢印キー、Enter、Escape）

#### 自動保存
- 選択したリポジトリ/ファイルは自動的に保存されます
- 次回アクセス時に保存済みの設定が表示されます
- スプレッドシートIDが設定されている場合は、スプレッドシートにも保存されます

#### 下書き機能
- 入力中の内容は自動的にlocalStorageに保存されます
- ページを再読み込みしても内容が保持されます
- 「下書きをクリア」ボタンで削除可能

## プロジェクト構成

```
memo/
├── frontend/              # React + Vite アプリケーション
│   ├── src/
│   │   ├── components/    # Reactコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   ├── types/         # TypeScript型定義
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── gas/                   # Google Apps Script
│   ├── code.gs            # メインスクリプト
│   ├── appsscript.json    # GAS設定
│   └── index.html         # ビルド後のHTML（すべてのJS/CSSがインライン化された単一ファイル）
├── .claspignore          # clasp除外設定
├── .gitignore
└── README.md
```

## 開発

### フロントエンドの開発

```bash
cd frontend
npm run dev
```

開発サーバーが起動します（ただし、GAS環境での動作確認が必要です）。

### ビルドとデプロイ

```bash
# フロントエンドをビルド
cd frontend
npm run build

# GASにデプロイ
cd ..
clasp push
clasp deploy --deploymentId <deployid>

```

### ファイルの更新フロー

1. フロントエンドのコードを編集
2. `npm run build` でビルド
3. `clasp push` でGASにデプロイ
4. GASエディタで「公開」>「新しいバージョンを保存」

## トラブルシューティング

### GitHub APIエラー

- **認証エラー**: GITHUB_TOKENが正しく設定されているか確認
- **権限エラー**: GitHubトークンに必要な権限（`repo`）があるか確認
- **レート制限**: GitHub APIのレート制限に達している可能性があります

### GAS実行エラー

- **ScriptProperties未設定**: GITHUB_TOKENが設定されているか確認
- **スプレッドシートエラー**: SPREADSHEET_IDが正しいか、スプレッドシートへのアクセス権限があるか確認

### ビルドエラー

- **依存関係エラー**: `npm install` を再実行
- **TypeScriptエラー**: 型定義を確認

## ライセンス

このプロジェクトのライセンスは LICENSE ファイルを参照してください。

## 貢献

プルリクエストやイシューの報告を歓迎します。
