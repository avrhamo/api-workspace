import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Tab } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface JWTState {
  token: string;
  decodedHeader: any;
  decodedPayload: any;
  signature: string | null;
  isVerified: boolean;
  error: string | null;
  secret: string;
  algorithm: string;
}

interface Props {
  state: JWTState;
  setState: (state: Partial<JWTState>) => void;
}

const JWTTool: React.FC<Props> = ({ state, setState }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTokenChange = (token: string) => {
    setState({ token, error: null });
    try {
      if (token) {
        const decoded = jwtDecode(token, { header: true });
        setState({
          decodedHeader: decoded.header,
          decodedPayload: decoded.payload,
          signature: token.split('.')[2] || null,
        });
      }
    } catch (error) {
      setState({ error: 'Invalid JWT token format' });
    }
  };

  const handleVerify = () => {
    // TODO: Implement JWT verification
    // This would require a backend service to verify the signature
    setState({ isVerified: false, error: 'JWT verification not implemented yet' });
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ${selected
                ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-gray-200'
              }`
            }
          >
            Decode
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ${selected
                ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-gray-200'
              }`
            }
          >
            Verify
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-4 flex-1">
          <Tab.Panel className="h-full flex flex-col">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                JWT Token
              </label>
              <textarea
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={state.token}
                onChange={(e) => handleTokenChange(e.target.value)}
                placeholder="Paste your JWT token here..."
              />
            </div>
            
            {state.error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
                {state.error}
              </div>
            )}

            {state.decodedHeader && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Header</h3>
                  <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-auto">
                    {JSON.stringify(state.decodedHeader, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Payload</h3>
                  <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-auto">
                    {JSON.stringify(state.decodedPayload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </Tab.Panel>

          <Tab.Panel className="h-full flex flex-col">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secret Key
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={state.secret}
                onChange={(e) => setState({ secret: e.target.value })}
                placeholder="Enter your secret key..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Algorithm
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={state.algorithm}
                onChange={(e) => setState({ algorithm: e.target.value })}
              >
                <option value="HS256">HS256</option>
                <option value="HS384">HS384</option>
                <option value="HS512">HS512</option>
                <option value="RS256">RS256</option>
                <option value="RS384">RS384</option>
                <option value="RS512">RS512</option>
              </select>
            </div>

            <button
              onClick={handleVerify}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Verify Token
            </button>

            {state.isVerified !== null && (
              <div className={`mt-4 p-4 rounded-md flex items-center ${
                state.isVerified
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {state.isVerified ? (
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                ) : (
                  <XCircleIcon className="h-5 w-5 mr-2" />
                )}
                {state.isVerified ? 'Token is valid' : 'Token is invalid'}
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default JWTTool; 