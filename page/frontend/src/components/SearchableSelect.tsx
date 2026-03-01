import React, { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps<T> {
  options: T[];
  value: T | null;
  onChange: (value: T | null) => void;
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  filterFn?: (item: T, searchTerm: string) => boolean;
}

export default function SearchableSelect<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  placeholder = '検索して選択...',
  label,
  disabled = false,
  filterFn,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // デフォルトのフィルタ関数
  const defaultFilterFn = (item: T, term: string): boolean => {
    const label = getLabel(item).toLowerCase();
    return label.includes(term.toLowerCase());
  };

  const filter = filterFn || defaultFilterFn;

  // フィルタリングされたオプション
  const filteredOptions = searchTerm
    ? options.filter((item) => filter(item, searchTerm))
    : options;

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // キーボード操作
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (item: T) => {
    onChange(item);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const displayValue = value ? getLabel(value) : '';

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
                     placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              if (!isOpen) {
                inputRef.current?.focus();
              }
            }
          }}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 
                     dark:hover:text-gray-300 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 
                     dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">
              該当する項目が見つかりません
            </div>
          ) : (
            filteredOptions.map((item, index) => (
              <button
                key={getValue(item)}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 
                           transition-colors ${
                             index === highlightedIndex
                               ? 'bg-blue-100 dark:bg-gray-700'
                               : ''
                           } ${
                             value && getValue(value) === getValue(item)
                               ? 'bg-blue-50 dark:bg-gray-700 font-medium'
                               : ''
                           }`}
              >
                <span className="text-gray-900 dark:text-gray-100">
                  {getLabel(item)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
