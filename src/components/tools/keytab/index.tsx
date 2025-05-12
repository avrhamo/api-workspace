import React, { useState, useCallback } from 'react';
import { BaseToolProps } from '../types';

interface KeytabEntry {
  principal: string;
  kvno: number;
  timestamp: string;
  encryptionType: string;
}

interface KeytabState {
  entries: KeytabEntry[];
  error: string | null;
  fileName: string | null;
  isProcessing: boolean;
}

const Keytab: React.FC<BaseToolProps> = ({ state, setState }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processKeytabFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processKeytabFile(files[0]);
    }
  }, []);

  const processKeytabFile = async (file: File) => {
    try {
      setState({ ...state, isProcessing: true, error: null });
      
      // Read the file content
      const content = await file.arrayBuffer();
      
      // Call electron API to process the keytab
      const result = await window.electronAPI.processKeytab(content);
      
      if (result.success) {
        setState({
          ...state,
          entries: result.entries,
          fileName: file.name,
          error: null,
          isProcessing: false
        });
      } else {
        throw new Error(result.error || 'Failed to process keytab file');
      }
    } catch (error) {
      setState({
        ...state,
        error: error instanceof Error ? error.message : 'An error occurred while processing the keytab file',
        isProcessing: false
      });
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Keytab Viewer</h2>
        {state.fileName && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            File: {state.fileName}
          </span>
        )}
      </div>

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8
          ${dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600'
          }
          transition-colors duration-200
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="keytab-file"
          className="hidden"
          accept=".keytab"
          onChange={handleFileSelect}
        />
        <label
          htmlFor="keytab-file"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <svg
            className="w-12 h-12 mb-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Drag and drop your keytab file here, or click to select
          </span>
        </label>
      </div>

      {state.isProcessing && (
        <div className="flex items-center justify-center p-4">
          <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Processing keytab file...</span>
          </div>
        </div>
      )}

      {state.error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          {state.error}
        </div>
      )}

      {state.entries && state.entries.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Keytab Entries</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Principal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    KVNO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Encryption Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {state.entries.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                      {entry.principal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.kvno}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.encryptionType}
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

export default Keytab;