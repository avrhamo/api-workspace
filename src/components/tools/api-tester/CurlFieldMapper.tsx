import React, { useState, useEffect } from 'react';

interface ConnectionConfig {
  connectionString: string;
  database?: string;
  collection?: string;
}

interface CurlFieldMapperProps {
  parsedCommand: any;
  connectionConfig: ConnectionConfig;
  onMap: (mappedFields: Record<string, string>) => void;
  onBack?: () => void;
}

export const CurlFieldMapper: React.FC<CurlFieldMapperProps> = ({
  parsedCommand,
  connectionConfig,
  onMap,
  onBack
}) => {
  const [mappedFields, setMappedFields] = useState<Record<string, string>>({});
  const [sampleDocument, setSampleDocument] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSampleDocument = async () => {
      try {
        const result = await window.electronAPI.findOne(
          connectionConfig.database!,
          connectionConfig.collection!
        );
        
        if (result.success) {
          setSampleDocument(result.document);
        } else {
          setError(result.error || 'Failed to fetch sample document');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    if (connectionConfig.database && connectionConfig.collection) {
      fetchSampleDocument();
    }
  }, [connectionConfig.database, connectionConfig.collection]);

  // Extract fields from the parsed command body
  const extractFields = () => {
    if (!parsedCommand?.data) return [];
    try {
      const data = typeof parsedCommand.data === 'string' 
        ? JSON.parse(parsedCommand.data) 
        : parsedCommand.data;
      
      return Object.keys(data);
    } catch (error) {
      console.error('Error parsing command data:', error);
      return [];
    }
  };

  // Extract fields from the sample document
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

  const fields = extractFields();
  const documentFields = sampleDocument ? extractDocumentFields(sampleDocument) : [];

  const handleFieldMap = (field: string, mappedTo: string) => {
    setMappedFields(prev => ({
      ...prev,
      [field]: mappedTo,
    }));
  };

  const handleSubmit = () => {
    onMap(mappedFields);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex-1 text-center">
          Map CURL Parameters to Database Fields
        </h3>
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

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">CURL Fields</h4>
          {fields.map(field => (
            <div key={field} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Map {field} to:
              </label>
              <select
                value={mappedFields[field] || ''}
                onChange={(e) => handleFieldMap(field, e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a field</option>
                {documentFields.map(docField => (
                  <option key={docField} value={docField}>
                    {docField}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sample Document</h4>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {JSON.stringify(sampleDocument, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSubmit}
          disabled={fields.length === 0 || !sampleDocument}
          className={`
            inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white
            ${fields.length === 0 || !sampleDocument
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