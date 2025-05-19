import React, { useState } from 'react';
import { ChevronLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../../hooks/useTheme';

declare global {
  interface Window {
    electronAPI: {
      executeRequest: (config: any) => Promise<{ success: boolean; error?: string }>;
      executeRequests: (configs: any[]) => Promise<Array<{ success: boolean; error?: string; duration: number }>>;
      mongodb: {
        initializeBatch: (config: { 
          database: string; 
          collection: string; 
          query?: any; 
          batchSize?: number; 
        }) => Promise<{ success: boolean; batchId?: string; error?: string }>;
        getNextDocument: (batchId: string) => Promise<{ success: boolean; document?: any; error?: string }>;
        closeBatch: (batchId: string) => Promise<{ success: boolean; error?: string }>;
      }
    }
  }
}

interface ConnectionConfig {
  connectionString: string;
  database?: string;
  collection?: string;
  query?: any;
}

interface MappedFieldConfig {
  targetField: string;
  type: string;
}

interface CurlConfig {
  parsedCommand: {
    rawCommand: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    data?: any;
  };
  mappedFields: Record<string, MappedFieldConfig>;
}

interface TestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: any;
  numberOfRequests: number;
  concurrent: boolean;
  mappedFields?: Record<string, string>;
  connectionConfig?: {
    database: string;
    collection: string;
    query?: string;
    connectionString: string;
  };
}

interface TestExecutorProps {
  connectionConfig: ConnectionConfig;
  curlConfig: CurlConfig;
  testConfig: TestConfig;
  onConfigChange: (config: TestConfig) => void;
  onConnectionConfigChange: (config: ConnectionConfig) => void;
  onCurlConfigChange: (config: CurlConfig) => void;
  onBack: () => void;
}

interface TestResult {
  success: boolean;
  duration: number;
  error?: string;
}

interface BatchDocument {
  document: any;
  index: number;
}

export const TestExecutor: React.FC<TestExecutorProps> = ({
  connectionConfig,
  curlConfig,
  testConfig,
  onConfigChange,
  onConnectionConfigChange,
  onCurlConfigChange,
  onBack
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [averageTime, setAverageTime] = useState<number | null>(null);
  const { theme } = useTheme();

  const handleConfigChange = (updates: Partial<TestConfig>) => {
    onConfigChange({
      ...testConfig,
      ...updates
    });
  };

  const executeTest = async () => {
    console.log('Starting test execution...');
    setIsRunning(true);
    setResults([]);
    setAverageTime(null);

    const startTime = performance.now();
    let batchId: string | undefined;
    let batchDocuments: BatchDocument[] = [];

    try {
      // Add detailed logging for MongoDB initialization conditions
      console.log('Checking MongoDB initialization conditions:', {
        hasMappedFields: !!curlConfig.mappedFields,
        mappedFieldsCount: curlConfig.mappedFields ? Object.keys(curlConfig.mappedFields).length : 0,
        hasConnectionConfig: !!connectionConfig,
        connectionConfig: connectionConfig,
        mappedFields: curlConfig.mappedFields
      });

      // If we have MongoDB mapping, get all documents we need upfront
      if (curlConfig.mappedFields && Object.keys(curlConfig.mappedFields).length > 0 && connectionConfig) {
        console.log('MongoDB initialization conditions met, proceeding with batch initialization...');
        console.log('Initializing MongoDB batch...', {
          database: connectionConfig.database,
          collection: connectionConfig.collection,
          numberOfRequests: testConfig.numberOfRequests
        });

        const { database, collection, query } = connectionConfig;
        if (!database || !collection) {
          throw new Error('Database and collection are required for MongoDB mapping');
        }

        // Initialize batch and get all documents we need
        const batchResult = await window.electronAPI.mongodb.initializeBatch({
          database,
          collection,
          query,
          batchSize: testConfig.numberOfRequests
        });

        if (!batchResult.success || !batchResult.batchId) {
          throw new Error(batchResult.error || 'Failed to initialize batch');
        }

        batchId = batchResult.batchId;
        console.log('Batch initialized successfully:', { batchId });

        // Get all documents we need
        console.log('Fetching documents from batch...');
        for (let i = 0; i < testConfig.numberOfRequests; i++) {
          console.log(`Fetching document ${i + 1}/${testConfig.numberOfRequests}`);
          const result = await window.electronAPI.mongodb.getNextDocument(batchId);
          if (!result.success) {
            throw new Error(result.error || 'Failed to get document from batch');
          }
          if (result.document) {
            // Get the first mapped field (we'll handle multiple fields later if needed)
            const mappedFieldKey = Object.keys(curlConfig.mappedFields)[0];
            const mappedField = curlConfig.mappedFields[mappedFieldKey];
            console.log(`Document ${i + 1} fetched successfully:`, {
              document: result.document,
              mappedFieldKey,
              mappedField,
              expectedValue: result.document[mappedField.targetField]
            });
            batchDocuments.push({ document: result.document, index: i });
          } else {
            console.warn(`No document available for index ${i}`);
          }
        }
        console.log(`Fetched ${batchDocuments.length} documents total`);
      } else {
        console.log('MongoDB initialization skipped:', {
          reason: !curlConfig.mappedFields ? 'No mapped fields' :
                  Object.keys(curlConfig.mappedFields).length === 0 ? 'Empty mapped fields' :
                  !connectionConfig ? 'No connection config' : 'Unknown'
        });
      }

      // Prepare all requests upfront
      console.log('Preparing requests...');
      const requests = Array(testConfig.numberOfRequests).fill(null).map((_, index) => {
        // Get the corresponding MongoDB document if we have one
        const batchDoc = batchDocuments.find(doc => doc.index === index);
        const mappedFieldKey = Object.keys(curlConfig.mappedFields)[0];
        const mappedField = curlConfig.mappedFields[mappedFieldKey];
        
        console.log(`Preparing request ${index + 1}/${testConfig.numberOfRequests}`, {
          hasMongoDocument: !!batchDoc,
          mongoDocument: batchDoc?.document,
          mappedFields: curlConfig.mappedFields,
          mappedFieldKey,
          targetField: mappedField.targetField,
          expectedValue: batchDoc?.document?.[mappedField.targetField]
        });
        
        // Process the request data
        let processedData = curlConfig.parsedCommand.data;
        if (typeof processedData === 'string') {
          try {
            processedData = JSON.parse(processedData);
          } catch (e) {
            console.warn('Failed to parse request body as JSON:', e);
          }
        }

        console.log('Original curl command:', {
          method: curlConfig.parsedCommand.method,
          url: curlConfig.parsedCommand.url,
          headers: curlConfig.parsedCommand.headers,
          mappedFields: curlConfig.mappedFields
        });

        // Create the base request config
        const requestConfig = {
          method: curlConfig.parsedCommand.method || 'GET',
          url: curlConfig.parsedCommand.url || '',
          headers: { ...curlConfig.parsedCommand.headers } || {},
          data: processedData,
          mappedFields: curlConfig.mappedFields,
          connectionConfig,
          mongoDocument: batchDoc?.document
        };

        console.log('Initial request config:', {
          method: requestConfig.method,
          url: requestConfig.url,
          headers: requestConfig.headers,
          mappedFields: requestConfig.mappedFields
        });

        // Process mapped fields based on their type
        if (batchDoc?.document && requestConfig.mappedFields) {
          console.log('Processing mapped fields for document:', {
            document: batchDoc.document,
            mappedFields: requestConfig.mappedFields
          });

          Object.entries(requestConfig.mappedFields).forEach(([mappedFieldKey, mappedField]) => {
            const value = batchDoc.document[mappedField.targetField];
            console.log(`Processing field ${mappedFieldKey}:`, {
              targetField: mappedField.targetField,
              value,
              valueType: typeof value,
              originalHeaderValue: requestConfig.headers[mappedFieldKey.replace('headers.', '')]
            });

            if (value) {
              if (mappedFieldKey.startsWith('url.queryParams.')) {
                // Handle query parameters
                const paramName = mappedFieldKey.replace('url.queryParams.', '');
                const urlObj = new URL(requestConfig.url);
                urlObj.searchParams.set(paramName, value.toString());
                requestConfig.url = urlObj.toString();
                console.log(`Updated URL with query param:`, {
                  paramName,
                  value,
                  newUrl: requestConfig.url
                });
              } else if (mappedFieldKey.startsWith('header.')) {
                // Handle headers
                const parts = mappedFieldKey.split('.');
                const headerName = parts[1]; // e.g., 'encodedHeader'
                const fieldPath = parts.slice(2).join('.'); // e.g., 'email'
                
                console.log(`Processing header field:`, {
                  mappedFieldKey,
                  parts,
                  headerName,
                  fieldPath,
                  value
                });

                const originalValue = requestConfig.headers[headerName];
                console.log(`Processing header ${headerName}:`, {
                  originalValue,
                  newValue: value,
                  isBase64: originalValue && /^[A-Za-z0-9+/=]+$/.test(originalValue)
                });

                if (originalValue && /^[A-Za-z0-9+/=]+$/.test(originalValue)) {
                  try {
                    const decodedValue = atob(originalValue);
                    console.log('Decoded header value:', {
                      original: originalValue,
                      decoded: decodedValue
                    });
                    
                    const headerObj = JSON.parse(decodedValue);
                    console.log('Parsed header object:', headerObj);
                    
                    // Update the specific field in the object using the field path
                    headerObj[fieldPath] = value;
                    console.log('Updated header object:', headerObj);
                    
                    // Encode back to base64
                    const newValue = btoa(JSON.stringify(headerObj));
                    requestConfig.headers[headerName] = newValue;
                    console.log('Final header value:', {
                      headerName,
                      newValue,
                      decoded: atob(newValue)
                    });
                  } catch (e) {
                    console.error('Error processing base64 header:', {
                      error: e,
                      headerName,
                      fieldPath,
                      originalValue,
                      value
                    });
                    // Fallback to direct value if processing fails
                    requestConfig.headers[headerName] = value.toString();
                  }
                } else {
                  requestConfig.headers[headerName] = value.toString();
                }
              }
            }
          });
        }

        console.log('Final request config:', {
          method: requestConfig.method,
          url: requestConfig.url,
          headers: requestConfig.headers,
          mappedFields: Object.keys(requestConfig.mappedFields)
        });

        return requestConfig;
      });
      console.log('All requests prepared');

      // Execute all requests at once
      console.log('Executing all requests...');
      const results = await window.electronAPI.executeRequests(requests);
      console.log('All requests completed', {
        totalRequests: results.length,
        successfulRequests: results.filter(r => r.success).length,
        failedRequests: results.filter(r => !r.success).length
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      setAverageTime(totalTime / testConfig.numberOfRequests);
      setResults(results.map((result, index) => ({
        ...result,
        duration: result.duration || 0
      })));

    } catch (error) {
      console.error('Test execution failed:', error);
      throw error;
    } finally {
      // Always close the batch if it was initialized
      if (batchId) {
        console.log('Closing batch...', { batchId });
        await window.electronAPI.mongodb.closeBatch(batchId);
        console.log('Batch closed');
      }
    }

    console.log('Test execution completed');
    setIsRunning(false);
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
              onChange={(e) => handleConfigChange({ numberOfRequests: parseInt(e.target.value, 10) })}
              placeholder="Enter number of requests"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
              aria-label="Number of requests to execute"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 py-4">
          <input
            type="checkbox"
            id="async"
            checked={testConfig.concurrent}
            onChange={(e) => handleConfigChange({ concurrent: e.target.checked })}
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