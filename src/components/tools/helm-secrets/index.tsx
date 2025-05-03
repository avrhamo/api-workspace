import React, { useState, useEffect } from 'react';
import { MonacoEditor } from '../../../common/editor/MonacoEditor';
import { KeyIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const EXAMPLE_SECRET = `# Example Helm secret
# This is an example of an encrypted Helm secret
# The actual values are encrypted using GPG

database:
  username: admin
  password: secret123

api:
  key: abc123xyz789
  secret: def456uvw012

service:
  port: 8080
  debug: true
  timeout: 30s`;

const HOW_TO_INSTALL = `
# How to Install Prerequisites

## 1. Install GPG

### Mac (Homebrew):
    brew install gnupg

### Ubuntu/Debian:
    sudo apt-get update && sudo apt-get install gnupg

### Windows:
- Download and install from: https://www.gpg4win.org/

## 2. Install Helm

### Mac (Homebrew):
    brew install helm

### Ubuntu/Debian:
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

### Windows:
- Download and install from: https://helm.sh/docs/intro/install/

## 3. Install helm-secrets Plugin

    helm plugin install https://github.com/jkroepke/helm-secrets

## 4. Generate a GPG Key (if you don't have one)

    gpg --full-generate-key

Follow the prompts to create a key. Use the email you want to associate with the key.
`;

const HelmSecrets: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(true);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [gpgKeys, setGpgKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [sopsConfigPath, setSopsConfigPath] = useState('');

  useEffect(() => {
    loadGpgKeys();
  }, []);

  const loadGpgKeys = async () => {
    setIsLoadingKeys(true);
    setError(null);
    try {
      const result = await window.electronAPI.listGpgKeys();
      if (result.success) {
        setGpgKeys(result.keys);
        setSelectedKey(result.keys[0] || '');
      } else {
        setGpgKeys([]);
        setSelectedKey('');
        setError(result.error || 'Failed to load GPG keys');
      }
    } catch (err) {
      setGpgKeys([]);
      setSelectedKey('');
      setError(err instanceof Error ? err.message : 'Failed to load GPG keys');
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleRefreshKeys = async () => {
    setIsGeneratingKey(true);
    await loadGpgKeys();
    setIsGeneratingKey(false);
  };

  const handleEncrypt = async () => {
    if (!selectedKey) {
      setError('Please select a GPG key for encryption.');
      return;
    }
    try {
      setError(null);
      const result = await window.electronAPI.helmSecretsEncrypt(input, selectedKey, sopsConfigPath);
      if (result.success) {
        setOutput(result.encrypted);
      } else {
        setError(result.error || 'Encryption failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed');
    }
  };

  const handleDecrypt = async () => {
    try {
      setError(null);
      const result = await window.electronAPI.helmSecretsDecrypt(input, sopsConfigPath);
      if (result.success) {
        setOutput(result.decrypted);
      } else {
        setError(result.error || 'Decryption failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
    }
  };

  const handleLoadExample = () => {
    setInput(EXAMPLE_SECRET);
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* How to Install Section */}
      <div className="mb-2">
        <button
          className="flex items-center text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
          onClick={() => setShowHowTo((v) => !v)}
        >
          <InformationCircleIcon className="w-5 h-5 mr-1" />
          How to Install Prerequisites
          {showHowTo ? (
            <ChevronUpIcon className="w-4 h-4 ml-2" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 ml-2" />
          )}
        </button>
        {showHowTo && (
          <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {HOW_TO_INSTALL}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Helm Secrets</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEncrypting(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isEncrypting
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Encrypt
          </button>
          <button
            onClick={() => setIsEncrypting(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isEncrypting
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Decrypt
          </button>
        </div>
      </div>

      {/* Key Management */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            GPG Key Management
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The app uses your system GPG keys. Generate a key if you don't have one.
          </p>
          <div className="mt-2">
            {isLoadingKeys ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">Loading keys...</span>
            ) : gpgKeys.length === 0 ? (
              <span className="text-xs text-red-600 dark:text-red-400">No GPG keys found. Please generate a key.</span>
            ) : (
              <select
                value={selectedKey}
                onChange={e => setSelectedKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoadingKeys}
                title="Select GPG key for encryption"
              >
                {gpgKeys.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="sops-config-path">
              Optional: Path to <code>.sops.yaml</code> config file
            </label>
            <input
              id="sops-config-path"
              type="text"
              value={sopsConfigPath}
              onChange={e => setSopsConfigPath(e.target.value)}
              placeholder="/path/to/.sops.yaml"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              If provided, this config will control which GPG keys are used for encryption/decryption.
            </span>
          </div>
        </div>
        <button
          onClick={handleRefreshKeys}
          disabled={isGeneratingKey}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
        >
          {isGeneratingKey ? (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Refreshing
            </>
          ) : (
            <>
              <KeyIcon className="w-4 h-4 mr-2" />
              Refresh Keys
            </>
          )}
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Input
            </label>
            <button
              onClick={handleLoadExample}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Load Example
            </button>
          </div>
          <div className="flex-1 min-h-[300px] border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <MonacoEditor
              value={input}
              onChange={setInput}
              language="yaml"
              theme="vs-dark"
            />
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Output
          </label>
          <div className="flex-1 min-h-[300px] border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <MonacoEditor
              value={output}
              onChange={setOutput}
              language="yaml"
              theme="vs-dark"
              readOnly
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={isEncrypting ? handleEncrypt : handleDecrypt}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          disabled={isEncrypting && (!selectedKey || gpgKeys.length === 0)}
        >
          {isEncrypting ? 'Encrypt' : 'Decrypt'}
        </button>
      </div>
    </div>
  );
};

export default HelmSecrets; 