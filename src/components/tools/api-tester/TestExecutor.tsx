import React, { useState } from 'react';
import { Editor } from '@monaco-editor/react';

interface ConnectionConfig {
  connectionString: string;
  database?: string;
  collection?: string;
}

interface CurlConfig {
  parsedCommand: any;
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
}

interface TestResult {
  success: boolean;
  duration: number;
  error?: string;
}

type TabType = 'datasource' | 'curl' | 'mapping' | 'execution';

export const TestExecutor: React.FC<TestExecutorProps> = ({
  connectionConfig,
  curlConfig,
  testConfig,
  onConfigChange,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('datasource');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [averageTime, setAverageTime] = useState<number | null>(null);
  const [curlCommand, setCurlCommand] = useState('');

  const tabs: { id: TabType; label: string; disabled: boolean }[] = [
    { id: 'datasource', label: 'Data Source', disabled: false },
    { id: 'curl', label: 'CURL Command', disabled: !connectionConfig.collection },
    { id: 'mapping', label: 'Field Mapping', disabled: !curlCommand.trim() },
    { id: 'execution', label: 'Test Execution', disabled: Object.keys(curlConfig.mappedFields).length === 0 },
  ];

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
      // Here you would implement the actual API call using the curlConfig
      // This is a placeholder for the actual implementation
      const response = await fetch(curlConfig.parsedCommand.url, {
        method: curlConfig.parsedCommand.method || 'GET',
        headers: curlConfig.parsedCommand.headers || {},
        body: curlConfig.parsedCommand.data,
      });

      const endTime = performance.now();
      return {
        success: response.ok,
        duration: endTime - startTime,
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

  const renderTab = (tab: TabType) => {
    switch (tab) {
      case 'datasource':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">MongoDB Connection</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Connection String</label>
                  <div className="p-3 bg-gray-50 rounded-md font-mono text-sm break-all">
                    {connectionConfig.connectionString}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Database</label>
                    <select 
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                      value={connectionConfig.database}
                    >
                      <option value="">Select Database</option>
                      {/* Add database options */}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Collection</label>
                    <select 
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                      value={connectionConfig.collection}
                      disabled={!connectionConfig.database}
                    >
                      <option value="">Select Collection</option>
                      {/* Add collection options */}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'curl':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">CURL Command</h3>
              <div className="h-64 border rounded-md overflow-hidden">
                <Editor
                  height="100%"
                  defaultLanguage="shell"
                  value={curlCommand}
                  onChange={(value) => setCurlCommand(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on'
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Field Mapping</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">MongoDB Fields</h4>
                  {/* Add MongoDB fields list */}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">API Response Fields</h4>
                  {/* Add API response fields mapping */}
                </div>
              </div>
            </div>
          </div>
        );

      case 'execution':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Execute API Test
                </h3>
                {onBack && (
                  <button
                    onClick={onBack}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                )}
              </div>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="requestCount" className="text-sm font-medium text-gray-700">
                      Number of Requests
                    </label>
                    <input
                      id="requestCount"
                      type="number"
                      min="1"
                      value={testConfig.numberOfRequests}
                      onChange={(e) => onConfigChange({
                        ...testConfig,
                        numberOfRequests: parseInt(e.target.value, 10)
                      })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      id="asyncExecution"
                      type="checkbox"
                      checked={testConfig.isAsync}
                      onChange={(e) => onConfigChange({
                        ...testConfig,
                        isAsync: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="asyncExecution" className="text-sm font-medium text-gray-700">
                      Parallel Execution
                    </label>
                  </div>
                </div>
                <button
                  onClick={executeTest}
                  disabled={isRunning}
                  className={`w-full px-4 py-2 rounded-md font-medium text-white transition-colors ${
                    isRunning
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isRunning ? 'Running Tests...' : 'Execute Tests'}
                </button>
              </div>

              {results.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm text-gray-500">Total Tests</span>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{results.length}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm text-gray-500">Successful</span>
                      <p className="mt-1 text-2xl font-semibold text-green-600">
                        {results.filter(r => r.success).length}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm text-gray-500">Failed</span>
                      <p className="mt-1 text-2xl font-semibold text-red-600">
                        {results.filter(r => !r.success).length}
                      </p>
                    </div>
                    {averageTime && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-500">Avg. Response Time</span>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">{averageTime.toFixed(2)}ms</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${
                          result.success ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Request {index + 1}</span>
                          <span className="text-sm font-mono">
                            {result.duration.toFixed(2)}ms
                          </span>
                        </div>
                        {result.error && (
                          <p className="mt-2 text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">API Tester</h2>
          <p className="mt-1 text-sm text-gray-500">
            Test your API endpoints against MongoDB data
          </p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {renderTab(activeTab)}
        </div>
      </div>
    </div>
  );
}; 