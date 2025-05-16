import React, { useEffect } from 'react';
import { diffWords } from 'diff';

interface TextCompareState {
  leftText: string;
  rightText: string;
  diffResult: any[] | null;
  showWhitespace: boolean;
  caseSensitive: boolean;
  error: string | null;
}

interface Props {
  state: TextCompareState;
  setState: (state: Partial<TextCompareState>) => void;
}

const TextCompareTool: React.FC<Props> = ({ state, setState }) => {
  useEffect(() => {
    if (state.leftText || state.rightText) {
      try {
        const options = {
          ignoreCase: !state.caseSensitive,
          ignoreWhitespace: !state.showWhitespace,
        };
        
        const diff = diffWords(state.leftText, state.rightText, options);
        setState({ diffResult: diff, error: null });
      } catch (error) {
        setState({ error: 'Error comparing texts' });
      }
    }
  }, [state.leftText, state.rightText, state.caseSensitive, state.showWhitespace]);

  const renderDiff = () => {
    if (!state.diffResult) return null;

    return state.diffResult.map((part, index) => {
      const className = part.added
        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
        : part.removed
        ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200';

      return (
        <span key={index} className={className}>
          {part.value}
        </span>
      );
    });
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4 flex space-x-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            checked={state.showWhitespace}
            onChange={(e) => setState({ showWhitespace: e.target.checked })}
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Show Whitespace</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            checked={state.caseSensitive}
            onChange={(e) => setState({ caseSensitive: e.target.checked })}
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Case Sensitive</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Original Text
          </label>
          <textarea
            className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            value={state.leftText}
            onChange={(e) => setState({ leftText: e.target.value })}
            placeholder="Enter or paste original text here..."
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Compare With
          </label>
          <textarea
            className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            value={state.rightText}
            onChange={(e) => setState({ rightText: e.target.value })}
            placeholder="Enter or paste text to compare with..."
          />
        </div>
      </div>

      {state.error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {state.error}
        </div>
      )}

      {state.diffResult && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Differences</h3>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="whitespace-pre-wrap font-mono text-sm">
              {renderDiff()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextCompareTool; 