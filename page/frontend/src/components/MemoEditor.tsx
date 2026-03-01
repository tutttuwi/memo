import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface MemoEditorProps {
  commitTitle: string;
  content: string;
  onCommitTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export default function MemoEditor({
  commitTitle,
  content,
  onCommitTitleChange,
  onContentChange,
  onSubmit,
  isSubmitting = false,
}: MemoEditorProps) {
  const [draft, setDraft] = useLocalStorage<string>('memoDraft', '');
  const [previewHtml, setPreviewHtml] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 下書きを自動保存
  useEffect(() => {
    setDraft(content);
  }, [content, setDraft]);

  // 初期化時に下書きを読み込む
  useEffect(() => {
    if (draft && !content) {
      onContentChange(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markdownプレビューを更新
  useEffect(() => {
    if (content.trim()) {
      try {
        // marked.parse()は同期または非同期の可能性があるため、Promiseとして処理
        const result = marked.parse(content);
        if (result instanceof Promise) {
          result
            .then((html) => {
              setPreviewHtml(html as string);
            })
            .catch((error) => {
              console.error('Markdown parse error:', error);
              setPreviewHtml('<p class="text-red-500">プレビューの生成に失敗しました</p>');
            });
        } else {
          setPreviewHtml(result as string);
        }
      } catch (error) {
        console.error('Markdown parse error:', error);
        setPreviewHtml('<p class="text-red-500">プレビューの生成に失敗しました</p>');
      }
    } else {
      setPreviewHtml('');
    }
  }, [content]);

  // Ctrl+Enterで送信
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  // 下書きをクリア
  const handleClearDraft = () => {
    if (confirm('下書きを削除しますか？')) {
      setDraft('');
      onContentChange('');
      onCommitTitleChange('');
    }
  };

  return (
    <div className="space-y-4">
      {/* コミットタイトル */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          コミットタイトル（任意）
        </label>
        <input
          type="text"
          value={commitTitle}
          onChange={(e) => onCommitTitleChange(e.target.value)}
          placeholder="短い要約を入力..."
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
                     placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      {/* 本文 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          本文
        </label>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メモを入力してください... (Ctrl + Enter で送信)"
          disabled={isSubmitting}
          rows={10}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     resize-y font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ctrl + Enter で送信
        </p>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClearDraft}
          disabled={isSubmitting || !content}
          className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 
                     hover:bg-red-200 dark:hover:bg-red-900/50 
                     text-red-700 dark:text-red-300 rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          下書きをクリア
        </button>
      </div>

      {/* プレビュー */}
      {content && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Markdownプレビュー
          </label>
          <div
            className="max-h-64 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 
                       border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-900 dark:text-gray-100 markdown-preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            style={{
              wordBreak: 'break-word',
            }}
          />
        </div>
      )}
    </div>
  );
}
