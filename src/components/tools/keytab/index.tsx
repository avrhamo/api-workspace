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

  // State for create keytab form
  const [createForm, setCreateForm] = useState({
    principal: '',
    password: '',
    encryptionType: 'arcfour-hmac',
    kvno: 1,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag event:', e.type, 'DataTransfer types:', e.dataTransfer.types);
    
    // Check if the dragged item is a file or a URI
    const hasFiles = e.dataTransfer.types.includes('Files');
    const hasUriList = e.dataTransfer.types.includes('text/uri-list') || 
                      e.dataTransfer.types.includes('application/vnd.code.uri-list');
    
    console.log('Has files:', hasFiles, 'Has URI list:', hasUriList);
    
    if (e.type === "dragenter" || e.type === "dragover") {
      if (hasFiles || hasUriList) {
        e.dataTransfer.dropEffect = 'copy';
        setDragActive(true);
      }
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event triggered');
    console.log('DataTransfer types:', e.dataTransfer.types);
    console.log('DataTransfer items:', e.dataTransfer.items);
    setDragActive(false);

    try {
      let fileToProcess: File | null = null;

      // First try to get the file from files (direct file system drag)
      if (e.dataTransfer.files.length > 0) {
        fileToProcess = e.dataTransfer.files[0];
      } 
      // If no files, try to get from items (editor drag)
      else if (e.dataTransfer.items.length > 0) {
        // Try to get the URI or file path from the items
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i];
          if (item.kind === 'string') {
            // Get the string (could be a URI or a plain path)
            const str = await new Promise<string>((resolve) => {
              item.getAsString((s) => resolve(s));
            });

            console.log('Got string from drag:', str);

            // Handle file:// URIs
            if (str.startsWith('file://')) {
              const filePath = decodeURIComponent(str.replace('file://', ''));
              console.log('File path from file:// URI:', filePath);
              const result = await window.electronAPI.readFile(filePath);
              if (result.success) {
                const fileName = filePath.split('/').pop() || 'keytab';
                const fileContent = new Uint8Array(result.content);
                fileToProcess = new File([fileContent], fileName, { type: 'application/octet-stream' });
                break;
              }
            }
            // Handle plain absolute file paths (from editors)
            else if (str.startsWith('/')) {
              const filePath = str;
              console.log('Detected plain file path:', filePath);
              const result = await window.electronAPI.readFile(filePath);
              if (result.success) {
                const fileName = filePath.split('/').pop() || 'keytab';
                const fileContent = new Uint8Array(result.content);
                fileToProcess = new File([fileContent], fileName, { type: 'application/octet-stream' });
                break;
              }
            }
          }
        }
      }

      if (fileToProcess) {
        console.log('Processing file:', fileToProcess.name, 'type:', fileToProcess.type, 'size:', fileToProcess.size);
        await processKeytabFile(fileToProcess);
      } else {
        console.error('No valid file found in drop event');
        setState({
          ...state,
          error: 'No valid file was dropped. Please try dragging the file from Finder instead of the editor.',
          isProcessing: false
        });
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      setState({
        ...state,
        error: error instanceof Error ? error.message : 'An error occurred while processing the dropped file',
        isProcessing: false
      });
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
      console.log('Starting to process file:', file.name, 'type:', file.type, 'size:', file.size);
      setState({ ...state, isProcessing: true, error: null });
      
      // Read the file content
      console.log('Reading file content...');
      const content = await file.arrayBuffer();
      console.log('File content read, size:', content.byteLength);
      
      // Call electron API to process the keytab
      console.log('Calling electron API...');
      const result = await window.electronAPI.processKeytab(content);
      console.log('API result:', result);
      
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
      console.error('Error processing keytab:', error);
      setState({
        ...state,
        error: error instanceof Error ? error.message : 'An error occurred while processing the keytab file',
        isProcessing: false
      });
    }
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateForm(f => ({
      ...f,
      [name]: name === 'kvno' ? Number(value) : value,
    }));
    setCreateError(null);
    setCreateSuccess(null);
  };

  const handleCreateKeytab = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    // Validation
    if (!createForm.principal.trim()) {
      setCreateError('Principal is required.');
      return;
    }
    if (!createForm.password) {
      setCreateError('Password is required.');
      return;
    }
    if (!createForm.encryptionType) {
      setCreateError('Encryption type is required.');
      return;
    }
    setIsCreating(true);
    try {
      const result = await window.electronAPI.processCreateKeytab({
        principal: createForm.principal.trim(),
        password: createForm.password,
        encryptionType: createForm.encryptionType,
        kvno: createForm.kvno || 1,
      });
      if (result.success) {
        setCreateSuccess('Keytab file created successfully!');
      } else {
        setCreateError(result.error || 'Failed to create keytab file.');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create keytab file.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-6 overflow-auto max-h-screen">
      {/* Create Keytab Form */}
      <form onSubmit={handleCreateKeytab} className="mb-6 bg-white dark:bg-gray-900 rounded-xl shadow p-6 space-y-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Create Keytab</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Principal <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="principal"
              value={createForm.principal}
              onChange={handleCreateChange}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="testuser@TEST.REALM"
              required
              title="Principal (e.g. testuser@TEST.REALM)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password <span className="text-red-500">*</span></label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={createForm.password}
                onChange={handleCreateChange}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                required
                placeholder="Password"
                title="Password for the principal"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.122-2.122A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.122 2.122A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.122-2.122A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.122 2.122A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-6 0a6 6 0 1112 0 6 6 0 01-12 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Encryption Type</label>
            <input
              type="text"
              value="arcfour-hmac"
              disabled
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              title="Only arcfour-hmac is supported"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KVNO (optional)</label>
            <input
              type="number"
              name="kvno"
              value={createForm.kvno}
              min={1}
              onChange={handleCreateChange}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
              title="Key Version Number (KVNO)"
            />
          </div>
        </div>
        {createError && <div className="text-red-600 dark:text-red-400 font-medium">{createError}</div>}
        {createSuccess && <div className="text-green-600 dark:text-green-400 font-medium">{createSuccess}</div>}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Keytab'}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Keytab Viewer</h2>
        {state.fileName && (
          <span className="text-base font-semibold px-3 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-sm">
            File: {state.fileName}
          </span>
        )}
      </div>

      <div
        className={
          `relative border-2 border-dashed rounded-xl p-8 mb-6 flex flex-col items-center justify-center transition-colors duration-200 ` +
          (dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60')
        }
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
            className="w-14 h-14 mb-3 text-blue-400 dark:text-blue-300"
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
          <span className="text-base font-medium text-gray-700 dark:text-gray-200">
            Drag and drop your keytab file here, or <span className="underline text-blue-600 dark:text-blue-400">click to select</span>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Keytab Entries</h3>
          <div className="overflow-x-auto rounded-xl shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-xl overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">KVNO</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Encryption Type</th>
                </tr>
              </thead>
              <tbody>
                {state.entries.map((entry, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0
                      ? 'bg-white dark:bg-gray-900'
                      : 'bg-gray-50 dark:bg-gray-800'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-900 dark:text-gray-100">{entry.principal}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{entry.kvno}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{entry.timestamp}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{entry.encryptionType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disclaimer for empty table */}
      {(!state.entries || state.entries.length === 0) && !state.isProcessing && !state.error && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-center">
          <span className="font-semibold">No entries found in this keytab file.</span><br />
          This may mean the file is empty, corrupted, or does not contain any principals.<br />
          <span className="text-xs">If you created this file here, make sure you entered the correct principal and password.</span>
        </div>
      )}
    </div>
  );
};

export default Keytab;