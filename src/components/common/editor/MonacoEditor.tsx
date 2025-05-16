import { FC, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Editor, { OnMount, OnChange, EditorProps } from '@monaco-editor/react';
import type { Position, Selection } from 'monaco-editor';
import { useTheme, onThemeChange } from '../../../hooks/useTheme';
import { registerEditor, unregisterEditor } from '../../../config/monaco';

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
    cursorPosition?: Position;
    selections?: Selection[];
  };
  onEditorStateChange?: (state: {
    scrollTop?: number;
    scrollLeft?: number;
    cursorPosition?: Position;
    selections?: Selection[];
  }) => void;
}

// Normalize theme values
const normalizeTheme = (theme: string): 'vs-dark' | 'vs-light' => {
  if (theme === 'vs-dark' || theme === 'vs-light') {
    return theme;
  }
  return theme === 'dark' ? 'vs-dark' : 'vs-light';
};

const CodeEditor: FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  height = '1000px',
  theme: propTheme,
  onMount,
  editorState,
  onEditorStateChange,
}) => {
  const editorRef = useRef<any>(null);
  const { theme: systemTheme } = useTheme();
  
  // Track the current theme state
  const [currentThemeState, setCurrentThemeState] = useState(() => {
    const normalizedPropTheme = propTheme ? normalizeTheme(propTheme) : null;
    const normalizedSystemTheme = normalizeTheme(systemTheme);
    return normalizedPropTheme || normalizedSystemTheme;
  });

  // Force editor recreation on theme change
  const [forceUpdate, setForceUpdate] = useState(0);

  // Listen for theme changes
  useEffect(() => {
    const cleanup = onThemeChange((newTheme) => {
      const normalizedTheme = normalizeTheme(newTheme);
      setCurrentThemeState(normalizedTheme);
      setForceUpdate(prev => prev + 1);
      
      // Cleanup old editor
      if (editorRef.current) {
        unregisterEditor(editorRef.current);
        editorRef.current = null;
      }
    });
    
    return cleanup;
  }, []);

  // Use a unique key for each theme to force complete editor recreation
  const editorKey = useMemo(() => {
    return `editor-${currentThemeState}-${readOnly ? 'readonly' : 'editable'}-${language}-${forceUpdate}`;
  }, [currentThemeState, readOnly, language, forceUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        unregisterEditor(editorRef.current);
      }
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    registerEditor(editor);
    
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

    // Add custom commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Handle save command if needed
    });

    // Format document command
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });

    // Set up state change listeners
    editor.onDidScrollChange(() => {
      onEditorStateChange?.({
        ...editorState,
        scrollTop: editor.getScrollTop(),
        scrollLeft: editor.getScrollLeft(),
      });
    });

    editor.onDidChangeCursorPosition(() => {
      const position = editor.getPosition();
      if (position) {
        onEditorStateChange?.({
          ...editorState,
          cursorPosition: position,
        });
      }
    });

    editor.onDidChangeCursorSelection(() => {
      const selections = editor.getSelections();
      if (selections) {
        onEditorStateChange?.({
          ...editorState,
          selections,
        });
      }
    });

    if (onMount) {
      onMount(editor, monaco);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <Editor
        key={editorKey}
        height={height}
        defaultLanguage={language}
        value={value}
        onChange={onChange}
        theme={currentThemeState}
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
