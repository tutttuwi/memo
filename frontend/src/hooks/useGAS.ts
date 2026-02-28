import { useState, useCallback } from 'react';
import { GASError } from '../types';

interface GASCallOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: GASError) => void;
}

export function useGAS() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callGAS = useCallback(
    <T = any>(
      functionName: string,
      ...args: any[]
    ): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!window.google?.script?.run) {
          const err: GASError = {
            message: 'Google Apps Script環境が検出されませんでした',
          };
          setError(err.message);
          reject(err);
          return;
        }

        setLoading(true);
        setError(null);

        window.google.script.run
          .withSuccessHandler((result: T) => {
            setLoading(false);
            resolve(result);
          })
          .withFailureHandler((err: GASError) => {
            setLoading(false);
            const errorMessage =
              err.message || 'エラーが発生しました';
            setError(errorMessage);
            reject(err);
          })[functionName](...args);
      });
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    callGAS,
    loading,
    error,
    clearError,
  };
}

// 個別のGAS関数呼び出し用のフック
export function useGASFunction<T = any>(
  functionName: string,
  options?: GASCallOptions
) {
  const { callGAS, loading, error, clearError } = useGAS();

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      try {
        const result = await callGAS<T>(functionName, ...args);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        options?.onError?.(err as GASError);
        return null;
      }
    },
    [callGAS, functionName, options]
  );

  return {
    execute,
    loading,
    error,
    clearError,
  };
}
