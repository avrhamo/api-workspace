import React from 'react';
import { BaseToolProps } from '../types';
import { useToolState } from '../../../hooks/useToolState';

interface RSAState {
  publicKey: string;
  privateKey: string;
  input: string;
  output: string;
  mode: 'encrypt' | 'decrypt';
}

const RSA: React.FC<BaseToolProps> = (props) => {
  const { state, setState } = useToolState(props);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setState({ input });
  };

  const handleModeChange = (mode: 'encrypt' | 'decrypt') => {
    setState({ mode });
  };

  const handleKeyChange = (type: 'public' | 'private', value: string) => {
    setState({ [type === 'public' ? 'publicKey' : 'privateKey']: value });
  };

  const processInput = () => {
    try {
      // Implement your RSA encryption/decryption logic here
      const output = state.mode === 'encrypt' 
        ? 'Encrypted: ' + state.input
        : 'Decrypted: ' + state.input;
      setState({ output });
    } catch (error) {
      setState({ output: 'Error processing input' });
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex space-x-4 mb-2">
          <button
            className={`px-4 py-2 rounded ${state.mode === 'encrypt' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => handleModeChange('encrypt')}
          >
            Encrypt
          </button>
          <button
            className={`px-4 py-2 rounded ${state.mode === 'decrypt' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => handleModeChange('decrypt')}
          >
            Decrypt
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Public Key</label>
            <textarea
              className="w-full h-24 p-2 border rounded"
              value={state.publicKey || ''}
              onChange={(e) => handleKeyChange('public', e.target.value)}
              placeholder="Enter public key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Private Key</label>
            <textarea
              className="w-full h-24 p-2 border rounded"
              value={state.privateKey || ''}
              onChange={(e) => handleKeyChange('private', e.target.value)}
              placeholder="Enter private key"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Input</label>
          <textarea
            className="w-full h-32 p-2 border rounded"
            value={state.input || ''}
            onChange={handleInputChange}
            placeholder={`Enter text to ${state.mode || 'encrypt'}`}
          />
        </div>

        <button
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={processInput}
        >
          {state.mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
        </button>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Output</label>
          <textarea
            className="w-full h-32 p-2 border rounded bg-gray-50"
            value={state.output || ''}
            readOnly
            placeholder="Result will appear here"
          />
        </div>
      </div>
    </div>
  );
};

export default RSA; 