import React, { useState } from 'react';
import { ChevronLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
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
    const requestConfig = {
      method: curlConfig.parsedCommand.method || 'GET',
      url: curlConfig.parsedCommand.url || '',
      headers: curlConfig.parsedCommand.headers || {},
      data: curlConfig.parsedCommand.data,
      mappedFields: curlConfig.mappedFields,
      connectionConfig
    };
    console.log('[API TESTER] Executing request with config:', requestConfig);
    try {
      const response = await window.electronAPI.executeRequest(requestConfig);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-2" />
            Back
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API Test Configuration</h2>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="numberOfRequests" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of Requests
              <div className="group relative ml-2">
                <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                <div className="hidden group-hover:block absolute z-10 w-48 px-2 py-1 text-xs text-white bg-gray-900 rounded-md -right-1 transform translate-x-full">
                  The total number of API requests to execute
                </div>
              </div>
            </label>
            <input
              id="numberOfRequests"
              type="number"
              min="1"
              value={testConfig.numberOfRequests}
              onChange={(e) => handleConfigChange('numberOfRequests', parseInt(e.target.value, 10))}
              placeholder="Enter number of requests"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
              aria-label="Number of requests to execute"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="batchSize" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              Batch Size
              <div className="group relative ml-2">
                <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                <div className="hidden group-hover:block absolute z-10 w-48 px-2 py-1 text-xs text-white bg-gray-900 rounded-md -right-1 transform translate-x-full">
                  Number of requests to process in each batch
                </div>
              </div>
            </label>
            <input
              id="batchSize"
              type="number"
              min="1"
              value={testConfig.batchSize}
              onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value, 10))}
              placeholder="Enter batch size"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
              aria-label="Batch size for request processing"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 py-4">
          <input
            type="checkbox"
            id="async"
            checked={testConfig.isAsync}
            onChange={(e) => handleConfigChange('isAsync', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
          />
          <label htmlFor="async" className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            Execute requests asynchronously
            <div className="group relative ml-2">
              <InformationCircleIcon className="w-4 h-4 text-gray-400" />
              <div className="hidden group-hover:block absolute z-10 w-48 px-2 py-1 text-xs text-white bg-gray-900 rounded-md -right-1 transform translate-x-full">
                Run requests in parallel instead of sequentially
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={executeTest}
          disabled={isRunning}
          className={`
            inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
            transition-colors duration-200
            ${isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }
          `}
        >
          {isRunning ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Running Tests...
            </>
          ) : 'Start Test'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            Test Results
            {averageTime && averageTime < 1000 && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Fast Response</span>
            )}
          </h3>
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="relative">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Requests</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{results.length}</dd>
                </div>
                <div className="relative">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Response Time</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    {averageTime ? `${averageTime.toFixed(2)}ms` : 'N/A'}
                  </dd>
                </div>
                <div className="relative">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Successful Requests</dt>
                  <dd className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                    {results.filter(r => r.success).length}
                  </dd>
                </div>
                <div className="relative">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed Requests</dt>
                  <dd className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
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