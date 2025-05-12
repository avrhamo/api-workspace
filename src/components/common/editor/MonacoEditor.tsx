import { FC, useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange, EditorProps } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange?: OnChange;
  language?: string;
  readOnly?: boolean;
  height?: string | number;
  theme?: 'vs-dark' | 'light';
  onMount?: OnMount;
  editorState?: {
    scrollTop?: number;
    scrollLeft?: number;
    cursorPosition?: { lineNumber: number; column: number };
    selections?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }[];
  };
  onEditorStateChange?: (state: CodeEditorProps['editorState']) => void;
}

const CodeEditor: FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  height = '300px',
  theme = 'vs-dark',
  onMount,
  editorState,
  onEditorStateChange,
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add custom commands or configurations here
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Handle save command if needed
    });

    // Format document command
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });

    // Restore editor state if provided
    if (editorState) {
      if (editorState.scrollTop !== undefined) {
        editor.setScrollTop(editorState.scrollTop);
      }
      if (editorState.scrollLeft !== undefined) {
        editor.setScrollLeft(editorState.scrollLeft);
      }
      if (editorState.cursorPosition) {
        editor.setPosition(editorState.cursorPosition);
      }
      if (editorState.selections) {
        editor.setSelections(editorState.selections);
      }
    }

    // Set up state change listeners
    editor.onDidScrollChange(() => {
      onEditorStateChange?.({
        ...editorState,
        scrollTop: editor.getScrollTop(),
        scrollLeft: editor.getScrollLeft(),
      });
    });

    editor.onDidChangeCursorPosition(() => {
      onEditorStateChange?.({
        ...editorState,
        cursorPosition: editor.getPosition(),
      });
    });

    editor.onDidChangeCursorSelection(() => {
      onEditorStateChange?.({
        ...editorState,
        selections: editor.getSelections(),
      });
    });

    if (onMount) {
      onMount(editor, monaco);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        onChange={onChange}
        theme={theme}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 8 },
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default CodeEditor;
