import Layout from './components/layout/Layout';
import Base64Tool from './components/tools/base64';
import ApiTester from './components/tools/api-tester';
import RSATool from './components/tools/rsa';
import KeytabTool from './components/tools/keytab';
import KafkaTester from './components/tools/kafka-tester';
import RegexTool from './components/tools/regex';
import TimeUnitsTool from './components/tools/time-units';
import BSONTool from './components/tools/bson';
import HelmSecrets from './components/tools/helm-secrets';
import JWTTool from './components/tools/jwt';
import TextCompareTool from './components/tools/text-compare';
import POJOCreator from './components/tools/pojo-creator';
import OpenAPIGenerator from './components/tools/openapi-generator';
import PortKiller from './components/tools/port-killer';
import { useTheme } from './hooks/useTheme';
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { 
  CodeBracketIcon, 
  LockClosedIcon, 
  KeyIcon, 
  CloudIcon, 
  CommandLineIcon, 
  DocumentTextIcon, 
  ClockIcon, 
  CubeTransparentIcon, 
  ShieldCheckIcon, 
  XMarkIcon,
  DocumentDuplicateIcon,
  CodeBracketSquareIcon,
  DocumentMagnifyingGlassIcon,
  SwatchIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import React from 'react';

const TOOL_COMPONENTS: Record<string, any> = {
  'base64': Base64Tool,
  'rsa': RSATool,
  'keytab': KeytabTool,
  'api-tester': ApiTester,
  'kafka': KafkaTester,
  'regex': RegexTool,
  'time': TimeUnitsTool,
  'bson': BSONTool,
  'helm-secrets': HelmSecrets,
  'jwt': JWTTool,
  'text-compare': TextCompareTool,
  'pojo-creator': POJOCreator,
  'openapi-generator': OpenAPIGenerator,
  'port-killer': PortKiller,
};

const TOOL_LABELS: Record<string, string> = {
  'base64': 'Base64',
  'rsa': 'RSA',
  'keytab': 'Keytab',
  'api-tester': 'API Tester',
  'kafka': 'Kafka Tester',
  'regex': 'Regex',
  'time': 'Time Units',
  'bson': 'BSON Tools',
  'helm-secrets': 'Helm Secrets',
  'jwt': 'JWT Tools',
  'text-compare': 'Text Compare',
  'pojo-creator': 'POJO Creator',
  'openapi-generator': 'OpenAPI Generator',
  'port-killer': 'Port Killer',
};

const TOOL_ICONS: Record<string, any> = {
  'base64': CodeBracketIcon,
  'rsa': LockClosedIcon,
  'keytab': KeyIcon,
  'api-tester': CloudIcon,
  'kafka': CommandLineIcon,
  'regex': DocumentTextIcon,
  'time': ClockIcon,
  'bson': CubeTransparentIcon,
  'helm-secrets': ShieldCheckIcon,
  'jwt': DocumentDuplicateIcon,
  'text-compare': DocumentMagnifyingGlassIcon,
  'pojo-creator': CodeBracketSquareIcon,
  'openapi-generator': SwatchIcon,
  'port-killer': ExclamationTriangleIcon,
};

// Default state for each tool
const DEFAULT_TOOL_STATES: Record<string, any> = {
  'api-tester': {
    step: 1,
    connectionConfig: {
      connectionString: 'mongodb://localhost:27017',
    },
    curlConfig: {
      parsedCommand: {
        rawCommand: ''
      },
      mappedFields: {},
    },
    testConfig: {
      numberOfRequests: 1,
      isAsync: false,
      batchSize: 100,
    },
    availableFields: [],
  },
  'kafka': {
    step: 1,
    config: {
      brokers: ['localhost:9092'],
      clientId: 'kafka-tester',
      topic: undefined,
      groupId: undefined
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
    consumerId: undefined
  },
  'helm-secrets': {
    input: '',
    output: '',
    error: null,
    isEncrypting: true,
    publicKey: '',
    privateKey: '',
    showHowTo: false,
    editorState: undefined
  },
  'jwt': {
    token: '',
    decodedHeader: null,
    decodedPayload: null,
    signature: null,
    isVerified: false,
    error: null,
    secret: '',
    algorithm: 'HS256',
  },
  'text-compare': {
    leftText: '',
    rightText: '',
    diffResult: null,
    showWhitespace: true,
    caseSensitive: true,
    error: null,
  },
  'pojo-creator': {
    jsonInput: '',
    generatedCode: '',
    targetLanguage: 'java',
    className: 'GeneratedClass',
    packageName: 'com.example',
    error: null,
    options: {
      useLombok: true,
      useJackson: true,
      useValidation: true,
    },
  },
  'openapi-generator': {
    apiDefinition: '',
    generatedSpec: null,
    error: null,
    options: {
      version: '3.0.0',
      title: 'API Documentation',
      description: '',
      basePath: '/api',
      includeExamples: true,
    },
  },
};

interface Tab {
  id: string;
  toolId: string;
  label: string;
}

interface ToolState {
  [key: string]: any;  // Each tool can have its own state shape
}

interface TabState {
  [tabId: string]: ToolState;  // Map of tab ID to its tool state
}

const App: React.FC = () => {
  const { currentTool, setCurrentTool } = useTheme();
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const savedTabs = localStorage.getItem('tabs');
    return savedTabs ? JSON.parse(savedTabs) : [{ id: 'default', toolId: 'base64', label: 'Base64' }];
  });

  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(() => {
    const savedIndex = localStorage.getItem('selectedTabIndex');
    return savedIndex ? parseInt(savedIndex, 10) : 0;
  });

  const [tabStates, setTabStates] = useState<TabState>(() => {
    const savedStates = localStorage.getItem('tabStates');
    return savedStates ? JSON.parse(savedStates) : {};
  });

  // Save tabs and selected index to localStorage
  useEffect(() => {
    localStorage.setItem('tabs', JSON.stringify(tabs));
    localStorage.setItem('selectedTabIndex', selectedTabIndex.toString());
    localStorage.setItem('tabStates', JSON.stringify(tabStates));
  }, [tabs, selectedTabIndex, tabStates]);

  const openNewTab = (toolId: string) => {
    // Cleanup previous tool state if needed
    const currentTab = tabs[selectedTabIndex];
    if (currentTab) {
      cleanupToolState(currentTab.toolId);
    }

    const newTab: Tab = {
      id: `${toolId}-${Date.now()}`,
      toolId,
      label: TOOL_LABELS[toolId],
    };
    setTabs(prev => [...prev, newTab]);
    setSelectedTabIndex(tabs.length);
    
    // Initialize state for the new tab if it doesn't exist
    setTabStates(prev => {
      if (!prev[newTab.id]) {
        return {
          ...prev,
          [newTab.id]: {
            ...DEFAULT_TOOL_STATES[toolId],
            lastUpdated: Date.now()
          }
        };
      }
      return prev;
    });
  };

  // Add cleanup function
  const cleanupToolState = async (toolId: string) => {
    switch (toolId) {
      case 'kafka':
        try {
          // Disconnect from Kafka if connected
          await window.electronAPI.disconnectFromKafka();
        } catch (error) {
          console.error('Error cleaning up Kafka connection:', error);
        }
        break;
      case 'api-tester':
        // Add any API tester cleanup if needed
        break;
      // Add other tool cleanup cases as needed
    }
  };

  // Update tab selection to include cleanup
  const handleTabChange = async (index: number) => {
    const currentTab = tabs[selectedTabIndex];
    if (currentTab) {
      await cleanupToolState(currentTab.toolId);
    }
    setSelectedTabIndex(index);
  };

  const closeTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabToClose = tabs[index];
    setTabs(prev => prev.filter((_, i) => i !== index));
    setTabStates(prev => {
      const newStates = { ...prev };
      delete newStates[tabToClose.id];
      return newStates;
    });
    if (selectedTabIndex >= index && selectedTabIndex > 0) {
      setSelectedTabIndex(prev => prev - 1);
    }
  };

  const handleToolStateChange = (tabId: string, newState: Partial<ToolState>) => {
    setTabStates(prev => {
      const currentState = prev[tabId] || {};
      const updatedState = {
        ...currentState,
        ...newState,
        lastUpdated: Date.now()
      };
      return {
        ...prev,
        [tabId]: updatedState
      };
    });
  };

  const renderTool = (toolId: string, tabId: string) => {
    const ToolComponent = TOOL_COMPONENTS[toolId];
    if (!ToolComponent) {
      console.error(`Tool component not found for toolId: ${toolId}`);
      return null;
    }
    
    // Ensure we have a valid state for this tab
    const currentState = tabStates[tabId] || DEFAULT_TOOL_STATES[toolId] || {};
    
    return (
      <ToolComponent
        key={tabId}
        state={currentState}
        setState={(newState: Partial<ToolState>) => handleToolStateChange(tabId, newState)}
      />
    );
  };

  return (
    <Layout
      currentTool={currentTool}
      setCurrentTool={openNewTab}
      tabBar={
        <Tab.Group selectedIndex={selectedTabIndex} onChange={handleTabChange}>
          <Tab.List className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab, index) => (
              <Tab
                key={tab.id}
                as="div"
                className={({ selected }) =>
                  `group relative flex items-center px-4 py-2 text-sm font-medium focus:outline-none cursor-pointer
                  ${selected
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`
                }
              >
                <div className="flex items-center">
                  {TOOL_ICONS[tab.toolId] && React.createElement(TOOL_ICONS[tab.toolId], { className: "w-4 h-4" })}
                  <span className="ml-2">{tab.label}</span>
                  <button
                    onClick={(e) => closeTab(index, e)}
                    className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                    title={`Close ${tab.label} tab`}
                    aria-label={`Close ${tab.label} tab`}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="flex-1">
            {tabs.map(tab => (
              <Tab.Panel key={tab.id} className="h-full">
                {renderTool(tab.toolId, tab.id)}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      }
    >
      <div className="hidden" />
    </Layout>
  );
};

export default App;