import React from 'react';
import Editor from '@monaco-editor/react';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  height?: string;
  options?: any;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  height = '100%',
  options = {}
}) => {
  return (
    <Editor
      height={height}
      defaultLanguage={language}
      defaultValue={value}
      theme={theme}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        ...options
      }}
    />
  );
}; 