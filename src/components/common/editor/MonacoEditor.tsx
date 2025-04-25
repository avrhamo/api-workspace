import { FC } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange?: OnChange;
  language?: string;
  readOnly?: boolean;
  height?: string | number;
  theme?: 'vs-dark' | 'light';
  onMount?: OnMount;
}

const CodeEditor: FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  height = '300px',
  theme = 'vs-dark',
  onMount,
}) => {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Add custom commands or configurations here
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Handle save command if needed
    });

    // Format document command
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run();
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
