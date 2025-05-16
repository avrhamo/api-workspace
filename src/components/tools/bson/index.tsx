import React from 'react';
import MonacoEditor from '../../common/editor/MonacoEditor';
import { useTheme } from '../../../hooks/useTheme';

const BSONTool: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-2xl font-semibold mb-4">BSON Tools</h2>
      <div className="flex-1">
        <MonacoEditor
          value=""
          onChange={(value) => {}}
          language="json"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
        />
      </div>
    </div>
  );
};

export default BSONTool;