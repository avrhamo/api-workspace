import React, { useState, useEffect } from 'react';
import { MonacoEditor } from '../../../common/editor/MonacoEditor';

const Regex: React.FC = () => {
  const [pattern, setPattern] = useState('');
  const [testString, setTestString] = useState('');
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    if (!pattern) {
      setResult('');
      return;
    }
    try {
      const regex = new RegExp(pattern);
      const match = regex.exec(testString);
      if (match) {
        let output = 'Match found!\n';
        output += `Full match: ${JSON.stringify(match[0])}`;
        if (match.length > 1) {
          output += '\n';
          for (let i = 1; i < match.length; i++) {
            output += `Group ${i}: ${JSON.stringify(match[i])}\n`;
          }
        }
        setResult(output.trim());
      } else {
        setResult('No match.');
      }
    } catch (e: any) {
      setResult('Regex error: ' + e.message);
    }
  }, [pattern, testString]);

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <div className="h-full w-full flex-1 min-h-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-6 flex flex-col">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Regex Checker</h2>
        <div className="flex-1 flex gap-4 min-h-0" style={{ maxHeight: 240 }}>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Regex Pattern</label>
            <div className="flex-1 min-h-0 border rounded-lg overflow-hidden border-gray-200 dark:border-gray-700">
              <MonacoEditor
                value={pattern}
                onChange={v => setPattern(v || '')}
                language="plaintext"
                theme="vs-dark"
                height="200px"
                options={{ fontSize: 16, fontFamily: 'Fira Mono, monospace', minimap: { enabled: false } }}
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Test String</label>
            <div className="flex-1 min-h-0 border rounded-lg overflow-hidden border-gray-200 dark:border-gray-700">
              <MonacoEditor
                value={testString}
                onChange={v => setTestString(v || '')}
                language="plaintext"
                theme="vs-dark"
                height="200px"
                options={{ fontSize: 16, fontFamily: 'Fira Mono, monospace', minimap: { enabled: false } }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[48px] text-sm font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-100">
          {result}
        </div>
      </div>
    </div>
  );
};

export default Regex;