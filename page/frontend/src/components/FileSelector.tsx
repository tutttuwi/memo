import React, { useEffect, useState } from 'react';
import { Repository, FileItem, RepositoryConfig } from '../types';
import { useGAS } from '../hooks/useGAS';
import { useLocalStorage } from '../hooks/useLocalStorage';
import SearchableSelect from './SearchableSelect';

interface FileSelectorProps {
  repository: Repository | null;
  value: string;
  onChange: (filePath: string) => void;
}

export default function FileSelector({
  repository,
  value,
  onChange,
}: FileSelectorProps) {
  const { callGAS, loading, error } = useGAS();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [savedConfigs, setSavedConfigs] = useLocalStorage<RepositoryConfig[]>(
    'savedFileConfigs',
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  // ファイル一覧を取得
  const loadFiles = async (owner: string, repo: string, path: string = '') => {
    if (!owner || !repo) return;
    
    setIsLoading(true);
    try {
      const fileList = await callGAS<FileItem[]>('getFiles', owner, repo, path);
      setFiles(fileList || []);
      setCurrentPath(path);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // リポジトリが変更されたらファイル一覧を取得
  useEffect(() => {
    if (repository) {
      loadFiles(repository.owner.login, repository.name, '');
      setCurrentPath('');
      setPathHistory([]);
    } else {
      setFiles([]);
      setCurrentPath('');
      setPathHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository]);

  // フォルダをクリックしたときの処理
  const handleFolderClick = (folderPath: string) => {
    if (!repository) return;
    setPathHistory([...pathHistory, currentPath]);
    loadFiles(repository.owner.login, repository.name, folderPath);
  };

  // パンくずリストのパス階層を生成
  const breadcrumbPaths = React.useMemo(() => {
    if (!currentPath) return [{ path: '', name: 'ルート' }];
    const parts = currentPath.split('/').filter(Boolean);
    const paths = [{ path: '', name: 'ルート' }];
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      paths.push({ path: current, name: part });
    }
    return paths;
  }, [currentPath]);

  // パンくずリストでパスをクリックしたときの処理
  const handleBreadcrumbClick = (targetPath: string) => {
    if (!repository) return;
    // クリックされたパスまでの履歴を保持
    const targetIndex = breadcrumbPaths.findIndex(p => p.path === targetPath);
    if (targetIndex >= 0) {
      const newHistory = pathHistory.slice(0, targetIndex);
      setPathHistory(newHistory);
      loadFiles(repository.owner.login, repository.name, targetPath);
    }
  };

  // 保存済み設定から現在のリポジトリに対応するファイルを取得
  const savedFilesForRepo = React.useMemo(() => {
    if (!repository) return [];
    
    return savedConfigs
      .filter(
        (config) =>
          config.owner === repository.owner.login &&
          config.repo === repository.name
      )
      .map((config) => ({
        name: config.filePath.split('/').pop() || config.filePath,
        path: config.filePath,
        type: 'file' as const,
      }));
  }, [repository, savedConfigs]);

  // すべてのファイル（取得したファイル + 保存済みファイル）をマージ
  const allFiles = React.useMemo(() => {
    const fileMap = new Map<string, FileItem>();
    
    // 保存済みファイルを追加
    savedFilesForRepo.forEach((file) => {
      fileMap.set(file.path, file);
    });
    
    // 取得したファイルを追加（上書き）
    files.forEach((file) => {
      fileMap.set(file.path, file);
    });
    
    return Array.from(fileMap.values());
  }, [savedFilesForRepo, files]);

  // 選択されたファイルパスからFileItemを取得
  const selectedFile = React.useMemo(() => {
    if (!value) return null;
    return allFiles.find((file) => file.path === value) || null;
  }, [value, allFiles]);

  const handleSelect = (file: FileItem | null) => {
    if (file) {
      onChange(file.path);
      // 選択したファイルを保存
      if (repository) {
        const config: RepositoryConfig = {
          owner: repository.owner.login,
          repo: repository.name,
          filePath: file.path,
        };
        const exists = savedConfigs.some(
          (c) =>
            c.owner === config.owner &&
            c.repo === config.repo &&
            c.filePath === config.filePath
        );
        if (!exists) {
          setSavedConfigs([...savedConfigs, config]);
        }
      }
    } else {
      onChange('');
    }
  };

  // ファイルパスを手動入力する場合の処理
//   const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const inputPath = e.target.value;
//     onChange(inputPath);
//   };

  // フォルダとファイルを分離
  const folders = allFiles.filter(f => f.type === 'dir');
  const fileItems = allFiles.filter(f => f.type === 'file');

  return (
    <div className="space-y-2">
      {/* パンくずリスト */}
      {repository && currentPath && (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
          {breadcrumbPaths.map((item, index) => (
            <React.Fragment key={item.path || 'root'}>
              {index > 0 && <span className="text-gray-400">/</span>}
              {index === breadcrumbPaths.length - 1 ? (
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {item.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(item.path)}
                  className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {item.name}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* フォルダ一覧 */}
      {repository && folders.length > 0 && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            フォルダ
          </label>
          <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
            {folders.map((folder) => (
              <button
                key={folder.path}
                type="button"
                onClick={() => handleFolderClick(folder.path)}
                className="flex items-center gap-2 px-3 py-2 text-left text-sm
                           bg-gray-50 dark:bg-gray-800
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           text-gray-700 dark:text-gray-300 rounded
                           transition-colors"
              >
                <svg
                  className="w-4 h-4 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <span className="flex-1 truncate">{folder.name}</span>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ファイル選択 */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1">
          <SearchableSelect<FileItem>
            options={fileItems}
            value={selectedFile}
            onChange={handleSelect}
            getLabel={(file) => file.path}
            getValue={(file) => file.path}
            placeholder="ファイルを検索..."
            label="ファイル"
            disabled={!repository || isLoading || loading}
          />
        </div>
        {repository && (
          <button
            type="button"
            onClick={() =>
              repository && loadFiles(repository.owner.login, repository.name, currentPath)
            }
            disabled={isLoading || loading}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 
                       hover:bg-gray-200 dark:hover:bg-gray-600 
                       text-gray-700 dark:text-gray-300 rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            title="ファイル一覧を再読み込み"
          >
            {isLoading || loading ? (
              <svg
                className="animate-spin h-5 w-5"
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
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      {!repository && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          リポジトリを選択してください
        </p>
      )}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  );
}
