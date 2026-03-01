import { useState, useEffect } from 'react';
import { Repository, RepositoryConfig } from './types';
import { useGAS } from './hooks/useGAS';
import RepositorySelector from './components/RepositorySelector';
import FileSelector from './components/FileSelector';
import MemoEditor from './components/MemoEditor';
import ErrorDisplay from './components/ErrorDisplay';

function App() {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [filePath, setFilePath] = useState('');
  const [commitTitle, setCommitTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { callGAS, error: gasError, clearError } = useGAS();

  // テーマの初期化と同期
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = theme === 'dark' || (!theme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // システムテーマの変更を監視
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 保存済みのリポジトリとファイル設定を読み込む
  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        const configs = await callGAS<RepositoryConfig[]>('loadRepositoryConfig');
        if (configs && configs.length > 0) {
          // 最新の設定（最後の要素）を使用
          const latestConfig = configs[configs.length - 1];
          
          // リポジトリ一覧を取得して、実際のリポジトリ情報を取得
          try {
            const repos = await callGAS<Repository[]>('getRepositories');
            const foundRepo = repos?.find(
              (r) => r.owner.login === latestConfig.owner && r.name === latestConfig.repo
            );
            
            if (foundRepo) {
              setRepository(foundRepo);
              setFilePath(latestConfig.filePath);
            } else {
              // リポジトリが見つからない場合は、一時的なリポジトリオブジェクトを作成
              const repo: Repository = {
                id: 0,
                name: latestConfig.repo,
                full_name: `${latestConfig.owner}/${latestConfig.repo}`,
                owner: {
                  login: latestConfig.owner,
                },
              };
              setRepository(repo);
              setFilePath(latestConfig.filePath);
            }
          } catch (repoError) {
            // リポジトリ一覧の取得に失敗した場合は、一時的なリポジトリオブジェクトを作成
            const repo: Repository = {
              id: 0,
              name: latestConfig.repo,
              full_name: `${latestConfig.owner}/${latestConfig.repo}`,
              owner: {
                login: latestConfig.owner,
              },
            };
            setRepository(repo);
            setFilePath(latestConfig.filePath);
          }
        }
      } catch (error) {
        // エラーは無視（スプレッドシートが設定されていない場合など）
        console.warn('Failed to load repository config:', error);
      }
    };
    
    loadSavedConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 成功メッセージを自動で非表示
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  const handleSubmit = async () => {
    if (!repository) {
      setSubmitError('リポジトリを選択してください');
      return;
    }

    if (!filePath) {
      setSubmitError('ファイルを選択してください');
      return;
    }

    if (!content.trim()) {
      setSubmitError('本文を入力してください');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    clearError();

    try {
      await callGAS(
        'updateFile',
        repository.owner.login,
        repository.name,
        filePath,
        content,
        commitTitle
      );

      // 成功時の処理
      setSubmitSuccess(true);
      setContent('');
      setCommitTitle('');
      
      // スプレッドシートに設定を保存（オプション）
      if (repository && filePath) {
        try {
          await callGAS(
            'saveRepositoryConfig',
            repository.owner.login,
            repository.name,
            filePath
          );
        } catch (err) {
          // スプレッドシート保存の失敗は無視（localStorageに保存済み）
          console.warn('Failed to save config to spreadsheet:', err);
        }
      }
    } catch (error: any) {
      setSubmitError(
        error?.message || 'ファイルの更新に失敗しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              📘 GitHub Memo App
            </h1>
            <button
              type="button"
              onClick={() => {
                const newIsDark = !isDarkMode;
                setIsDarkMode(newIsDark);
                if (newIsDark) {
                  document.documentElement.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('theme', 'light');
                }
              }}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 
                         hover:bg-gray-200 dark:hover:bg-gray-600 
                         text-gray-700 dark:text-gray-300 transition-colors"
              title="テーマを切り替え"
            >
              {isDarkMode ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* エラー表示 */}
          {(gasError || submitError) && (
            <ErrorDisplay
              error={gasError || submitError}
              onDismiss={() => {
                clearError();
                setSubmitError(null);
              }}
            />
          )}

          {/* 成功メッセージ */}
          {submitSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 
                            rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-green-400 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-green-800 dark:text-green-200">
                  ファイルの更新に成功しました！
                </p>
              </div>
            </div>
          )}

          {/* フォーム */}
          <div className="space-y-6">
            {/* リポジトリ選択 */}
            <RepositorySelector
              value={repository}
              onChange={setRepository}
            />

            {/* ファイル選択 */}
            <FileSelector
              repository={repository}
              value={filePath}
              onChange={setFilePath}
            />

            {/* メモ編集 */}
            <MemoEditor
              commitTitle={commitTitle}
              content={content}
              onCommitTitleChange={setCommitTitle}
              onContentChange={setContent}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />

            {/* 送信ボタン */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !repository ||
                  !filePath ||
                  !content.trim()
                }
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 
                           dark:bg-blue-500 dark:hover:bg-blue-600
                           text-white font-semibold rounded-lg
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    保存中...
                  </span>
                ) : (
                  'GitHubに保存'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
