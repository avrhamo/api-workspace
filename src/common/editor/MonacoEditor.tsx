import React from 'react';
import Editor from '@monaco-editor/react';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  height?: string;
  options?: any;
  onMount?: (editor: any) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  height = '100%',
  options = {},
  onMount
}) => {
  return (
    <Editor
      height={height}
      defaultLanguage={language}
      value={value}
      theme={theme}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        ...options
      }}
      onMount={onMount}
    />
  );
}; 