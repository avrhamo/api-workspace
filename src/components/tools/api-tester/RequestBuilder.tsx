import { FC, useState } from 'react';
import { LinkIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MongoField, CurlCommand } from './utils';

interface RequestBuilderProps {
  curlCommand: CurlCommand;
  mongoFields: MongoField[];
  onLink: (curlComponent: string, mongoField: string) => void;
  onUnlink: (curlComponent: string) => void;
  links: Record<string, string>;
}

const RequestBuilder: FC<RequestBuilderProps> = ({
  curlCommand,
  mongoFields,
  onLink,
  onUnlink,
  links,
}) => {
  const [selectedCurlComponent, setSelectedCurlComponent] = useState<string | null>(null);

  const renderCurlComponent = (component: string, value: string) => {
    const isLinked = links[component];
    const isSelected = selectedCurlComponent === component;

    return (
      <div
        key={component}
        className={`p-2 rounded-lg cursor-pointer transition-colors ${
          isLinked
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : isSelected
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        onClick={() => setSelectedCurlComponent(component)}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm">{value}</span>
          {isLinked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlink(component);
              }}
              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* CURL Components */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          CURL Components
        </h3>
        <div className="space-y-2">
          {renderCurlComponent('method', curlCommand.method)}
          {renderCurlComponent('url', curlCommand.url)}
          {Object.entries(curlCommand.headers).map(([key, value]) =>
            renderCurlComponent(`header.${key}`, `${key}: ${value}`)
          )}
          {curlCommand.body && renderCurlComponent('body', curlCommand.body)}
        </div>
      </div>

      {/* MongoDB Fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          MongoDB Fields
        </h3>
        <div className="space-y-2">
          {mongoFields.map((field) => (
            <div
              key={field.path}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                selectedCurlComponent && !links[selectedCurlComponent]
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
              onClick={() => {
                if (selectedCurlComponent && !links[selectedCurlComponent]) {
                  onLink(selectedCurlComponent, field.path);
                  setSelectedCurlComponent(null);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm">{field.path}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({field.type})
                  </span>
                </div>
                {selectedCurlComponent && !links[selectedCurlComponent] && (
                  <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RequestBuilder; 