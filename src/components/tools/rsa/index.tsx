import React from 'react';
import { BaseToolProps } from '../types';

interface RSAState {
  publicKey: string;
  privateKey: string;
  input: string;
  output: string;
  mode: 'encrypt' | 'decrypt';
  error: string | null;
}

const RSATool: React.FC<BaseToolProps> = ({ state, setState }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState({ ...state, input: e.target.value });
  };

  const handlePublicKeyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState({ ...state, publicKey: e.target.value });
  };

  const handlePrivateKeyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState({ ...state, privateKey: e.target.value });
  };

  const handleModeChange = (mode: 'encrypt' | 'decrypt') => {
    setState({ ...state, mode, output: '', error: null });
  };

  const handleProcess = () => {
    try {
      // TODO: Implement actual RSA encryption/decryption
      setState({ ...state, output: 'Not implemented yet', error: null });
    } catch (error) {
      setState({ ...state, error: error instanceof Error ? error.message : 'An error occurred' });
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-2xl font-semibold mb-4">RSA Tool</h2>
      
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => handleModeChange('encrypt')}
          className={`px-4 py-2 rounded-lg ${
            state.mode === 'encrypt'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Encrypt
        </button>
        <button
          onClick={() => handleModeChange('decrypt')}
          className={`px-4 py-2 rounded-lg ${
            state.mode === 'decrypt'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Decrypt
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {state.mode === 'encrypt' ? 'Public Key' : 'Private Key'}
          </label>
          <textarea
            value={state.mode === 'encrypt' ? state.publicKey : state.privateKey}
            onChange={state.mode === 'encrypt' ? handlePublicKeyChange : handlePrivateKeyChange}
            className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            placeholder={state.mode === 'encrypt' ? 
              '-----BEGIN PUBLIC KEY-----\n...' : 
              '-----BEGIN PRIVATE KEY-----\n...'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Input Text
          </label>
          <textarea
            value={state.input}
            onChange={handleInputChange}
            className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter text to ${state.mode}`}
          />
        </div>
      </div>

      <button
        onClick={handleProcess}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title={`${state.mode === 'encrypt' ? 'Encrypt' : 'Decrypt'} the input text using the provided key`}
        aria-label={`${state.mode === 'encrypt' ? 'Encrypt' : 'Decrypt'} the input text using the provided key`}
      >
        {state.mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
      </button>

      {state.error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          {state.error}
        </div>
      )}

      {state.output && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Output
          </label>
          <textarea
            value={state.output}
            readOnly
            className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
          />
        </div>
      )}
    </div>
  );
};

export default RSATool;