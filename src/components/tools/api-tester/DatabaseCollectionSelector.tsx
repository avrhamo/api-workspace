import React, { useState, useEffect } from 'react';

interface DatabaseCollectionSelectorProps {
  onSelect: (database: string, collection: string) => void;
  onBack?: () => void;
}

export const DatabaseCollectionSelector: React.FC<DatabaseCollectionSelectorProps> = ({
  onSelect,
  onBack,
}) => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      onSelect(selectedDb, selectedCollection);
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
              shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 
              bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
              dark:focus:ring-offset-gray-900"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        )}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex-1 text-center">
          Select Database and Collection
        </h3>
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
