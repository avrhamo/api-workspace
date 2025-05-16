import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../hooks/useTheme';

declare global {
  interface Window {
    electronAPI: {
      killPort: (port: number) => Promise<{
        success: boolean;
        message?: string;
        error?: string;
        pids?: number[];
      }>;
    };
  }
}

const PortKiller: React.FC = () => {
  const { theme } = useTheme();
  const [port, setPort] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(theme);

  // Subscribe to theme changes
  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  const handleKill = async () => {
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      if (!port.match(/^\d+$/)) {
        throw new Error('Please enter a valid port number.');
      }

      const portNumber = parseInt(port, 10);
      if (portNumber < 1 || portNumber > 65535) {
        throw new Error('Port number must be between 1 and 65535.');
      }

      const response = await window.electronAPI.killPort(portNumber);
      
      if (response.success) {
        setResult(response.message || `Successfully killed process(es) on port ${port}`);
      } else {
        setError(response.error || 'Failed to kill process on port');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <h2 className={`text-2xl font-semibold mb-2 ${
        currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'
      }`}>
        Port Killer
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Enter a port number to kill any process using it. This will forcefully terminate any process listening on the specified port.
      </p>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={port}
          onChange={e => setPort(e.target.value)}
          placeholder="Port number (e.g. 3000)"
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40"
        />
        <button
          onClick={handleKill}
          disabled={loading || !port}
          className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
            loading || !port
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {loading ? 'Killing...' : 'Kill Port'}
        </button>
      </div>
      {result && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
          {result}
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default PortKiller; 