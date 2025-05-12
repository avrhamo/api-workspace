import React, { useState } from 'react';

const PortKiller: React.FC = () => {
  const [port, setPort] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleKill = async () => {
    setResult(null);
    setError(null);
    setLoading(true);
    // Placeholder: Implement actual port killing logic via Electron main process or backend
    setTimeout(() => {
      setLoading(false);
      if (!port.match(/^\d+$/)) {
        setError('Please enter a valid port number.');
        return;
      }
      setResult(`(Simulated) Killed process on port ${port}`);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <h2 className="text-2xl font-semibold mb-2">Port Killer</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">Enter a port number to kill any process using it.</p>
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
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={loading}
        >
          {loading ? 'Killing...' : 'Kill Port'}
        </button>
      </div>
      {result && <div className="mt-4 text-green-600 dark:text-green-400">{result}</div>}
      {error && <div className="mt-4 text-red-600 dark:text-red-400">{error}</div>}
    </div>
  );
};

export default PortKiller; 