import React, { useState } from 'react';
import { CurlAnalyzer } from './components/CurlAnalyzer';
import MonacoEditor from '../../common/editor/MonacoEditor';
import { useTheme } from '../../../hooks/useTheme';

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
  const [mappedFields, setMappedFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  const handleCurlChange = (value: string | undefined) => {
    setCurlCommand(value || '');
    setError(null);
  };

  const handleFieldMap = (field: string, value: string) => {
    setMappedFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isValidCurlCommand = (cmd: string | undefined): boolean => {
    if (!cmd) return false;
    const trimmedCmd = cmd.trim().toLowerCase();
    return trimmedCmd.startsWith('curl') && trimmedCmd.length > 5;
  };

  const handleSubmit = () => {
    try {
      if (curlCommand && curlCommand.trim()) {
        // Here you would typically parse the CURL command
        onCommandChange({
          rawCommand: curlCommand
        });
      } else {
        setError('Please enter a valid CURL command');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CURL command');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Enter CURL Command
        </label>
        <div className="relative h-32">
          <MonacoEditor
            value={curlCommand}
            onChange={handleCurlChange}
            language="shell"
            theme={editorTheme}
          />
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>

      {curlCommand && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            CURL Analysis
          </h3>
          <CurlAnalyzer
            curlCommand={curlCommand}
            onFieldMap={handleFieldMap}
            availableFields={availableFields}
          />
        </div>
      )}

      <div className="flex justify-between pt-6">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!isValidCurlCommand(curlCommand)}
          className={`
            inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
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
