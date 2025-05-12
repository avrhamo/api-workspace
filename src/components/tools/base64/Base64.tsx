import React from 'react';
import { BaseToolProps } from '../types';
import { useToolState } from '../../../hooks/useToolState';

interface Base64State {
  input: string;
  output: string;
  mode: 'encode' | 'decode';
}

const Base64: React.FC<BaseToolProps> = (props) => {
  const { state, setState, getStateValue, setStateValue } = useToolState(props);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setStateValue('input', input);
    processInput(input, getStateValue('mode') || 'encode');
  };

  const handleModeChange = (mode: 'encode' | 'decode') => {
    setStateValue('mode', mode);
    processInput(getStateValue('input') || '', mode);
  };

  const processInput = (input: string, mode: 'encode' | 'decode') => {
    try {
      const output = mode === 'encode' 
        ? btoa(input)
        : atob(input);
      setStateValue('output', output);
    } catch (error) {
      setStateValue('output', 'Invalid input');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex space-x-4 mb-2">
          <button
            className={`px-4 py-2 rounded ${getStateValue('mode') === 'encode' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => handleModeChange('encode')}
          >
            Encode
          </button>
          <button
            className={`px-4 py-2 rounded ${getStateValue('mode') === 'decode' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => handleModeChange('decode')}
          >
            Decode
          </button>
        </div>
        <div>
          <label htmlFor="input" className="block text-sm font-medium mb-1">Input</label>
          <textarea
            id="input"
            className="w-full h-32 p-2 border rounded"
            value={getStateValue('input') || ''}
            onChange={handleInputChange}
            placeholder={`Enter text to ${getStateValue('mode') || 'encode'}`}
          />
        </div>
      </div>
      <div>
        <label htmlFor="output" className="block text-sm font-medium mb-1">Output</label>
        <textarea
          id="output"
          className="w-full h-32 p-2 border rounded bg-gray-50"
          value={getStateValue('output') || ''}
          readOnly
          placeholder="Result will appear here"
        />
      </div>
    </div>
  );
};

export default Base64; 