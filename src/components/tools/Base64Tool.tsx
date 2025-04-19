import { FC, useState, useCallback } from 'react';
import CodeEditor from '../common/CodeEditor';
import { useTheme } from '../../hooks/useTheme';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

const Base64Tool: FC = () => {
  const { isDark } = useTheme();
  const [input, setInput] = useState('');
  const [encodedOutput, setEncodedOutput] = useState('');
  const [decodedOutput, setDecodedOutput] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);

  // Encode the input text to Base64
  const handleEncode = useCallback((value: string | undefined) => {
    const text = value || '';
    setInput(text);
    try {
      const encoded = btoa(text);
      setEncodedOutput(encoded);
      setDecodedOutput(''); // Clear decoded output when encoding
    } catch (e) {
      setEncodedOutput('Invalid input for Base64 encoding');
    }
  }, []);

  // Decode Base64 to text
  const handleDecode = useCallback((value: string | undefined) => {
    const base64 = value || '';
    setInput(base64);
    try {
      const decoded = atob(base64);
      setDecodedOutput(decoded);
      setEncodedOutput(''); // Clear encoded output when decoding
      
      // Check if decoded string is valid JSON
      try {
        JSON.parse(decoded);
        setIsValidJson(true);
      } catch (e) {
        setIsValidJson(false);
      }
    } catch (e) {
      setDecodedOutput('Invalid Base64 string');
    }
  }, []);

  const prettifyJson = useCallback(() => {
    try {
      // Try to prettify either the input or decoded output
      const textToPrettify = decodedOutput || input;
      const parsed = JSON.parse(textToPrettify);
      const prettified = JSON.stringify(parsed, null, 2);
      
      if (decodedOutput) {
        setDecodedOutput(prettified);
      } else {
        setInput(prettified);
      }
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  }, [input, decodedOutput]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to add a toast notification here
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Base64 Encoder/Decoder
        </h2>
        <button
          onClick={prettifyJson}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${isValidJson 
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          disabled={!isValidJson}
        >
          Prettify JSON
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Input Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Input Text or Base64 String
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleEncode(input)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Encode
              </button>
              <button
                onClick={() => handleDecode(input)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
              >
                Decode
              </button>
              <button
                onClick={() => copyToClipboard(input)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Copy to clipboard"
              >
                <DocumentDuplicateIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <CodeEditor
            value={input}
            onChange={(value) => setInput(value || '')}
            language="plaintext"
            theme={isDark ? 'vs-dark' : 'light'}
            height="200px"
          />
        </div>

        {/* Encoded Output */}
        {encodedOutput && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Encoded Base64 Output
              </label>
              <button
                onClick={() => copyToClipboard(encodedOutput)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Copy to clipboard"
              >
                <DocumentDuplicateIcon className="w-5 h-5" />
              </button>
            </div>
            <CodeEditor
              value={encodedOutput}
              language="plaintext"
              theme={isDark ? 'vs-dark' : 'light'}
              height="200px"
              readOnly
            />
          </div>
        )}

        {/* Decoded Output */}
        {decodedOutput && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Decoded Output
              </label>
              <button
                onClick={() => copyToClipboard(decodedOutput)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Copy to clipboard"
              >
                <DocumentDuplicateIcon className="w-5 h-5" />
              </button>
            </div>
            <CodeEditor
              value={decodedOutput}
              language="json"
              theme={isDark ? 'vs-dark' : 'light'}
              height="200px"
              readOnly
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Base64Tool;
