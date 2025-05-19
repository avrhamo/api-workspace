import React, { useState } from 'react';
import MonacoEditor from '../../common/editor/MonacoEditor';
import { useTheme } from '../../../hooks/useTheme';
import { parseCurl } from './utils';

interface CurlCommandInputProps {
  initialCommand?: string;
  onCommandChange: (parsedCommand: {
    rawCommand: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    data?: any;
  }) => void;
  onBack?: () => void;
  availableFields?: string[];
}

export const CurlCommandInput: React.FC<CurlCommandInputProps> = ({
  initialCommand = '',
  onCommandChange,
  onBack,
  availableFields = [] // Provide default empty array
}) => {
  const [curlCommand, setCurlCommand] = useState(initialCommand);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  const handleCurlChange = (value: string | undefined) => {
    setCurlCommand(value || '');
    setError(null);
  };

  const isValidCurlCommand = (cmd: string | undefined): boolean => {
    if (!cmd) return false;
    const trimmedCmd = cmd.trim().toLowerCase();
    return trimmedCmd.startsWith('curl') && trimmedCmd.length > 5;
  };

  const handleSubmit = () => {
    try {
      if (curlCommand && curlCommand.trim()) {
        const parsed = parseCurl(curlCommand);
        
        // Ensure we have a valid JSON body for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(parsed.method) && !parsed.body) {
          throw new Error('Request body is required for ' + parsed.method + ' requests');
        }

        // Validate that the body is a proper object for JSON requests
        if (parsed.headers['Content-Type']?.toLowerCase().includes('application/json')) {
          if (typeof parsed.body === 'string') {
            try {
              const jsonBody = JSON.parse(parsed.body);
              onCommandChange({
                rawCommand: curlCommand,
                method: parsed.method,
                url: parsed.url,
                headers: parsed.headers,
                data: jsonBody
              });
            } catch (err) {
              throw new Error('Invalid JSON in request body: ' + (err instanceof Error ? err.message : String(err)));
            }
          } else {
            onCommandChange({
              rawCommand: curlCommand,
              method: parsed.method,
              url: parsed.url,
              headers: parsed.headers,
              data: parsed.body
            });
          }
        } else {
          onCommandChange({
            rawCommand: curlCommand,
            method: parsed.method,
            url: parsed.url,
            headers: parsed.headers,
            data: parsed.body
          });
        }
      } else {
        setError('Please enter a valid CURL command');
      }
    } catch (err) {
      console.error('Error parsing curl command:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse CURL command');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Enter CURL Command
        </label>
        <div className="relative" style={{ height: 220 }}>
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <MonacoEditor
              value={curlCommand}
              onChange={handleCurlChange}
              language="shell"
              theme={editorTheme}
              height={220}
            />
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center h-12 px-6 border border-gray-300 dark:border-gray-600 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!isValidCurlCommand(curlCommand)}
          className={`
            inline-flex items-center h-12 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white
            ${!isValidCurlCommand(curlCommand)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
};