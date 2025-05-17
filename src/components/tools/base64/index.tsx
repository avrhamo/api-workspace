import React, { useState, useCallback, useRef, useEffect } from 'react';
import CodeEditor from '../../common/editor/MonacoEditor';
import { DocumentDuplicateIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../../hooks/useTheme';

const MODES = [
  { id: 'encode', label: 'Encode' },
  { id: 'decode', label: 'Decode' },
];

interface Base64State {
  mode: 'encode' | 'decode';
  input: string;
  output: string;
  error: string | null;
  copied: 'input' | 'output' | null;
  editorState?: {
    scrollTop?: number;
    scrollLeft?: number;
    cursorPosition?: { lineNumber: number; column: number };
    selections?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }[];
  };
}

interface Base64ToolProps {
  state?: Base64State;
  setState?: (state: Partial<Base64State>) => void;
  editorHeight?: string;
}

const Base64Tool: React.FC<Base64ToolProps> = ({ state: propState, setState: propSetState, editorHeight = '800px' }) => {
  const [localState, setLocalState] = useState<Base64State>(() => ({
    mode: 'encode',
    input: '',
    output: '',
    error: null,
    copied: null,
    editorState: undefined,
    ...propState
  }));

  // Use prop state if provided, otherwise use local state
  const state = propState || localState;
  const setState = propSetState || setLocalState;

  const { theme } = useTheme();

  // Handle input changes
  const handleInputChange = useCallback((value: string | undefined) => {
    const input = value || '';
    const newState = { ...state, input, error: null as string | null };
    try {
      if (state.mode === 'encode') {
        newState.output = btoa(input);
      } else {
        newState.output = atob(input);
      }
    } catch (e) {
      newState.output = '';
      newState.error = state.mode === 'encode' 
        ? 'Input cannot be encoded as Base64.' as string | null
        : 'Invalid Base64 string.' as string | null;
    }
    setState(newState);
  }, [state, setState]);

  // Handle mode changes
  const handleModeChange = useCallback((mode: 'encode' | 'decode') => {
    const newState = { ...state, mode, error: null as string | null };
    try {
      if (mode === 'encode') {
        newState.output = btoa(state.input);
      } else {
        newState.output = atob(state.input);
      }
    } catch (e) {
      newState.output = '';
      newState.error = mode === 'encode' 
        ? 'Input cannot be encoded as Base64.' as string | null
        : 'Invalid Base64 string.' as string | null;
    }
    setState(newState);
  }, [state, setState]);

  // Copy helpers
  const copyToClipboard = (text: string, which: 'input' | 'output') => {
    navigator.clipboard.writeText(text);
    setState(prev => ({ ...prev, copied: which }));
    setTimeout(() => setState(prev => ({ ...prev, copied: null })), 1200);
  };

  // Reset
  const handleReset = () => {
    setState({
      mode: 'encode',
      input: '',
      output: '',
      error: null,
      copied: null,
      editorState: undefined
    });
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Base64 Tool</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex space-x-4 mb-4">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleModeChange(id as 'encode' | 'decode')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${state.mode === id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col" style={{ height: editorHeight }}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Input</label>
            <button
              onClick={() => copyToClipboard(state.input, 'input')}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              title="Copy to clipboard"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden border-gray-200 dark:border-gray-700">
            <CodeEditor
              value={state.input}
              onChange={handleInputChange}
              language="plaintext"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              editorState={state.editorState}
              onEditorStateChange={editorState => setState(prev => ({ ...prev, editorState }))}
              height={editorHeight}
            />
          </div>
        </div>

        <div className="flex flex-col" style={{ height: editorHeight }}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Output</label>
            <button
              onClick={() => copyToClipboard(state.output, 'output')}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              title="Copy to clipboard"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden border-gray-200 dark:border-gray-700">
            <CodeEditor
              value={state.output}
              language="plaintext"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              readOnly
              height={editorHeight}
            />
          </div>
        </div>
      </div>

      {state.error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-200">{state.error}</p>
        </div>
      )}

      {state.copied && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default Base64Tool;
