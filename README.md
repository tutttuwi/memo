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

設定方法：
```javascript
// GASエディタで実行
function setProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'GITHUB_TOKEN': 'your_github_token_here',
    'SPREADSHEET_ID': 'your_spreadsheet_id_here' // 任意
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
