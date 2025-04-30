import React from 'react';
import MonacoEditor from '../../common/editor/MonacoEditor';

const BSONTool: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-2xl font-semibold mb-4">BSON Tools</h2>
      <div className="flex-1">
        <MonacoEditor
          value=""
          onChange={(value) => {}}
          language="json"
        />
      </div>
    </div>
  );
};

export default BSONTool;