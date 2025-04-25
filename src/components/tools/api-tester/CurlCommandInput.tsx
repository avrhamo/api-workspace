import React, { useState } from 'react';
import CodeEditor from '../../common/editor/MonacoEditor';
import { useTheme } from '../../../hooks/useTheme';

interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

interface CurlCommandInputProps {
  onParse: (parsed: ParsedCurl) => void;
  onBack?: () => void;
}

export const CurlCommandInput: React.FC<CurlCommandInputProps> = ({ onParse, onBack }) => {
  const [curlCommand, setCurlCommand] = useState('');
  const [error, setError] = useState('');
  const { theme } = useTheme();

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  const parseCurl = (curl: string): ParsedCurl | null => {
    try {
      // Basic CURL parsing with support for both single and double quotes
      const method = curl.match(/-X\s+(\w+)/)?.[1] || 'GET';
      
      // Match URL between quotes (single or double) or without quotes
      const urlMatch = curl.match(/curl\s+(?:-X\s+\w+\s+)?["']([^"']+)["']/) || 
                      curl.match(/curl\s+(?:-X\s+\w+\s+)?([^\s"']+)/);
      const url = urlMatch?.[1];
      
      const headers: Record<string, string> = {};
      
      // Parse headers with support for both quote types
      const headerMatches = curl.matchAll(/-H\s+["']([^"']+)["']/g);
      for (const match of headerMatches) {
        const [key, value] = match[1].split(': ');
        headers[key] = value;
      }

      // Parse body with support for both quote types
      const bodyMatch = curl.match(/-d\s+["']([^"']+)["']/);
      const body = bodyMatch ? JSON.parse(bodyMatch[1]) : undefined;

      // Validate URL
      if (!url) throw new Error('URL is required');

      return { method, url, headers, body };
    } catch (err) {
      console.error('Parse error:', err);
      return null;
    }
  };

  const handleSubmit = () => {
    const parsed = parseCurl(curlCommand);
    if (!parsed) {
      setError('Invalid CURL command. Please check the syntax.');
      return;
    }
    onParse(parsed);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 
              shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 
              bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
              dark:focus:ring-offset-gray-900"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        )}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex-1 text-center">
          Enter CURL Command
        </h3>
      </div>

      <div className="space-y-4">
        <div className="h-64 relative">
          <CodeEditor
            value={curlCommand}
            onChange={(value) => setCurlCommand(value || '')}
            language="shell"
            theme={editorTheme}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            className="inline-flex items-center px-6 py-3 border border-transparent 
              text-sm font-medium rounded-md shadow-sm text-white
              bg-blue-600 hover:bg-blue-700 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              dark:focus:ring-offset-gray-900"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
