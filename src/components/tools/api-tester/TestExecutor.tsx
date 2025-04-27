import React, { useState } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../../hooks/useTheme';

interface ConnectionConfig {
  connectionString: string;
  database?: string;
  collection?: string;
}

interface CurlConfig {
  parsedCommand: {
    rawCommand: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    data?: any;
  };
  mappedFields: Record<string, string>;
}

interface TestConfig {
  numberOfRequests: number;
  isAsync: boolean;
  batchSize: number;
}

interface TestExecutorProps {
  connectionConfig: ConnectionConfig;
  curlConfig: CurlConfig;
  testConfig: TestConfig;
  onConfigChange: React.Dispatch<React.SetStateAction<TestConfig>>;
  onBack?: () => void;
  onConnectionConfigChange: (config: ConnectionConfig) => void;
  onCurlConfigChange: (config: CurlConfig) => void;
}

interface TestResult {
  success: boolean;
  duration: number;
  error?: string;
}

export const TestExecutor: React.FC<TestExecutorProps> = ({
  connectionConfig,
  curlConfig,
  testConfig,
  onConfigChange,
  onBack,
  onConnectionConfigChange,
  onCurlConfigChange
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [averageTime, setAverageTime] = useState<number | null>(null);
  const { theme } = useTheme();

  const handleConfigChange = (field: keyof TestConfig, value: any) => {
    onConfigChange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const executeTest = async () => {
    setIsRunning(true);
    setResults([]);
    setAverageTime(null);

    const testResults: TestResult[] = [];
    const startTime = performance.now();

    try {
      if (testConfig.isAsync) {
        // Execute requests in parallel
        const promises = Array(testConfig.numberOfRequests)
          .fill(null)
          .map(() => executeSingleRequest());
        
        const results = await Promise.all(promises);
        testResults.push(...results);
      } else {
        // Execute requests sequentially
        for (let i = 0; i < testConfig.numberOfRequests; i++) {
          const result = await executeSingleRequest();
          testResults.push(result);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      setAverageTime(totalTime / testConfig.numberOfRequests);
    } catch (error) {
      console.error('Test execution error:', error);
    }

    setResults(testResults);
    setIsRunning(false);
  };

  const executeSingleRequest = async (): Promise<TestResult> => {
    const startTime = performance.now();
    try {
      const response = await window.electronAPI.executeRequest({
        method: curlConfig.parsedCommand.method || 'GET',
        url: curlConfig.parsedCommand.url || '',
        headers: curlConfig.parsedCommand.headers || {},
        data: curlConfig.parsedCommand.data,
        mappedFields: curlConfig.mappedFields,
        connectionConfig
      });

      const endTime = performance.now();
      return {
        success: response.success,
        duration: endTime - startTime,
        error: response.error
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-2" />
            Back
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of Requests
            </label>
            <input
              type="number"
              min="1"
              value={testConfig.numberOfRequests}
              onChange={(e) => handleConfigChange('numberOfRequests', parseInt(e.target.value, 10))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Batch Size
            </label>
            <input
              type="number"
              min="1"
              value={testConfig.batchSize}
              onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value, 10))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="async"
            checked={testConfig.isAsync}
            onChange={(e) => handleConfigChange('isAsync', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="async" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Execute requests asynchronously
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={executeTest}
          disabled={isRunning}
          className={`
            inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
            ${isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }
          `}
        >
          {isRunning ? 'Running Tests...' : 'Start Test'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Test Results</h3>
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Requests
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {results.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Average Response Time
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {averageTime ? `${averageTime.toFixed(2)}ms` : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Successful Requests
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {results.filter(r => r.success).length}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Failed Requests
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {results.filter(r => !r.success).length}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 