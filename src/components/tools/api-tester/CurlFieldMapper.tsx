import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { CurlAnalyzer } from './components/CurlAnalyzer';

interface ConnectionConfig {
  connectionString: string;
  database?: string;
  collection?: string;
}

interface MappingInfo {
  targetField: string;
  type: 'mongodb' | 'fixed' | 'special';
  value?: string;
}

interface CurlFieldMapperProps {
  parsedCommand: {
    rawCommand: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    data?: any;
  };
  connectionConfig: ConnectionConfig;
  onMap: (mappedFields: Record<string, MappingInfo>, updatedParsedCommand: {
    rawCommand: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    data?: any;
  }) => void;
  onBack?: () => void;
}

export const CurlFieldMapper: React.FC<CurlFieldMapperProps> = ({
  parsedCommand,
  connectionConfig,
  onMap,
  onBack
}) => {
  const [mappedFields, setMappedFields] = useState<Record<string, MappingInfo>>({});
  const [sampleDocument, setSampleDocument] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documentFields, setDocumentFields] = useState<string[]>([]);

  useEffect(() => {
    const fetchSampleDocument = async () => {
      setIsLoading(true);
      try {
        const result = await window.electronAPI.findOne(
          connectionConfig.database!,
          connectionConfig.collection!
        );
        
        if (result.success) {
          setSampleDocument(result.document);
          const fields = extractDocumentFields(result.document);
          setDocumentFields(fields);
        } else {
          setError(result.error || 'Failed to fetch sample document');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (connectionConfig.database && connectionConfig.collection) {
      fetchSampleDocument();
    }
  }, [connectionConfig.database, connectionConfig.collection]);

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

  const handleFieldMap = (field: string, mappingInfo: MappingInfo) => {
    console.log('[CurlFieldMapper] Field mapping received:', { field, mappingInfo });
    setMappedFields(prev => ({
      ...prev,
      [field]: mappingInfo,
    }));
  };

  const handleSubmit = () => {
    console.log('[CurlFieldMapper] Submitting mapped fields:', {
      mappedFields,
      parsedCommand: {
        ...parsedCommand,
        data: typeof parsedCommand.data === 'string' 
          ? parsedCommand.data.substring(0, 100) + '...' 
          : parsedCommand.data
      }
    });

    onMap(mappedFields, parsedCommand);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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

      {/* API Request Info */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            parsedCommand.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            parsedCommand.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            parsedCommand.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
            parsedCommand.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {parsedCommand.method || 'UNKNOWN'}
          </span>
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
            {parsedCommand.url || 'No URL provided'}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* CURL Analysis Section */}
        <CurlAnalyzer
          curlCommand={parsedCommand.rawCommand}
          onFieldMap={handleFieldMap}
          availableFields={documentFields}
          requestData={parsedCommand.data}
        />

        {/* Sample Document Preview */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Sample Document Structure
          </h4>
          <div className="bg-white dark:bg-gray-700 p-4 rounded-md overflow-auto max-h-[300px]">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {JSON.stringify(sampleDocument, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSubmit}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}; 