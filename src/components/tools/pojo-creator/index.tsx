import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '../../common/editor/MonacoEditor';
import { DocumentArrowDownIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FaJava } from 'react-icons/fa';
import JSZip from 'jszip';
import { useTheme } from '../../../hooks/useTheme';

interface POJOState {
  jsonInput: string;
  generatedFiles: Record<string, string>; // { fileName: code }
  selectedFile: string; // fileName
  className: string;
  packageName: string;
  error: string | null;
  options: {
    useLombok: boolean;
    useJackson: boolean;
    useValidation: boolean;
  };
}

interface POJOCreatorProps {
  state: POJOState;
  setState: (state: Partial<POJOState>) => void;
  editorHeight?: string;
}

// Helper: Capitalize and camel-case
const toPascalCase = (str: string) =>
  str.replace(/(^|_|\s|-)([a-z])/g, (_, __, chr) => chr.toUpperCase());

// Helper: Singularize (basic)
const singularize = (str: string) =>
  str.replace(/ies$/, 'y').replace(/s$/, '');

// Helper: Suffix for array item classes
const itemClassName = (field: string) => toPascalCase(singularize(field)) + 'Item';

// Recursive class generator
function generateClasses(
  obj: any,
  className: string,
  packageName: string,
  options: POJOState['options'],
  classes: Record<string, string> = {},
  seen: Set<string> = new Set()
) {
  if (seen.has(className)) return classes;
  seen.add(className);
  const imports = new Set<string>();
  let code = `package ${packageName};\n\n`;
  if (options.useLombok) {
    imports.add('import lombok.Data;');
    imports.add('import lombok.NoArgsConstructor;');
    imports.add('import lombok.AllArgsConstructor;');
  }
  if (options.useJackson) imports.add('import com.fasterxml.jackson.annotation.JsonProperty;');
  if (options.useValidation) imports.add('import javax.validation.constraints.*;');
  // For lists
  let needsList = false;
  // For nested classes
  const nestedFields: { key: string; type: string; value: any }[] = [];
  // Fields
  const fields = Object.entries(obj).map(([key, value]) => {
    let type = 'Object';
    let field = '';
    let fieldName = key.match(/^\w+$/) ? key : key.replace(/[^a-zA-Z0-9_]/g, '_');
    let javaField = fieldName;
    if (Array.isArray(value)) {
      needsList = true;
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
        // Array of objects (recursively generate item class)
        const itemClass = itemClassName(fieldName);
        type = `List<${itemClass}>`;
        nestedFields.push({ key: itemClass, type: itemClass, value: value[0] });
        imports.add('import java.util.List;');
      } else if (value.length > 0) {
        // Array of primitives
        type = `List<${typeof value[0] === 'string' ? 'String' : typeof value[0] === 'number' ? (Number.isInteger(value[0]) ? 'Integer' : 'Double') : 'Object'}>`;
        imports.add('import java.util.List;');
      } else {
        type = 'List<Object>';
        imports.add('import java.util.List;');
      }
    } else if (typeof value === 'object' && value !== null) {
      // Nested object (recursively generate class)
      const classFieldName = toPascalCase(singularize(fieldName));
      type = classFieldName;
      nestedFields.push({ key: classFieldName, type: classFieldName, value });
    } else if (typeof value === 'string') {
      type = 'String';
    } else if (typeof value === 'number') {
      type = Number.isInteger(value) ? 'Integer' : 'Double';
    } else if (typeof value === 'boolean') {
      type = 'Boolean';
    }
    if (options.useJackson) field += `    @JsonProperty(\"${key}\")\n`;
    if (options.useValidation && type === 'String') field += '    @NotBlank\n';
    if (options.useValidation && (type === 'Integer' || type === 'Long' || type === 'Double')) field += '    @NotNull\n';
    field += `    private ${type} ${javaField};\n`;
    return field;
  });
  imports.forEach(imp => code += imp + '\n');
  code += '\n';
  if (options.useLombok) code += '@Data\n@NoArgsConstructor\n@AllArgsConstructor\n';
  code += `public class ${className} {\n\n`;
  code += fields.join('\n');
  code += '}\n';
  classes[className + '.java'] = code;
  // Recursively generate nested classes
  nestedFields.forEach(({ key, value }) => {
    generateClasses(value, key, packageName, options, classes, seen);
  });
  return classes;
}

const POJOCreator: React.FC<POJOCreatorProps> = ({ state, setState, editorHeight = '800px' }) => {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const { theme } = useTheme();
  const [inputTouched, setInputTouched] = useState(false);
  const [collapseTimeout, setCollapseTimeout] = useState<NodeJS.Timeout | null>(null);
  const monacoRef = useRef<any>(null);

  // Generate classes when input changes
  useEffect(() => {
    if (state.jsonInput) {
      try {
        const json = JSON.parse(state.jsonInput);
        const files = generateClasses(
          json,
          toPascalCase(state.className),
          state.packageName,
          state.options
        );
        const firstFile = Object.keys(files)[0] || '';
        setState({ generatedFiles: files, selectedFile: firstFile, error: null });
      } catch (error) {
        setState({ error: 'Invalid JSON input' });
      }
    } else {
      setState({ generatedFiles: {}, selectedFile: '', error: null });
    }
    // eslint-disable-next-line
  }, [state.jsonInput, state.className, state.packageName, state.options]);

  // Auto-collapse input after JSON input
  useEffect(() => {
    if (inputTouched && !inputCollapsed) {
      if (collapseTimeout) clearTimeout(collapseTimeout);
      const timeout = setTimeout(() => setInputCollapsed(true), 1200);
      setCollapseTimeout(timeout);
    }
    // eslint-disable-next-line
  }, [state.jsonInput]);

  // Dynamically update Monaco theme on theme switch
  useEffect(() => {
    if (monacoRef.current && monacoRef.current.editor) {
      const monaco = monacoRef.current.monaco;
      if (monaco) {
        monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'light');
      }
    }
  }, [theme]);

  // Save all files as zip
  const handleSaveAll = async () => {
    if (!state.generatedFiles || Object.keys(state.generatedFiles).length === 0) return;
    const zip = new JSZip();
    Object.entries(state.generatedFiles).forEach(([fileName, code]) => {
      zip.file(fileName, code);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.className}_pojos.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const fileList = Object.keys(state.generatedFiles || {});
  const selectedCode = state.generatedFiles?.[state.selectedFile] || '// Select a file to view its code...';

  // Dynamic text color for file names
  const fileNameTextClass = theme === 'dark' ? 'text-gray-100' : 'text-black-800';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top: JSON Input and Options (collapsible) */}
      <div className={`border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 ${inputCollapsed ? 'h-12 overflow-hidden' : 'h-auto'}`}>
        <div className="flex items-center justify-between px-4 pt-2">
          <button
            className="flex items-center text-gray-600 dark:text-gray-300 focus:outline-none"
            onClick={() => setInputCollapsed(!inputCollapsed)}
            title={inputCollapsed ? 'Expand input section' : 'Collapse input section'}
          >
            {inputCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            <span className="ml-1 text-sm font-medium">Input</span>
          </button>
        </div>
        {!inputCollapsed && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  value={state.className}
                  onChange={(e) => setState({ className: e.target.value })}
                  placeholder="Enter class name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  value={state.packageName}
                  onChange={(e) => setState({ packageName: e.target.value })}
                  placeholder="Enter package name..."
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                JSON Input
              </label>
              <div className="h-48 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" style={{ height: editorHeight }}>
                <MonacoEditor
                  key={theme}
                  value={state.jsonInput}
                  onChange={(value) => {
                    setState({ jsonInput: value || '' });
                    setInputTouched(true);
                  }}
                  language="json"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  onMount={(editor, monaco) => {
                    monacoRef.current = { editor, monaco };
                  }}
                  height={editorHeight}
                />
              </div>
            </div>
            <div className="mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</h3>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={state.options.useLombok}
                    onChange={(e) => setState({ options: { ...state.options, useLombok: e.target.checked } })}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use Lombok</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={state.options.useJackson}
                    onChange={(e) => setState({ options: { ...state.options, useJackson: e.target.checked } })}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use Jackson</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={state.options.useValidation}
                    onChange={(e) => setState({ options: { ...state.options, useValidation: e.target.checked } })}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use Validation</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Main: File Explorer and Editor */}
      <div className="flex-1 flex flex-row overflow-auto">
        {/* Left: Monaco Editor */}
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {state.selectedFile || 'No file selected'}
            </label>
            <button
              onClick={handleSaveAll}
              disabled={fileList.length === 0}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save all Java files as zip"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              Save All
            </button>
          </div>
          <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-auto min-h-0" style={{ height: editorHeight }}>
            <MonacoEditor
              key={theme}
              value={selectedCode}
              language="java"
              readOnly
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              height={editorHeight}
              onMount={(editor, monaco) => {
                monacoRef.current = { editor, monaco };
              }}
            />
          </div>
          {state.error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md mt-2">
              {state.error}
            </div>
          )}
        </div>
        {/* Right: File Explorer as grid */}
        <div className="w-[32rem] flex flex-col p-4 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <div className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Files</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 overflow-y-auto">
            {fileList.map(fileName => (
              <div
                key={fileName}
                className={`flex flex-col items-center gap-2 p-4 rounded cursor-pointer transition-colors ${state.selectedFile === fileName ? 'bg-blue-100 dark:bg-blue-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                onClick={() => setState({ selectedFile: fileName })}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
                title={fileName}
                style={{ minWidth: 0 }}
              >
                <FaJava className="text-orange-600 w-8 h-8" />
                <span className="truncate max-w-[120px] text-xs text-center font-medium text-black dark:text-white">
                  {fileName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POJOCreator; 