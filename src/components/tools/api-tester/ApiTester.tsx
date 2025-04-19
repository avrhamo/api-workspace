import { FC, useState, useEffect } from 'react';
import { 
  PlayIcon,
  ArrowPathIcon,
  ServerIcon,
  CommandLineIcon,
  LinkIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../../hooks/useTheme';
import { parseCurl, MongoField, CurlCommand } from './utils';
import RequestBuilder from './RequestBuilder';

interface ConnectionConfig {
  connectionString: string;
  database?: string;
}

interface ExecutionConfig {
  count: number;
  isAsync: boolean;
}

interface RequestResult {
  status: number;
  time: number;
  success: boolean;
  error?: string;
}

const ApiTester: FC = () => {
  useTheme();
  const [activeStep, setActiveStep] = useState<'connection' | 'curl' | 'builder' | 'execution' | 'results'>('connection');
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    connectionString: '',
  });
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [mongoFields, setMongoFields] = useState<MongoField[]>([]);
  const [curlCommand, setCurlCommand] = useState<string>('');
  const [parsedCurl, setParsedCurl] = useState<CurlCommand | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig>({
    count: 1,
    isAsync: false,
  });
  const [results, setResults] = useState<RequestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connectionConfig.database && selectedCollection) {
      loadCollectionFields();
    }
  }, [connectionConfig.database, selectedCollection]);

  const handleConnectionSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/mongodb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getCollections',
          connectionString: connectionConfig.connectionString,
          database: connectionConfig.database,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to MongoDB');
      }

      const data = await response.json();
      setCollections(data.collections);
      setActiveStep('curl');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to MongoDB');
    } finally {
      setLoading(false);
    }
  };

  const loadCollectionFields = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/mongodb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getCollectionFields',
          connectionString: connectionConfig.connectionString,
          database: connectionConfig.database,
          collection: selectedCollection,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load collection fields');
      }

      const data = await response.json();
      setMongoFields(data.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection fields');
    } finally {
      setLoading(false);
    }
  };

  const handleCurlSubmit = () => {
    try {
      setError(null);
      const parsed = parseCurl(curlCommand);
      setParsedCurl(parsed);
      setActiveStep('builder');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid CURL command');
    }
  };

  const handleLink = (curlComponent: string, mongoField: string) => {
    setLinks(prev => ({
      ...prev,
      [curlComponent]: mongoField
    }));
  };

  const handleUnlink = (curlComponent: string) => {
    setLinks(prev => {
      const newLinks = { ...prev };
      delete newLinks[curlComponent];
      return newLinks;
    });
  };

  const handleExecutionStart = async () => {
    if (!parsedCurl) return;

    setLoading(true);
    setError(null);
    const newResults: RequestResult[] = [];

    try {
      const response = await fetch('http://localhost:3001/api/mongodb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getCollectionFields',
          connectionString: connectionConfig.connectionString,
          database: connectionConfig.database,
          collection: selectedCollection,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load collection data');
      }

      const data = await response.json();
      const documents = data.fields;

      for (let i = 0; i < executionConfig.count; i++) {
        const doc = documents[i % documents.length];
        const request = buildRequest(parsedCurl, links, doc);

        const startTime = Date.now();
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body,
          });

          newResults.push({
            status: response.status,
            time: Date.now() - startTime,
            success: response.ok,
          });

          if (!executionConfig.isAsync) {
            setResults(prev => [...prev, ...newResults]);
            newResults.length = 0;
          }
        } catch (err) {
          newResults.push({
            status: 0,
            time: Date.now() - startTime,
            success: false,
            error: err instanceof Error ? err.message : 'Request failed',
          });
        }
      }

      if (executionConfig.isAsync) {
        setResults(prev => [...prev, ...newResults]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setLoading(false);
      setActiveStep('results');
    }
  };

  const buildRequest = (curl: CurlCommand, links: Record<string, string>, doc: any) => {
    const replaceValue = (value: string) => {
      return value.replace(/\${([^}]+)}/g, (_, path) => {
        const fieldPath = links[path];
        if (!fieldPath) return '';
        return fieldPath.split('.').reduce((obj: any, key: string) => obj?.[key], doc) || '';
      });
    };

    return {
      method: replaceValue(curl.method),
      url: replaceValue(curl.url),
      headers: Object.fromEntries(
        Object.entries(curl.headers).map(([key, value]) => [
          replaceValue(key),
          replaceValue(value)
        ])
      ),
      body: curl.body ? replaceValue(curl.body) : undefined,
    };
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Progress Steps */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveStep('connection')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            activeStep === 'connection'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <ServerIcon className="w-5 h-5" />
          <span>Connection</span>
        </button>
        <button
          onClick={() => setActiveStep('curl')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            activeStep === 'curl'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <CommandLineIcon className="w-5 h-5" />
          <span>CURL</span>
        </button>
        <button
          onClick={() => setActiveStep('builder')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            activeStep === 'builder'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <LinkIcon className="w-5 h-5" />
          <span>Builder</span>
        </button>
        <button
          onClick={() => setActiveStep('execution')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            activeStep === 'execution'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <ClockIcon className="w-5 h-5" />
          <span>Execution</span>
        </button>
        <button
          onClick={() => setActiveStep('results')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            activeStep === 'results'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <ChartBarIcon className="w-5 h-5" />
          <span>Results</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Connection Configuration */}
      {activeStep === 'connection' && (
        <div className="flex-1 flex flex-col space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              MongoDB Connection String
            </label>
            <input
              type="text"
              value={connectionConfig.connectionString}
              onChange={(e) => setConnectionConfig(prev => ({
                ...prev,
                connectionString: e.target.value
              }))}
              placeholder="mongodb://username:password@host:port/database"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Database (optional)
              </label>
              <input
                type="text"
                value={connectionConfig.database || ''}
                onChange={(e) => setConnectionConfig(prev => ({
                  ...prev,
                  database: e.target.value
                }))}
                placeholder="Database name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Collection
              </label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a collection</option>
                {collections.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleConnectionSubmit}
            disabled={loading || !connectionConfig.connectionString}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              'Connect'
            )}
          </button>
        </div>
      )}

      {/* CURL Command Input */}
      {activeStep === 'curl' && (
        <div className="flex-1 flex flex-col space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              CURL Command
            </label>
            <textarea
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              placeholder="Paste your CURL command here"
              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
          <button
            onClick={handleCurlSubmit}
            disabled={loading || !curlCommand}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              'Parse CURL'
            )}
          </button>
        </div>
      )}

      {/* Request Builder */}
      {activeStep === 'builder' && parsedCurl && (
        <div className="flex-1 flex flex-col space-y-4 p-4">
          <RequestBuilder
            curlCommand={parsedCurl}
            mongoFields={mongoFields}
            onLink={handleLink}
            onUnlink={handleUnlink}
            links={links}
          />
          <button
            onClick={() => setActiveStep('execution')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Continue to Execution
          </button>
        </div>
      )}

      {/* Execution Configuration */}
      {activeStep === 'execution' && (
        <div className="flex-1 flex flex-col space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of Requests
            </label>
            <input
              type="number"
              value={executionConfig.count}
              onChange={(e) => setExecutionConfig(prev => ({
                ...prev,
                count: parseInt(e.target.value)
              }))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={executionConfig.isAsync}
              onChange={(e) => setExecutionConfig(prev => ({
                ...prev,
                isAsync: e.target.checked
              }))}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Execute Asynchronously
            </label>
          </div>
          <button
            onClick={handleExecutionStart}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
            <span className="ml-2">Start Execution</span>
          </button>
        </div>
      )}

      {/* Results Dashboard */}
      {activeStep === 'results' && (
        <div className="flex-1 flex flex-col space-y-4 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Requests
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {results.length}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Success Rate
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Average Time
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {(results.reduce((acc, r) => acc + r.time, 0) / results.length).toFixed(0)}ms
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((result, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.success
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {result.time}ms
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {result.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiTester;