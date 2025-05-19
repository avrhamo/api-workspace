import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from '../../hooks/useTheme';

interface MonacoDiffEditorProps {
  original: string;
  modified: string;
  language?: string;
  height?: string | number;
  options?: any;
  onMount?: (editor: any, monaco: any) => void;
  theme: string;
}

const MonacoDiffEditor: React.FC<MonacoDiffEditorProps> = ({
  original,
  modified,
  language = 'plaintext',
  height = '100vh',
  options = {},
  onMount,
  theme,
}) => {
  const { theme: systemTheme } = useTheme();
  const monacoTheme = theme || (systemTheme === 'dark' ? 'vs-dark' : 'vs-light');

  console.log('[MonacoDiffEditor] render', { theme: monacoTheme });

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <DiffEditor
        height={height}
        language={language}
        original={original}
        modified={modified}
        theme={monacoTheme}
        options={options}
        onMount={(editor, monaco) => {
          console.log('[MonacoDiffEditor] onMount', { theme: monacoTheme, editor, monaco });
          if (onMount) onMount(editor, monaco);
        }}
      />
    </div>
  );
};

export default MonacoDiffEditor; 