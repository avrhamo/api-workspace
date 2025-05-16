import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

console.log('[MonacoEditor] MonacoEditor.tsx file loaded!');

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  height?: string;
  options?: any;
  onMount?: (editor: any, monaco: any) => void;
}

// Map app theme to Monaco theme
const mapTheme = (theme?: string) => {
  if (theme === 'dark' || theme === 'vs-dark') return 'vs-dark';
  if (theme === 'light' || theme === 'vs-light') return 'vs-light';
  return 'vs-dark'; // default
};

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  height = '100%',
  options = {},
  onMount
}) => {
  const monacoRef = useRef<any>(null);
  const mappedTheme = mapTheme(theme);

  // Store monaco namespace and set theme on mount
  const handleMount = (editor: any, monaco: any) => {
    monacoRef.current = monaco;
    console.log('[MonacoEditor] handleMount: theme=', mappedTheme);
    if (monaco && mappedTheme) {
      console.log('[MonacoEditor] handleMount: calling monaco.editor.setTheme(', mappedTheme, ')');
      monaco.editor.setTheme(mappedTheme);
    }
    if (onMount) {
      onMount(editor, monaco);
    }
  };

  // Update theme when prop changes
  useEffect(() => {
    console.debug('[MonacoEditor] useEffect: theme changed to', mappedTheme);
    if (monacoRef.current && mappedTheme) {
      console.debug('[MonacoEditor] useEffect: calling monaco.editor.setTheme(', mappedTheme, ')');
      monacoRef.current.editor.setTheme(mappedTheme);
    }
  }, [mappedTheme]);

  useEffect(() => {
    console.debug('[MonacoEditor] Rendered with theme:', mappedTheme);
  });

  return (
    <Editor
      key={mappedTheme}
      height={height}
      defaultLanguage={language}
      value={value}
      theme={mappedTheme}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        ...options
      }}
      onMount={handleMount}
    />
  );
}; 
export default MonacoEditor;