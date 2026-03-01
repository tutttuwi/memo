import React, { useEffect, useState } from 'react';
import { Repository } from '../types';
import { useGAS } from '../hooks/useGAS';
import { useLocalStorage } from '../hooks/useLocalStorage';
import SearchableSelect from './SearchableSelect';

interface RepositorySelectorProps {
  value: Repository | null;
  onChange: (repo: Repository | null) => void;
}

export default function RepositorySelector({
  value,
  onChange,
}: RepositorySelectorProps) {
  const { callGAS, loading, error } = useGAS();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [savedRepos, setSavedRepos] = useLocalStorage<Repository[]>(
    'savedRepositories',
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  // リポジトリ一覧を取得
  const loadRepositories = async () => {
    setIsLoading(true);
    try {
      const repos = await callGAS<Repository[]>('getRepositories');
      setRepositories(repos || []);
    } catch (err) {
      console.error('Failed to load repositories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回ロード
  useEffect(() => {
    loadRepositories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存済みリポジトリと取得したリポジトリをマージ
  const allRepositories = React.useMemo(() => {
    const repoMap = new Map<string, Repository>();
    
    // 保存済みリポジトリを追加
    savedRepos.forEach((repo) => {
      repoMap.set(repo.full_name, repo);
    });
    
    // 取得したリポジトリを追加（上書き）
    repositories.forEach((repo) => {
      repoMap.set(repo.full_name, repo);
    });
    
    return Array.from(repoMap.values());
  }, [savedRepos, repositories]);

  const handleSelect = (repo: Repository | null) => {
    onChange(repo);
    // 選択したリポジトリを保存
    if (repo) {
      const exists = savedRepos.some(
        (r) => r.full_name === repo.full_name
      );
      if (!exists) {
        setSavedRepos([...savedRepos, repo]);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SearchableSelect<Repository>
          options={allRepositories}
          value={value}
          onChange={handleSelect}
          getLabel={(repo) => repo.full_name}
          getValue={(repo) => repo.full_name}
          placeholder="リポジトリを検索..."
          label="リポジトリ"
          disabled={isLoading || loading}
        />
        <button
          type="button"
          onClick={loadRepositories}
          disabled={isLoading || loading}
          className="ml-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 
                     hover:bg-gray-200 dark:hover:bg-gray-600 
                     text-gray-700 dark:text-gray-300 rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          title="リポジトリ一覧を再読み込み"
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
      </div>
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  );
}
