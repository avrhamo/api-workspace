import React, { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import './swagger-ui-overrides.css';
import CodeEditor from '../../common/editor/MonacoEditor';
import { useTheme } from '../../../hooks/useTheme';

interface OpenAPIState {
  apiDefinition: string;
  generatedSpec: any;
  error: string | null;
  isFullSpec?: boolean;
}

interface Props {
  state: OpenAPIState;
  setState: (state: Partial<OpenAPIState>) => void;
}

function isFullOpenAPISpec(obj: any): boolean {
  return (
    obj &&
    (typeof obj === 'object') &&
    (typeof obj.openapi === 'string' || typeof obj.swagger === 'string') &&
    obj.paths && typeof obj.paths === 'object'
  );
}

const OpenAPIGenerator: React.FC<Props> = ({ state, setState }) => {
  const { theme } = useTheme();
  const [isFullSpec, setIsFullSpec] = useState(false);

  const generateOpenAPISpec = (apiDef: any): any => {
    let parsed: any;
    try {
      parsed = JSON.parse(apiDef);
    } catch (e) {
      throw new Error('Invalid JSON format');
    }
    if (isFullOpenAPISpec(parsed)) {
      setIsFullSpec(true);
      return parsed;
    }
    setIsFullSpec(false);
    // --- Custom definition to OpenAPI logic ---
    const spec: any = {
      openapi: '3.0.0',
      info: {
        title: 'API Documentation',
        description: '',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/api',
          description: 'API Server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
      },
    };
    try {
      const endpoints = parsed;
      Object.entries(endpoints).forEach(([path, methods]: [string, any]) => {
        spec.paths[path] = {};
        Object.entries(methods).forEach(([method, details]: [string, any]) => {
          const operation: any = {
            summary: details.summary || `${method.toUpperCase()} ${path}`,
            description: details.description || '',
            tags: details.tags || ['default'],
            responses: {
              '200': {
                description: 'Successful operation',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: details.response || {},
                    },
                  },
                },
              },
            },
          };
          if (details.requestBody) {
            operation.requestBody = {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: details.requestBody,
                  },
                },
              },
            };
          }
          if (details.parameters) {
            operation.parameters = details.parameters.map((param: any) => ({
              name: param.name,
              in: param.in || 'query',
              required: param.required || false,
              schema: {
                type: param.type || 'string',
              },
              description: param.description || '',
            }));
          }
          spec.paths[path][method.toLowerCase()] = operation;
        });
        Object.entries(methods).forEach(([method, details]: [string, any]) => {
          if (details.requestBody) {
            const schemaName = `${path.split('/').pop()}Request`;
            spec.components.schemas[schemaName] = {
              type: 'object',
              properties: details.requestBody,
            };
          }
          if (details.response) {
            const schemaName = `${path.split('/').pop()}Response`;
            spec.components.schemas[schemaName] = {
              type: 'object',
              properties: details.response,
            };
          }
        });
      });
      return spec;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Invalid API definition format');
    }
  };

  useEffect(() => {
    if (state.apiDefinition) {
      try {
        const spec = generateOpenAPISpec(state.apiDefinition);
        setState({ generatedSpec: spec, error: null, isFullSpec });
      } catch (error: unknown) {
        setState({ error: error instanceof Error ? error.message : 'An unknown error occurred', isFullSpec: false });
      }
    } else {
      setIsFullSpec(false);
      setState({ generatedSpec: null, error: null, isFullSpec: false });
    }
    // eslint-disable-next-line
  }, [state.apiDefinition]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col md:flex-row w-full h-full overflow-hidden">
        {/* Left: Monaco Editor */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col flex-1 min-h-0">
          <CodeEditor
            value={state.apiDefinition}
            onChange={(val) => setState({ apiDefinition: val || '' })}
            language="json"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
          />
        </div>
        {/* Right: Swagger UI */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 h-0 min-h-0 overflow-y-auto max-h-[calc(100vh-100px)] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300">
            {state.error ? (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-700 transition-all duration-200">
                {state.error}
              </div>
            ) : state.generatedSpec ? (
              <div className="h-full min-h-0 overflow-y-auto">
                <SwaggerUI
                  spec={state.generatedSpec}
                  docExpansion="list"
                  defaultModelsExpandDepth={-1}
                  tryItOutEnabled={true}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <p className="mb-2">No OpenAPI specification generated yet.</p>
                  <p>Please enter your API definition in the editor and ensure it's valid JSON.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenAPIGenerator; 