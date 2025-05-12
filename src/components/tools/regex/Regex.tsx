import React from 'react';
import { BaseToolProps, ToolState } from '../types';
import { useToolState } from '../../../hooks/useToolState';

interface RegexState {
  pattern: string;
  input: string;
  output: string;
  flags: string;
  isGlobal: boolean;
  isCaseInsensitive: boolean;
  isMultiline: boolean;
}

export const Regex: React.FC<BaseToolProps<ToolState<RegexState>>> = (props) => {
  const { state, updateState } = useToolState<ToolState<RegexState>>({
    pattern: '',
    input: '',
    output: '',
    flags: '',
    isGlobal: true,
    isCaseInsensitive: false,
    isMultiline: false
  }, props);

  const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pattern = e.target.value;
    updateState({ pattern });
    processRegex(pattern, state.input);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    updateState({ input });
    processRegex(state.pattern, input);
  };

  const handleFlagChange = (flag: keyof Pick<RegexState, 'isGlobal' | 'isCaseInsensitive' | 'isMultiline'>) => {
    const newValue = !state[flag];
    updateState({ [flag]: newValue });
    
    // Update flags string
    const flags = [
      state.isGlobal ? 'g' : '',
      state.isCaseInsensitive ? 'i' : '',
      state.isMultiline ? 'm' : ''
    ].filter(Boolean).join('');
    
    updateState({ flags });
    processRegex(state.pattern, state.input);
  };

  const processRegex = (pattern: string, input: string) => {
    try {
      if (!pattern || !input) {
        updateState({ output: '' });
        return;
      }

      const regex = new RegExp(pattern, state.flags);
      const matches = input.match(regex);
      
      if (!matches) {
        updateState({ output: 'No matches found' });
        return;
      }

      const output = matches.map((match, index) => {
        const start = input.indexOf(match);
        const end = start + match.length;
        return `Match ${index + 1} (${start}-${end}): ${match}`;
      }).join('\n');

      updateState({ output });
    } catch (error) {
      updateState({ output: `Error: ${error instanceof Error ? error.message : 'Invalid regex pattern'}` });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Regular Expression Tester</h2>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="pattern" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Pattern
          </label>
          <input
            type="text"
            id="pattern"
            value={state.pattern}
            onChange={handlePatternChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            placeholder="Enter regex pattern..."
          />
        </div>

        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={state.isGlobal}
              onChange={() => handleFlagChange('isGlobal')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Global</span>
          </label>

          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={state.isCaseInsensitive}
              onChange={() => handleFlagChange('isCaseInsensitive')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Case Insensitive</span>
          </label>

          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={state.isMultiline}
              onChange={() => handleFlagChange('isMultiline')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Multiline</span>
          </label>
        </div>

        <div>
          <label htmlFor="input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Input Text
          </label>
          <textarea
            id="input"
            value={state.input}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            rows={6}
            placeholder="Enter text to test against the pattern..."
          />
        </div>

        <div>
          <label htmlFor="output" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Matches
          </label>
          <textarea
            id="output"
            value={state.output}
            readOnly
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm bg-gray-50 dark:bg-gray-800"
            rows={6}
            placeholder="Matches will appear here..."
          />
        </div>
      </div>
    </div>
  );
}; 