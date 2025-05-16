import React, { useState, useCallback } from 'react';
import { useToolState } from '../../../hooks/useToolState';
import { BaseToolProps } from '../../types';
import { ChevronLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { MonacoEditor } from '../../../common/editor/MonacoEditor';
import { useTheme } from '../../../hooks/useTheme';

interface KafkaConfig {
  brokers: string[];
  clientId: string;
  topic?: string;
  groupId?: string;
  // Security configuration
  securityProtocol?: 'PLAINTEXT' | 'SSL' | 'SASL_PLAINTEXT' | 'SASL_SSL';
  saslMechanism?: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512' | 'GSSAPI';
  // SSL/TLS configuration
  ssl?: {
    caLocation?: string;
    certLocation?: string;
    keyLocation?: string;
    keyPassword?: string;
  };
  // Kerberos configuration
  kerberos?: {
    keytabLocation?: string;
    krb5ConfigLocation?: string;
    serviceName?: string;
    principal?: string;
  };
  // SASL configuration
  sasl?: {
    username?: string;
    password?: string;
  };
}

interface MessageConfig {
  key?: string;
  value: string;
  headers?: Record<string, string>;
}

interface KafkaTesterState {
  step: number;
  config: KafkaConfig;
  messageConfig: MessageConfig;
  messages: Array<{
    topic: string;
    partition: number;
    offset: string;
    key?: string;
    value?: string;
    headers?: Record<string, string>;
    timestamp: string;
  }>;
  error: string | null;
  isConnected: boolean;
  topics: string[];
  consumerId?: string;
}

const DEFAULT_STATE: KafkaTesterState = {
  step: 1,
  config: {
    brokers: ['localhost:9092'],
    clientId: 'kafka-tester',
    topic: undefined,
    groupId: undefined,
    securityProtocol: 'PLAINTEXT',
    saslMechanism: undefined,
    ssl: {
      caLocation: undefined,
      certLocation: undefined,
      keyLocation: undefined,
      keyPassword: undefined
    },
    kerberos: {
      keytabLocation: undefined,
      krb5ConfigLocation: undefined,
      serviceName: 'kafka',
      principal: undefined
    },
    sasl: {
      username: undefined,
      password: undefined
    }
  },
  messageConfig: {
    value: '',
    key: undefined,
    headers: undefined
  },
  messages: [],
  error: null,
  isConnected: false,
  topics: [],
};

const STEPS = [
  { number: 1, title: 'Connect', description: 'Configure Kafka connection' },
  { number: 2, title: 'Topics', description: 'Manage topics' },
  { number: 3, title: 'Messages', description: 'Produce and consume messages' },
];

const KafkaTester: React.FC<BaseToolProps> = (props) => {
  const { state, setState } = useToolState({
    initialState: DEFAULT_STATE,
    ...props
  });
  const { theme } = useTheme();

  const handleConnect = useCallback(async () => {
    try {
      setState({ error: null });
      const result = await window.electronAPI.connectToKafka(state.config);
      
      if (result.success) {
        const topicsResult = await window.electronAPI.listKafkaTopics();
        setState({
          isConnected: true,
          topics: topicsResult.topics || [],
          step: 2,
          error: null
        });
      } else {
        setState({ error: result.error || 'Failed to connect to Kafka' });
      }
    } catch (error) {
      setState({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    }
  }, [state.config, setState]);

  const handleCreateTopic = useCallback(async (topic: string, partitions: number = 1, replicationFactor: number = 1) => {
    try {
      setState({ error: null });
      const result = await window.electronAPI.createKafkaTopic({
        topic,
        partitions,
        replicationFactor
      });
      
      if (result.success) {
        const topicsResult = await window.electronAPI.listKafkaTopics();
        setState({
          topics: topicsResult.topics || [],
          error: null
        });
      } else {
        setState({ error: result.error || 'Failed to create topic' });
      }
    } catch (error) {
      setState({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    }
  }, [setState]);

  const handleProduce = useCallback(async () => {
    if (!state.config?.topic) {
      setState({ error: 'Please select a topic first' });
      return;
    }

    try {
      setState({ error: null });
      const result = await window.electronAPI.produceKafkaMessage({
        topic: state.config.topic,
        messages: [state.messageConfig],
      });
      
      if (!result.success) {
        setState({ error: result.error || 'Failed to produce message' });
      }
    } catch (error) {
      setState({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    }
  }, [state.config?.topic, state.messageConfig, setState]);

  const handleConsume = useCallback(async () => {
    if (!state.config?.topic || !state.config?.groupId) {
      setState({ error: 'Please select a topic and consumer group first' });
      return;
    }

    try {
      setState({ error: null });
      const result = await window.electronAPI.consumeKafkaMessages({
        topic: state.config.topic,
        groupId: state.config.groupId,
        fromBeginning: true,
        maxMessages: 100,
      });
      
      if (result.success) {
        setState({
          messages: result.messages || [],
          consumerId: result.consumerId,
          error: null
        });
      } else {
        setState({ error: result.error || 'Failed to consume messages' });
      }
    } catch (error) {
      setState({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    }
  }, [state.config?.topic, state.config?.groupId, setState]);

  const handleDisconnect = useCallback(async () => {
    try {
      if (state.consumerId) {
        await window.electronAPI.stopKafkaConsumer(state.consumerId);
      }
      await window.electronAPI.disconnectFromKafka();
      setState({
        ...DEFAULT_STATE,
        step: 1
      });
    } catch (error) {
      setState({ 
        error: error instanceof Error ? error.message : 'Failed to disconnect' 
      });
    }
  }, [state.consumerId, setState]);

  const handleStepBack = useCallback((step: number) => {
    setState({ step });
  }, [setState]);

  const currentStep = STEPS.find(s => s.number === state.step) || STEPS[0];

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        {state.step > 1 && (
          <button
            onClick={() => handleStepBack(state.step - 1)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-2" />
            Back
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Kafka Tester</h2>
        {state.isConnected && (
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-200 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {state.error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{state.error}</p>
              </div>
            </div>
          </div>
        )}

        {state.step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="brokers" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bootstrap Servers
                <div className="group relative inline-block ml-2">
                  <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                  <div className="hidden group-hover:block absolute z-10 w-48 px-2 py-1 text-xs text-white bg-gray-900 rounded-md -right-1 transform translate-x-full">
                    Comma-separated list of Kafka brokers (e.g., localhost:9092)
                  </div>
                </div>
              </label>
              <input
                type="text"
                id="brokers"
                value={state.config.brokers.join(',')}
                onChange={(e) => setState({
                  config: {
                    ...state.config,
                    brokers: e.target.value.split(',').map(b => b.trim())
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                placeholder="localhost:9092"
              />
            </div>

            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Client ID
                <div className="group relative inline-block ml-2">
                  <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                  <div className="hidden group-hover:block absolute z-10 w-48 px-2 py-1 text-xs text-white bg-gray-900 rounded-md -right-1 transform translate-x-full">
                    Unique identifier for this client
                  </div>
                </div>
              </label>
              <input
                type="text"
                id="clientId"
                value={state.config.clientId}
                onChange={(e) => setState({
                  config: {
                    ...state.config,
                    clientId: e.target.value
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                placeholder="kafka-tester"
              />
            </div>

            <div>
              <label htmlFor="securityProtocol" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Security Protocol
              </label>
              <select
                id="securityProtocol"
                value={state.config.securityProtocol}
                onChange={(e) => setState({
                  config: {
                    ...state.config,
                    securityProtocol: e.target.value as KafkaConfig['securityProtocol']
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="PLAINTEXT">PLAINTEXT</option>
                <option value="SSL">SSL</option>
                <option value="SASL_PLAINTEXT">SASL_PLAINTEXT</option>
                <option value="SASL_SSL">SASL_SSL</option>
              </select>
            </div>

            {(state.config.securityProtocol === 'SASL_PLAINTEXT' || state.config.securityProtocol === 'SASL_SSL') && (
              <>
                <div>
                  <label htmlFor="saslMechanism" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SASL Mechanism
                  </label>
                  <select
                    id="saslMechanism"
                    value={state.config.saslMechanism || ''}
                    onChange={(e) => setState({
                      config: {
                        ...state.config,
                        saslMechanism: e.target.value as KafkaConfig['saslMechanism']
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  >
                    <option value="">Select mechanism</option>
                    <option value="PLAIN">PLAIN</option>
                    <option value="SCRAM-SHA-256">SCRAM-SHA-256</option>
                    <option value="SCRAM-SHA-512">SCRAM-SHA-512</option>
                    <option value="GSSAPI">GSSAPI (Kerberos)</option>
                  </select>
                </div>

                {state.config.saslMechanism === 'GSSAPI' && (
                  <>
                    <div>
                      <label htmlFor="keytabLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Keytab Location
                      </label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                          type="text"
                          id="keytabLocation"
                          value={state.config.kerberos?.keytabLocation || ''}
                          onChange={(e) => setState({
                            config: {
                              ...state.config,
                              kerberos: {
                                ...state.config.kerberos,
                                keytabLocation: e.target.value
                              }
                            }
                          })}
                          className="flex-1 block w-full rounded-l-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="/path/to/keytab"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implement file picker
                            console.log('Open file picker for keytab');
                          }}
                          className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          Browse
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="krb5ConfigLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        krb5.conf Location
                      </label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                          type="text"
                          id="krb5ConfigLocation"
                          value={state.config.kerberos?.krb5ConfigLocation || ''}
                          onChange={(e) => setState({
                            config: {
                              ...state.config,
                              kerberos: {
                                ...state.config.kerberos,
                                krb5ConfigLocation: e.target.value
                              }
                            }
                          })}
                          className="flex-1 block w-full rounded-l-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="/etc/krb5.conf"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implement file picker
                            console.log('Open file picker for krb5.conf');
                          }}
                          className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          Browse
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="principal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Principal
                      </label>
                      <input
                        type="text"
                        id="principal"
                        value={state.config.kerberos?.principal || ''}
                        onChange={(e) => setState({
                          config: {
                            ...state.config,
                            kerberos: {
                              ...state.config.kerberos,
                              principal: e.target.value
                            }
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="user@REALM"
                      />
                    </div>
                  </>
                )}

                {(state.config.saslMechanism === 'PLAIN' || state.config.saslMechanism === 'SCRAM-SHA-256' || state.config.saslMechanism === 'SCRAM-SHA-512') && (
                  <>
                    <div>
                      <label htmlFor="saslUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Username
                      </label>
                      <input
                        type="text"
                        id="saslUsername"
                        value={state.config.sasl?.username || ''}
                        onChange={(e) => setState({
                          config: {
                            ...state.config,
                            sasl: {
                              ...state.config.sasl,
                              username: e.target.value
                            }
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="saslPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <input
                        type="password"
                        id="saslPassword"
                        value={state.config.sasl?.password || ''}
                        onChange={(e) => setState({
                          config: {
                            ...state.config,
                            sasl: {
                              ...state.config.sasl,
                              password: e.target.value
                            }
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {(state.config.securityProtocol === 'SSL' || state.config.securityProtocol === 'SASL_SSL') && (
              <>
                <div>
                  <label htmlFor="caLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    CA Certificate Location
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="caLocation"
                      value={state.config.ssl?.caLocation || ''}
                      onChange={(e) => setState({
                        config: {
                          ...state.config,
                          ssl: {
                            ...state.config.ssl,
                            caLocation: e.target.value
                          }
                        }
                      })}
                      className="flex-1 block w-full rounded-l-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="/path/to/ca.pem"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Implement file picker
                        console.log('Open file picker for CA cert');
                      }}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Browse
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="certLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Client Certificate Location
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="certLocation"
                      value={state.config.ssl?.certLocation || ''}
                      onChange={(e) => setState({
                        config: {
                          ...state.config,
                          ssl: {
                            ...state.config.ssl,
                            certLocation: e.target.value
                          }
                        }
                      })}
                      className="flex-1 block w-full rounded-l-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="/path/to/cert.pem"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Implement file picker
                        console.log('Open file picker for client cert');
                      }}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Browse
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="keyLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Client Key Location
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="keyLocation"
                      value={state.config.ssl?.keyLocation || ''}
                      onChange={(e) => setState({
                        config: {
                          ...state.config,
                          ssl: {
                            ...state.config.ssl,
                            keyLocation: e.target.value
                          }
                        }
                      })}
                      className="flex-1 block w-full rounded-l-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="/path/to/key.pem"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Implement file picker
                        console.log('Open file picker for client key');
                      }}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Browse
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="keyPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Key Password (if encrypted)
                  </label>
                  <input
                    type="password"
                    id="keyPassword"
                    value={state.config.ssl?.keyPassword || ''}
                    onChange={(e) => setState({
                      config: {
                        ...state.config,
                        ssl: {
                          ...state.config.ssl,
                          keyPassword: e.target.value
                        }
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleConnect}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        {state.step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Topics</h3>
              <button
                onClick={() => {
                  const topic = prompt('Enter topic name:');
                  if (topic) {
                    const partitions = parseInt(prompt('Number of partitions (default: 1):') || '1', 10);
                    const replicationFactor = parseInt(prompt('Replication factor (default: 1):') || '1', 10);
                    handleCreateTopic(topic, partitions, replicationFactor);
                  }
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
              >
                Create Topic
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.topics.map((topic) => (
                <div
                  key={topic}
                  className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                    state.config.topic === topic
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                  onClick={() => setState({
                    config: { ...state.config, topic },
                    step: 3
                  })}
                >
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{topic}</h4>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Consumer Group ID
                  <div className="group relative inline-block ml-2">
                    <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-48 px-2 py-1 text-xs text-white bg-gray-900 rounded-md -right-1 transform translate-x-full">
                      Unique identifier for the consumer group
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  id="groupId"
                  value={state.config.groupId || ''}
                  onChange={(e) => setState({
                    config: {
                      ...state.config,
                      groupId: e.target.value
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="my-consumer-group"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Produce Message</h3>
              <div>
                <label htmlFor="messageKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Key (optional)
                </label>
                <input
                  type="text"
                  id="messageKey"
                  value={state.messageConfig.key || ''}
                  onChange={(e) => setState({
                    messageConfig: {
                      ...state.messageConfig,
                      key: e.target.value
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Message key"
                />
              </div>

              <div>
                <label htmlFor="messageValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Value
                </label>
                <MonacoEditor
                  value={state.messageConfig.value}
                  onChange={(value) => setState({
                    messageConfig: {
                      ...state.messageConfig,
                      value: value || ''
                    }
                  })}
                  language="json"
                  height="200px"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleProduce}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                >
                  Produce
                </button>
                <button
                  onClick={handleConsume}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900"
                >
                  Consume
                </button>
              </div>
            </div>

            {state.messages.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Consumed Messages</h3>
                <div className="space-y-4">
                  {state.messages.map((msg, index) => (
                    <div
                      key={`${msg.topic}-${msg.partition}-${msg.offset}`}
                      className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="px-4 py-5 sm:p-6">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Topic</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{msg.topic}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Partition</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{msg.partition}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Offset</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{msg.offset}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Timestamp</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                              {new Date(parseInt(msg.timestamp)).toLocaleString()}
                            </dd>
                          </div>
                          {msg.key && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Key</dt>
                              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{msg.key}</dd>
                            </div>
                          )}
                          <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Value</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                              <MonacoEditor
                                value={msg.value || ''}
                                readOnly
                                language="json"
                                height="100px"
                                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                              />
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KafkaTester;