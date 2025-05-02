import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

interface CurlAnalyzerProps {
  curlCommand: string;
  onFieldMap: (field: string, mappedTo: string) => void;
  availableFields: string[];
}

interface ParsedCurl {
  method: string;
  url: {
    base: string;
    pathParams: { [key: string]: string };
    queryParams: { [key: string]: string };
  };
  headers: { [key: string]: string };
  body: Record<string, unknown> | string | null;
}

interface PanelState {
  isOpen: boolean;
  position: { top: number; right: number; left: number; bottom: number };
  fieldPath: string;
  fieldType: string;
}

interface FixedValueConfig {
  type: 'string' | 'number' | 'boolean' | 'date';
  value: string;
  isRandom: boolean;
  regex?: string;
}

interface SpecialFieldConfig {
  type: 'uuid';
}

type MappingType = 'mongodb' | 'fixed' | 'special';

interface MappingPanelProps {
  isOpen: boolean;
  initialPosition: { top: number; right: number; left: number; bottom: number };
  onClose: () => void;
  availableFields: string[];
  onSelect: (field: string, config?: FixedValueConfig | SpecialFieldConfig) => void;
  fieldPath: string;
}

interface MappingInfo {
  targetField: string;
  type: 'mongodb' | 'fixed' | 'special';
  value?: string;
}

interface JsonTreeProps {
  data: Record<string, unknown> | unknown[] | string;
  path?: string;
  selectedPath?: string;
  onKeyClick: (path: string, type: string, event: React.MouseEvent) => void;
  mappings?: Record<string, MappingInfo>;
}

const ClickableKey: React.FC<{
  fieldKey: string;
  path: string;
  isDisabled?: boolean;
  onKeyClick: (path: string, type: string, event: React.MouseEvent) => void;
  mapping?: MappingInfo;
}> = ({ fieldKey, path, isDisabled = false, onKeyClick, mapping }) => (
  <div className="relative group">
    <button
      onClick={(e) => !isDisabled && onKeyClick(path, 'bodyField', e)}
      className={`
        font-mono text-sm rounded px-1.5 py-0.5 transition-colors duration-150 flex items-center
        ${isDisabled 
          ? 'text-gray-500 dark:text-gray-600 cursor-not-allowed'
          : mapping
            ? 'text-blue-500 dark:text-blue-400'
            : 'text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900'
        }
      `}
      aria-label={`Map field ${fieldKey}`}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
    >
      {fieldKey}
      {mapping && (
        <>
          <div className="ml-2 h-2 w-2 rounded-full bg-green-400"></div>
          <div className="absolute z-50 bottom-full left-0 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {mapping.type === 'mongodb' && `Mapped to: ${mapping.targetField}`}
            {mapping.type === 'fixed' && `Fixed value: ${mapping.value}`}
            {mapping.type === 'special' && 'Special: UUID'}
          </div>
        </>
      )}
    </button>
  </div>
);

const MappingPanel: React.FC<MappingPanelProps> = ({
  isOpen,
  initialPosition,
  onClose,
  availableFields,
  onSelect,
  fieldPath
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<MappingType>('mongodb');
  const [fixedValueConfig, setFixedValueConfig] = useState<FixedValueConfig>({
    type: 'string',
    value: '',
    isRandom: false
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});

  // Recalculate position when panel opens or initial position changes
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!panelRef.current) return;

      const panelHeight = panelRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const panelWidth = 384; // w-96 = 24rem = 384px

      // Calculate vertical position
      let top = initialPosition.top;
      
      // If panel would extend below viewport, position it above the click point
      if (top + panelHeight > windowHeight) {
        top = initialPosition.bottom - panelHeight;
      }

      // Calculate horizontal position
      let left = initialPosition.left - panelWidth;
      
      // If panel would go off left edge, position it to the right of click point
      if (left < 0) {
        left = initialPosition.right;
      }

      setPositionStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        maxHeight: '95vh',
        width: `${panelWidth}px`,
        zIndex: 50 // Ensure panel stays on top
      });
    };

    // Initial position calculation
    requestAnimationFrame(() => {
      updatePosition();
    });

    // Update position on window resize
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, initialPosition]);

  const handleFixedValueSubmit = () => {
    onSelect('fixedValue', fixedValueConfig);
    onClose();
  };

  const handleSpecialFieldSubmit = () => {
    onSelect('specialValue', { type: 'uuid' });
    onClose();
  };

  const renderMongoDBTab = () => (
    <>
      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search fields..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          aria-label="Search fields"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      <div className="max-h-[40vh] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-600 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {filteredFields.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {filteredFields.map((field, index) => (
              <button
                key={index}
                onClick={() => onSelect(field)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                aria-label={`Select field ${field}`}
              >
                <span className="font-mono">{field}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No matching fields found
          </div>
        )}
      </div>
    </>
  );

  const renderFixedValueTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Value Type
        </label>
        <select
          value={fixedValueConfig.type}
          onChange={(e) => setFixedValueConfig(prev => ({ ...prev, type: e.target.value as FixedValueConfig['type'] }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          aria-label="Select value type"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="date">Date</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Value
        </label>
        <div className="flex items-center space-x-2">
          <input
            type={fixedValueConfig.type === 'number' ? 'number' : 'text'}
            value={fixedValueConfig.value}
            onChange={(e) => setFixedValueConfig(prev => ({ ...prev, value: e.target.value }))}
            disabled={fixedValueConfig.isRandom}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50"
            placeholder={fixedValueConfig.isRandom ? 'Random value will be generated' : 'Enter value'}
          />
          <button
            onClick={() => setFixedValueConfig(prev => ({ ...prev, isRandom: !prev.isRandom }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {fixedValueConfig.isRandom ? 'Fixed' : 'Random'}
          </button>
        </div>
      </div>

      {fixedValueConfig.isRandom && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Regex Pattern (optional)
          </label>
          <input
            type="text"
            value={fixedValueConfig.regex || ''}
            onChange={(e) => setFixedValueConfig(prev => ({ ...prev, regex: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            placeholder="Enter regex pattern for random value"
          />
        </div>
      )}

      <button
        onClick={handleFixedValueSubmit}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      >
        Apply Fixed Value
      </button>
    </div>
  );

  const renderSpecialFieldTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Available Special Fields
        </h4>
        <div className="space-y-2">
          <button
            onClick={handleSpecialFieldSubmit}
            className="w-full px-4 py-2 text-left border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <span className="font-mono">UUID</span>
            <span className="block text-sm text-gray-500 dark:text-gray-400">
              Generate a new UUID
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const filteredFields = availableFields.filter(field =>
    field.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40" 
        aria-hidden="true"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        style={positionStyle}
        className={`
          bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700
          z-50 flex flex-col rounded-lg overflow-hidden
        `}
      >
        <div className="h-full flex flex-col">
          <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Map Field: <span className="font-mono text-blue-600 dark:text-blue-400 text-base">{fieldPath}</span>
              </h3>
              <button
                onClick={onClose}
                aria-label="Close mapping panel"
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-full p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <nav className="-mb-px flex space-x-8" aria-label="Mapping options">
                  <button
                    onClick={() => setActiveTab('mongodb')}
                    className={`
                      py-2 px-1 border-b-2 font-medium text-sm
                      ${activeTab === 'mongodb'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    MongoDB Field
                  </button>
                  <button
                    onClick={() => setActiveTab('fixed')}
                    className={`
                      py-2 px-1 border-b-2 font-medium text-sm
                      ${activeTab === 'fixed'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    Fixed Value
                  </button>
                  <button
                    onClick={() => setActiveTab('special')}
                    className={`
                      py-2 px-1 border-b-2 font-medium text-sm
                      ${activeTab === 'special'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    Special Field
                  </button>
                </nav>
              </div>

              <div className="mt-4">
                {activeTab === 'mongodb' && renderMongoDBTab()}
                {activeTab === 'fixed' && renderFixedValueTab()}
                {activeTab === 'special' && renderSpecialFieldTab()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const JsonTree: React.FC<JsonTreeProps> = React.memo(({ 
  data, 
  path = '', 
  selectedPath, 
  onKeyClick,
  mappings = {} 
}) => {
  const isChildOfSelected = Boolean(selectedPath && path.startsWith(selectedPath + '.'));
  const isSelected = selectedPath === path;

  const renderValue = useCallback((value: unknown, key: string, fieldPath: string) => {
    if (value === null) {
      return (
        <div className="flex items-baseline">
          <div className="flex items-baseline py-1">
            <ClickableKey 
              fieldKey={key} 
              path={fieldPath}
              isDisabled={isChildOfSelected}
              onKeyClick={onKeyClick}
              mapping={mappings[fieldPath]}
            />
            <span className="ml-2 text-gray-400">: null</span>
          </div>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className="flex flex-col">
          <div className="flex items-baseline py-1">
            <ClickableKey 
              fieldKey={key} 
              path={fieldPath}
              isDisabled={isChildOfSelected}
              onKeyClick={onKeyClick}
              mapping={mappings[fieldPath]}
            />
            <span className="ml-2 text-gray-400">: [</span>
          </div>
          <div className="ml-6 border-l-2 border-gray-700 dark:border-gray-600 pl-4">
            {value.map((item, index) => (
              <div key={index} className="flex items-baseline">
                {renderValue(item, `${index}`, `${fieldPath}[${index}]`)}
                {index < value.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            ))}
          </div>
          <div className="flex items-baseline">
            <span className="text-gray-400">]</span>
          </div>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div className="flex flex-col">
          <div className="flex items-baseline py-1">
            <ClickableKey 
              fieldKey={key} 
              path={fieldPath}
              isDisabled={isChildOfSelected}
              onKeyClick={onKeyClick}
              mapping={mappings[fieldPath]}
            />
            <span className="ml-2 text-gray-400">: {`{`}</span>
          </div>
          <div className="ml-6 border-l-2 border-gray-700 dark:border-gray-600 pl-4">
            {Object.entries(value as Record<string, unknown>).map(([k, v], index, arr) => (
              <div key={k} className="flex items-baseline">
                {renderValue(v, k, `${fieldPath}.${k}`)}
                {index < arr.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            ))}
          </div>
          <div className="flex items-baseline">
            <span className="text-gray-400">{'}'}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-baseline">
        <div className="flex items-baseline py-1">
          <ClickableKey 
            fieldKey={key} 
            path={fieldPath}
            isDisabled={isChildOfSelected}
            onKeyClick={onKeyClick}
            mapping={mappings[fieldPath]}
          />
          <span className={`ml-2 ${isChildOfSelected ? 'text-gray-500 dark:text-gray-600' : 'text-emerald-500 dark:text-emerald-400'}`}>
            : {typeof value === 'string' ? `"${value}"` : String(value)}
          </span>
        </div>
      </div>
    );
  }, [isChildOfSelected, onKeyClick, mappings]);

  if (typeof data === 'object' && data !== null) {
    return (
      <div className="space-y-1">
        {Object.entries(data as Record<string, unknown>).map(([key, value], index, arr) => {
          const fieldPath = path ? `${path}.${key}` : key;
          return (
            <div key={key} className="flex items-baseline">
              {renderValue(value, key, fieldPath)}
              {index < arr.length - 1 && <span className="text-gray-400">,</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
});

JsonTree.displayName = 'JsonTree';

export const CurlAnalyzer: React.FC<CurlAnalyzerProps> = ({
  curlCommand,
  onFieldMap,
  availableFields
}) => {
  const [parsedCurl, setParsedCurl] = useState<ParsedCurl | null>(null);
  const [panelState, setPanelState] = useState<PanelState>({
    isOpen: false,
    position: { top: 0, right: 0, left: 0, bottom: 0 },
    fieldPath: '',
    fieldType: ''
  });
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, MappingInfo>>({});

  useEffect(() => {
    const parseCurlCommand = (curl: string): ParsedCurl => {
      try {
        const lines = curl.split('\n').map(line => line.trim());
        const parsed: ParsedCurl = {
          method: '',
          url: {
            base: '',
            pathParams: {},
            queryParams: {}
          },
          headers: {},
          body: null
        };

        // Parse the first line (URL and method)
        const firstLine = lines[0];
        const methodMatch = firstLine.match(/--request\s+(\w+)/);
        if (methodMatch) {
          parsed.method = methodMatch[1];
        } else {
          parsed.method = 'GET';
        }

        const urlMatch = firstLine.match(/'([^']+)'/);
        if (!urlMatch) {
          throw new Error('Invalid CURL command: URL not found');
        }

        const url = urlMatch[1];
        const [basePath, queryString] = url.split('?');
        
        // Parse path parameters
        const pathParts = basePath.split('/');
        const processedParts: string[] = [];
        
        pathParts.forEach(part => {
          if (part.match(/\{\$P[^}]+\}/)) {
            const paramName = part.slice(3, -1);
            parsed.url.pathParams[paramName] = part;
            processedParts.push(part);
          } else if (part) {
            processedParts.push(part);
          }
        });
        
        parsed.url.base = processedParts.join('/');

        // Parse query parameters
        if (queryString) {
          queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key && value) {
              parsed.url.queryParams[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          });
        }

        // Parse headers
        const headerLines = lines.filter(line => line.startsWith('--header'));
        headerLines.forEach(line => {
          const headerMatch = line.match(/--header\s+'([^:]+):\s*([^']+)'/);
          if (headerMatch) {
            const [_, key, value] = headerMatch;
            parsed.headers[key] = value;
          }
        });

        // Parse body
        const dataIndex = lines.findIndex(line => 
          line.includes('--data') || 
          line.includes('--data-raw') || 
          line.includes('-d')
        );

        if (dataIndex !== -1) {
          let bodyContent = '';
          let i = dataIndex;
          const currentLine = lines[i];
          
          const bodyStartMatch = currentLine.match(/(?:--data(?:-raw)?|-d)\s+'(.*)$/);
          
          if (bodyStartMatch) {
            bodyContent = bodyStartMatch[1];
            
            if (!currentLine.endsWith("'") || currentLine.endsWith("\\'")) {
              i++;
              while (i < lines.length) {
                const line = lines[i];
                if (line.endsWith("'") && !line.endsWith("\\'")) {
                  bodyContent += '\n' + line.slice(0, -1);
                  break;
                } else {
                  bodyContent += '\n' + line;
                }
                i++;
              }
            }

            bodyContent = bodyContent.trim();
            
            try {
              if (bodyContent.startsWith("'") && bodyContent.endsWith("'")) {
                bodyContent = bodyContent.slice(1, -1);
              }
              
              bodyContent = bodyContent
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
                .replace(/\\\\/g, '\\');

              try {
                parsed.body = JSON.parse(bodyContent);
              } catch (firstError) {
                const cleanContent = bodyContent
                  .replace(/,\s*}/g, '}')
                  .replace(/,\s*\]/g, ']')
                  .replace(/\n\s*/g, '')
                  .trim();
                
                parsed.body = JSON.parse(cleanContent);
              }
            } catch (error) {
              parsed.body = bodyContent;
            }
          }
        }

        return parsed;
      } catch (error) {
        throw new Error(`Failed to parse CURL command: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    try {
      setParsedCurl(parseCurlCommand(curlCommand));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CURL command');
      setParsedCurl(null);
    }
  }, [curlCommand]);

  const handleKeyClick = useCallback((path: string, type: string, event: React.MouseEvent) => {
    setSelectedPath(path);

    // Get the bounding box of the clicked button
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    setPanelState({
      isOpen: true,
      position: {
        top: rect.top,      // Use top of clicked element
        right: rect.right,  // Right edge of clicked element
        left: rect.left,    // Left edge of clicked element
        bottom: rect.bottom // Bottom of clicked element
      },
      fieldPath: path,
      fieldType: type
    });
  }, []);

  const handlePanelClose = useCallback(() => {
    setPanelState(prev => ({ ...prev, isOpen: false }));
    setSelectedPath(undefined);
  }, []);

  const handleFieldMapping = useCallback((field: string, config?: FixedValueConfig | SpecialFieldConfig) => {
    let mappingInfo: MappingInfo;
    
    if (!config) {
      // MongoDB field mapping
      mappingInfo = {
        targetField: field,
        type: 'mongodb'
      };
    } else if ('type' in config && config.type === 'uuid') {
      // Special field mapping
      mappingInfo = {
        targetField: 'UUID',
        type: 'special'
      };
    } else {
      // Fixed value mapping
      mappingInfo = {
        targetField: 'Fixed Value',
        type: 'fixed',
        value: (config as FixedValueConfig).value
      };
    }

    setMappings((prev: Record<string, MappingInfo>) => ({
      ...prev,
      [panelState.fieldPath]: mappingInfo
    }));
    
    onFieldMap(field, mappingInfo.targetField);
  }, [panelState.fieldPath, onFieldMap]);

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4" role="alert">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!parsedCurl) return null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>
      )}
      
      {parsedCurl && (
        <div className="space-y-6">
          {/* URL Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL Parameters</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
              <JsonTree
                data={parsedCurl.url.pathParams}
                path="url"
                selectedPath={selectedPath}
                onKeyClick={handleKeyClick}
                mappings={mappings}
              />
            </div>
          </div>

          {/* Headers Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Headers</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
              <JsonTree
                data={parsedCurl.headers}
                path="header"
                selectedPath={selectedPath}
                onKeyClick={handleKeyClick}
                mappings={mappings}
              />
            </div>
          </div>

          {/* Body Section */}
          {parsedCurl.body && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Body</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
                <JsonTree
                  data={parsedCurl.body}
                  path="body"
                  selectedPath={selectedPath}
                  onKeyClick={handleKeyClick}
                  mappings={mappings}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <MappingPanel
        isOpen={panelState.isOpen}
        initialPosition={panelState.position}
        onClose={handlePanelClose}
        availableFields={availableFields}
        onSelect={handleFieldMapping}
        fieldPath={panelState.fieldPath}
      />
    </div>
  );
}; 