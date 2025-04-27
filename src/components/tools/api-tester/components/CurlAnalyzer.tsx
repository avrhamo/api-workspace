import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

const ClickableWord: React.FC<{
  value: string;
  type: string;
  onWordClick: (value: string, type: string, event: React.MouseEvent) => void;
}> = ({ value, type, onWordClick }) => (
  <button
    onClick={(e) => onWordClick(value, type, e)}
    className="px-1.5 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-mono border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-colors duration-150"
  >
    {value}
  </button>
);

export const CurlAnalyzer: React.FC<CurlAnalyzerProps> = ({
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
      // Enhanced parsing logic for the new format
      const lines = curl.split('\n').map(line => line.trim());
      const parsed: ParsedCurl = {
        method: 'GET', // default
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
      const bodyLine = lines.find(line => line.includes('--data-raw'));
      if (bodyLine) {
        const bodyMatch = bodyLine.match(/--data-raw\s+'([^']+)'/);
        if (bodyMatch) {
          try {
            parsed.body = JSON.parse(bodyMatch[1]);
          } catch (e) {
            parsed.body = bodyMatch[1];
          }
        }
      }

      return parsed;
    };

    setParsedCurl(parseCurlCommand(curlCommand));
  }, [curlCommand]);

  const handleWordClick = (value: string, type: string, event: React.MouseEvent) => {
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
    <div className="space-y-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* URL Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs mr-2">URL</span>
          Request Path
        </h3>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 font-mono">
            <ClickableWord
              value={parsedCurl.method}
              type="method"
              onWordClick={handleWordClick}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {parsedCurl.url.base.split('/').map((part, index) => {
                if (part.startsWith('{$P')) {
                  return (
                    <React.Fragment key={index}>
                      /<ClickableWord
                        value={part}
                        type="pathParam"
                        onWordClick={handleWordClick}
                      />
                    </React.Fragment>
                  );
                }
                return '/' + part;
              })}
              {Object.keys(parsedCurl.url.queryParams).length > 0 && (
                <span className="text-gray-400 dark:text-gray-500">?</span>
              )}
              {Object.entries(parsedCurl.url.queryParams).map(([key, value], index) => (
                <React.Fragment key={key}>
                  {index > 0 && (
                    <span className="text-gray-400 dark:text-gray-500">&</span>
                  )}
                  <span className="text-gray-600 dark:text-gray-400">{key}</span>
                  <span className="text-gray-400 dark:text-gray-500">=</span>
                  <ClickableWord
                    value={value}
                    type="queryParam"
                    onWordClick={handleWordClick}
                  />
                </React.Fragment>
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* Headers Section */}
      {Object.keys(parsedCurl.headers).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
            <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs mr-2">HEADERS</span>
            Request Headers
          </h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 space-y-2">
            {Object.entries(parsedCurl.headers).map(([key, value]) => (
              <div key={key} className="font-mono flex items-center">
                <span className="text-gray-600 dark:text-gray-400 min-w-32">{key}: </span>
                <ClickableWord
                  value={value}
                  type="header"
                  onWordClick={handleWordClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body Section */}
      {parsedCurl.body && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
            <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs mr-2">BODY</span>
            Request Body
          </h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
            {typeof parsedCurl.body === 'string' ? (
              <ClickableWord
                value={parsedCurl.body}
                type="body"
                onWordClick={handleWordClick}
              />
            ) : (
              <div className="space-y-1">
                {Object.entries(parsedCurl.body).map(([key, value]) => (
                  <div key={key} className="font-mono flex items-center">
                    <span className="text-gray-600 dark:text-gray-400">{key}: </span>
                    <ClickableWord
                      value={value as string}
                      type="bodyField"
                      onWordClick={handleWordClick}
                    />
                  </div>
                ))}
              </div>
            )}
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