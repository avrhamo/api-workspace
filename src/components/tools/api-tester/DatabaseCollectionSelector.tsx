import React, { useState, useEffect } from 'react';

interface ConnectionConfig {
  connectionString: string;
  database?: string;
  collection?: string;
  query?: string;
}

interface DatabaseCollectionSelectorProps {
  connectionConfig: ConnectionConfig;
  onSelect: (database: string, collection: string, query?: string) => void;
  onBack?: () => void;
}

export const DatabaseCollectionSelector: React.FC<DatabaseCollectionSelectorProps> = ({
  connectionConfig,
  onSelect,
  onBack
}) => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.listDatabases();
      if (result.success && result.databases) {
        setDatabases(result.databases.map(db => db.name));
      } else {
        setError(result.error || 'Failed to load databases');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCollections = async (dbName: string) => {
    setIsLoading(true);
    setError(null); 
    try {
      const result = await window.electronAPI.listCollections(dbName);
      if (result.success && result.collections) {
        setCollections(result.collections.map(col => col.name));
      } else {
        setError(result.error || 'Failed to load collections');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseSelect = async (dbName: string) => {
    setSelectedDb(dbName);
    setSelectedCollection('');
    if (dbName) {
      await loadCollections(dbName);
    } else {
      setCollections([]);
    }
  };

  const handleCollectionSelect = (collectionName: string) => {
    setSelectedCollection(collectionName);
  };

  const handleContinue = () => {
    if (selectedDb && selectedCollection) {
      if (query) {
        try {
          JSON.parse(query);
          setQueryError(null);
        } catch (e) {
          setQueryError('Invalid JSON query format');
          return;
        }
      }
      onSelect(selectedDb, selectedCollection, query || undefined);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
          <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 
              text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 
              bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
              dark:focus:ring-offset-gray-900 mr-4"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        )}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex-1 text-center">
          Select Database and Collection
        </h3>
        <div className="w-[88px]"></div> {/* Spacer to balance the back button */}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label 
            htmlFor="database" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Select Database
          </label>
          <select
            id="database"
            value={selectedDb}
            onChange={(e) => handleDatabaseSelect(e.target.value)}
            className="
              mt-1 block w-full pl-3 pr-10 py-2
              text-base border-gray-300 dark:border-gray-600
              focus:outline-none focus:ring-blue-500 focus:border-blue-500
              dark:bg-gray-700 dark:text-white
              rounded-md shadow-sm
            "
          >
            <option value="">Select a database</option>
            {databases.map(db => (
              <option key={db} value={db}>{db}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="collection" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Select Collection
          </label>
          <select
            id="collection"
            value={selectedCollection}
            onChange={(e) => handleCollectionSelect(e.target.value)}
            disabled={!selectedDb}
            className="
              mt-1 block w-full pl-3 pr-10 py-2
              text-base border-gray-300 dark:border-gray-600
              focus:outline-none focus:ring-blue-500 focus:border-blue-500
              dark:bg-gray-700 dark:text-white
              rounded-md shadow-sm
              disabled:bg-gray-100 disabled:text-gray-500
              dark:disabled:bg-gray-800 dark:disabled:text-gray-400
            "
          >
            <option value="">Select a collection</option>
            {collections.map(collection => (
              <option key={collection} value={collection}>{collection}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <label 
          htmlFor="query" 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Query (Optional)
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            - MongoDB query in JSON format
          </span>
        </label>
        <textarea
          id="query"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setQueryError(null);
          }}
          placeholder='{"field": "value"}'
          className={`
            mt-1 block w-full px-4 py-2
            text-sm font-mono
            border rounded-md shadow-sm
            transition-colors duration-200
            ${queryError 
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-700 dark:text-red-100' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
            }
            focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
            min-h-[100px] resize-y
          `}
        />
        {queryError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {queryError}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter a MongoDB query in JSON format to filter the documents. Leave empty to use all documents.
        </p>
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

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!selectedDb || !selectedCollection}
          className={`
            inline-flex items-center px-6 py-3 border border-transparent
            text-sm font-medium rounded-md shadow-sm
            transition-colors duration-200
            ${(!selectedDb || !selectedCollection)
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900'
            }
            text-white
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
