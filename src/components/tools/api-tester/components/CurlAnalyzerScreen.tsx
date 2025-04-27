import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface CurlAnalyzerScreenProps {
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
  body: any;
}

interface MappingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  availableFields: string[];
  onSelect: (field: string) => void;
  fieldType: string;
  fieldValue: string;
}

const MappingPopup: React.FC<MappingPopupProps> = ({
  isOpen,
  onClose,
  position,
  availableFields,
  onSelect,
  fieldType,
  fieldValue
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredFields = availableFields.filter(field =>
    field.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-64"
      style={{ top: position.y + 'px', left: position.x + 'px' }}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Map {fieldType}: {fieldValue}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        
        <div className="relative mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search fields..."
            className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
          />
          <MagnifyingGlassIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <div className="max-h-48 overflow-y-auto">
          {filteredFields.map((field, index) => (
            <button
              key={index}
              onClick={() => onSelect(field)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              {field}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ClickableValue: React.FC<{
  value: string;
  type: string;
  onValueClick: (value: string, type: string, event: React.MouseEvent) => void;
}> = ({ value, type, onValueClick }) => (
  <button
    onClick={(e) => onValueClick(value, type, e)}
    className="px-1.5 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-mono border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-colors duration-150"
  >
    {value}
  </button>
);

export const CurlAnalyzerScreen: React.FC<CurlAnalyzerScreenProps> = ({
  curlCommand,
  onFieldMap,
  availableFields
}) => {
  const [parsedCurl, setParsedCurl] = useState<ParsedCurl | null>(null);
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    fieldType: string;
    fieldValue: string;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    fieldType: '',
    fieldValue: ''
  });

  useEffect(() => {
    const parseCurlCommand = (curl: string) => {
      const lines = curl.split('\n').map(line => line.trim());
      const parsed: ParsedCurl = {
        method: 'GET',
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
      }

      const urlMatch = firstLine.match(/'([^']+)'/);
      if (urlMatch) {
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
      const bodyLine = lines.find(line => line.startsWith('--data'));
      if (bodyLine) {
        const bodyMatch = bodyLine.match(/--data\s+'(.+)'/);
        if (bodyMatch) {
          try {
            parsed.body = JSON.parse(bodyMatch[1]);
          } catch {
            parsed.body = bodyMatch[1];
          }
        }
      }

      return parsed;
    };

    setParsedCurl(parseCurlCommand(curlCommand));
  }, [curlCommand]);

  const handleValueClick = (value: string, type: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPopupState({
      isOpen: true,
      position: {
        x: rect.left,
        y: rect.bottom + window.scrollY
      },
      fieldType: type,
      fieldValue: value
    });
  };

  const handleFieldSelect = (selectedField: string) => {
    onFieldMap(popupState.fieldValue, selectedField);
    setPopupState(prev => ({ ...prev, isOpen: false }));
  };

  if (!parsedCurl) return null;

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
      {/* URL Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">URL</h3>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center space-x-2 font-mono text-sm">
            <span className="text-purple-600 dark:text-purple-400">{parsedCurl.method}</span>
            <span className="text-gray-600 dark:text-gray-400">{parsedCurl.url.base}</span>
          </div>
          
          {/* Path Parameters */}
          {Object.entries(parsedCurl.url.pathParams).length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Path Parameters</h4>
              <div className="space-y-1">
                {Object.entries(parsedCurl.url.pathParams).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{key}:</span>
                    <ClickableValue value={value} type="path" onValueClick={handleValueClick} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters */}
          {Object.entries(parsedCurl.url.queryParams).length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Query Parameters</h4>
              <div className="space-y-1">
                {Object.entries(parsedCurl.url.queryParams).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{key}:</span>
                    <ClickableValue value={value} type="query" onValueClick={handleValueClick} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Headers Section */}
      {Object.entries(parsedCurl.headers).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Headers</h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="space-y-2">
              {Object.entries(parsedCurl.headers).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{key}:</span>
                  <ClickableValue value={value} type="header" onValueClick={handleValueClick} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Body Section */}
      {parsedCurl.body && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Body</h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {typeof parsedCurl.body === 'string' 
                ? parsedCurl.body 
                : JSON.stringify(parsedCurl.body, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <MappingPopup
        isOpen={popupState.isOpen}
        onClose={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
        position={popupState.position}
        availableFields={availableFields}
        onSelect={handleFieldSelect}
        fieldType={popupState.fieldType}
        fieldValue={popupState.fieldValue}
      />
    </div>
  );
}; 