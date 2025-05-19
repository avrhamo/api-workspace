import React, { useRef, useEffect, useMemo } from 'react';
import MonacoDiffEditor from '../../../common/editor/MonacoDiffEditor';
import { useTheme } from '../../../hooks/useTheme';
import type { editor } from 'monaco-editor';

interface TextCompareState {
  leftText: string;
  rightText: string;
  error: string | null;
}

interface Props {
  state: TextCompareState;
  setState: (state: Partial<TextCompareState>) => void;
}

const TextCompareTool: React.FC<Props> = ({ state, setState }) => {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);

  // Memoize monacoTheme so it only changes when theme changes
  const monacoTheme = useMemo(() => (theme === 'dark' ? 'vs-dark' : 'vs-light'), [theme]);

  console.log('[TextCompareTool] render', { theme, monacoTheme, key: monacoTheme });

  const editorOptions: editor.IDiffEditorConstructionOptions = {
    readOnly: false,
    renderWhitespace: 'none',
    ignoreTrimWhitespace: true,
    renderSideBySide: true,
    enableSplitViewResizing: true,
    renderIndicators: true,
    wordWrap: 'on',
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    renderOverviewRuler: true,
    overviewRulerBorder: true,
    overviewRulerLanes: 2,
  };

  // Keep both editors editable at all times
  useEffect(() => {
    if (editorRef.current) {
      const originalEditor = editorRef.current.getOriginalEditor();
      const modifiedEditor = editorRef.current.getModifiedEditor();
      originalEditor.updateOptions({ readOnly: false });
      modifiedEditor.updateOptions({ readOnly: false });
    }
  }, [state.leftText, state.rightText]);

  return (
    <div className="flex-1 min-h-[400px] p-4 flex flex-col">
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          title="Paste clipboard to left editor"
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              setState({ leftText: text });
            } catch (err) {
              alert('Failed to read clipboard.');
            }
          }}
        >
          Paste to Left
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-500 text-white font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
          title="Clear left editor"
          onClick={() => setState({ leftText: '' })}
        >
          Clear Left
        </button>
      </div>

      {state.error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {state.error}
        </div>
      )}

      <div className="flex-1 min-h-[400px]">
        <MonacoDiffEditor
          key={monacoTheme}
          theme={monacoTheme}
          original={state.leftText}
          modified={state.rightText}
          language="plaintext"
          height="100vh"
          options={editorOptions}
          onMount={(editor) => {
            console.log('[TextCompareTool] MonacoDiffEditor onMount', { theme, monacoTheme });
            editorRef.current = editor;
            // Listen for changes in both editors
            editor.getOriginalEditor().onDidChangeModelContent(() => {
              const value = editor.getOriginalEditor().getValue();
              setState({ leftText: value });
            });
            editor.getModifiedEditor().onDidChangeModelContent(() => {
              const value = editor.getModifiedEditor().getValue();
              setState({ rightText: value });
            });
          }}
        />
      </div>
    </div>
  );
};

export default TextCompareTool; 