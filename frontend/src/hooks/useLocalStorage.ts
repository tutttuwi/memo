import { useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // 初期値を取得（SSR対応）
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // localStorageに値を保存する関数
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // 関数の場合は現在の値を使って更新
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// 配列を管理する専用フック
export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[] = []
): [T[], (value: T[]) => void, (item: T) => void, (item: T) => void] {
  const [items, setItems] = useLocalStorage<T[]>(key, initialValue);

  const addItem = (item: T) => {
    setItems((prev) => {
      // 重複チェック（必要に応じてカスタマイズ）
      const exists = prev.some(
        (existing) => JSON.stringify(existing) === JSON.stringify(item)
      );
      if (exists) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const removeItem = (item: T) => {
    setItems((prev) =>
      prev.filter(
        (existing) => JSON.stringify(existing) !== JSON.stringify(item)
      )
    );
  };

  return [items, setItems, addItem, removeItem];
}
