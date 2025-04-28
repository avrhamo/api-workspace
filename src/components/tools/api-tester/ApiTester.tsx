import React, { useState } from 'react';
import { MongoDBConnectionForm } from './MongoDBConnectionForm';
import { DatabaseCollectionSelector } from './DatabaseCollectionSelector';
import { CurlCommandInput } from './CurlCommandInput';
import { CurlFieldMapper } from './CurlFieldMapper';
import { TestExecutor } from './TestExecutor';

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

export const ApiTester: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    connectionString: 'mongodb://localhost:27017',
  });
  const [curlConfig, setCurlConfig] = useState<CurlConfig>({
    parsedCommand: {
      rawCommand: ''
    },
    mappedFields: {},
  });
  const [testConfig, setTestConfig] = useState<TestConfig>({
    numberOfRequests: 1,
    isAsync: false,
    batchSize: 100,
  });
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  const handleDatabaseSelect = async (db: string, collection: string) => {
    setConnectionConfig(prev => ({
      ...prev,
      database: db,
      collection: collection
    }));

    try {
      // Fetch a sample document to extract fields
      const result = await window.electronAPI.findOne(db, collection);
      if (result.success && result.document) {
        const fields = extractDocumentFields(result.document);
        setAvailableFields(fields);
      }
    } catch (error) {
      console.error('Failed to fetch sample document:', error);
    }

    setStep(3);
  };

  // Helper function to extract fields from document
  const extractDocumentFields = (doc: any, prefix = ''): string[] => {
    if (!doc) return [];
    
    return Object.entries(doc).flatMap(([key, value]) => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return extractDocumentFields(value, fullPath);
      }
      return [fullPath];
    });
  };

  const steps = [
    { number: 1, title: 'Connect', description: 'Configure MongoDB connection' },
    { number: 2, title: 'Select Data', description: 'Choose database and collection' },
    { number: 3, title: 'API Setup', description: 'Configure CURL command' },
    { number: 4, title: 'Map Fields', description: 'Map MongoDB fields to API response' },
    { number: 5, title: 'Test', description: 'Execute and monitor tests' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {steps.map((s) => (
              <div key={s.number} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm
                  transition-all duration-200 ease-in-out
                  ${step === s.number 
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900' 
                    : step > s.number 
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}>
                  {step > s.number ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    s.number
                  )}
                </div>
                {s.number < steps.length && (
                  <div className={`w-24 h-1 mx-2 rounded-full transition-colors duration-200
                    ${step > s.number 
                      ? 'bg-green-500' 
                      : 'bg-gray-200 dark:bg-gray-700'}`} 
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {steps[step - 1].title}
            </h2>
            <span className="mx-2 text-gray-500 dark:text-gray-400">—</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {steps[step - 1].description}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 transition-colors duration-200">
          {step === 1 && (
            <MongoDBConnectionForm
              defaultConnectionString="mongodb://localhost:27017"
              onSubmit={(config) => {
                setConnectionConfig(config);
                setStep(2);
              }}
            />
          )}
          
          {step === 2 && (
            <DatabaseCollectionSelector
              connectionConfig={connectionConfig}
              onSelect={handleDatabaseSelect}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <CurlCommandInput
              initialCommand={curlConfig.parsedCommand.rawCommand}
              onCommandChange={(parsedCommand) => {
                setCurlConfig(prev => ({
                  ...prev,
                  parsedCommand
                }));
                setStep(4);
              }}
              availableFields={availableFields}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <CurlFieldMapper
              parsedCommand={curlConfig.parsedCommand}
              connectionConfig={connectionConfig}
              onMap={(mappedFields) => {
                console.log('[CURL FIELD MAPPER] Proceeding to test with:', {
                  parsedCommand: curlConfig.parsedCommand,
                  mappedFields
                });
                setCurlConfig(prev => ({
                  ...prev,
                  mappedFields
                }));
                setStep(5);
              }}
              onBack={() => setStep(3)}
            />
          )}

          {step === 5 && (
            <TestExecutor
              connectionConfig={connectionConfig}
              curlConfig={curlConfig}
              testConfig={testConfig}
              onConfigChange={setTestConfig}
              onConnectionConfigChange={setConnectionConfig}
              onCurlConfigChange={setCurlConfig}
              onBack={() => setStep(4)}
            />
          )}
        </div>
      </div>
    </div>
  );
};