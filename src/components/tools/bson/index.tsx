import React from 'react';
import MonacoEditor from '../../common/editor/MonacoEditor';
import { useTheme } from '../../../hooks/useTheme';

interface BSONToolProps {
  editorHeight?: string;
}

const BSONTool: React.FC<BSONToolProps> = ({ editorHeight = '800px' }) => {
  const { theme } = useTheme();
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-2xl font-semibold mb-4">BSON Tools</h2>
      <div className="flex-1" style={{ height: editorHeight }}>
        <MonacoEditor
          value=""
          onChange={(value) => {}}
          language="json"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          height={editorHeight}
        />
      </div>
    </div>
  );
};

export default BSONTool;