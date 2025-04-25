import React, { useState } from 'react';

interface MongoDBConnectionFormProps {
  onSubmit: (config: { connectionString: string }) => void;
  defaultConnectionString?: string;
}

export const MongoDBConnectionForm: React.FC<MongoDBConnectionFormProps> = ({ 
  onSubmit, 
  defaultConnectionString = 'mongodb://localhost:27017' 
}) => {
  const [connectionString, setConnectionString] = useState(defaultConnectionString);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnecting(true);

    try {
      const result = await window.electronAPI.connectToMongoDB(connectionString);
      if (result.success) {
        onSubmit({ connectionString });
      } else {
        setError(result.error || 'Failed to connect');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label 
          htmlFor="connectionString" 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          MongoDB Connection String
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            id="connectionString"
            type="text"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            placeholder="mongodb://username:password@host:port/database"
            className={`
              block w-full px-4 py-3 rounded-md border
              text-sm font-mono
              transition-colors duration-200
              ${error 
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-700 dark:text-red-100' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
            `}
            required
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isConnecting}
          className={`
            inline-flex items-center px-6 py-3 border border-transparent
            text-sm font-medium rounded-md shadow-sm
            transition-colors duration-200
            ${isConnecting
              ? 'bg-gray-400 cursor-not-allowed dark:bg-gray-600'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900'
            }
            text-white
          `}
        >
          <span className="flex items-center space-x-2">
            {isConnecting && (
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isConnecting ? 'Connecting...' : 'Connect'}
          </span>
        </button>
      </div>
    </form>
  );
};