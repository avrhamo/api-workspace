import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '../../common/editor/MonacoEditor';
import { DocumentArrowDownIcon, ChevronDownIcon, ChevronRightIcon, CloudArrowDownIcon, FolderOpenIcon } from '@heroicons/react/24/outline';
import { FaJava } from 'react-icons/fa';
import JSZip from 'jszip';
import { useTheme } from '../../../hooks/useTheme';
import type { ElectronAPI } from '../../../types/electron';

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
    useBuilder: boolean;
    generateDummyUtils: boolean;
    usePrimitiveTypes: boolean;
    parseBsonTypes: boolean;
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

// Helper: Convert to SNAKE_CASE
const toSnakeCase = (str: string) =>
  str.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toUpperCase();

// Helper: Singularize (basic)
const singularize = (str: string) =>
  str.replace(/ies$/, 'y').replace(/s$/, '');

// Helper: Suffix for array item classes
const itemClassName = (field: string) => toPascalCase(singularize(field)) + 'Item';

// Helper: Generate Java literal for value
const toJavaLiteral = (value: any): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value.replace(/"/g, '\\"')}"`;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (Array.isArray(value)) {
    if (value.length === 0) return 'new ArrayList<>()';
    const elements = value.map(v => toJavaLiteral(v)).join(', ');
    return `Arrays.asList(${elements})`;
  }
  return 'null'; // For objects, we'll handle them separately
};

// Helper: Check if value is a BSON type
const isBsonType = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  
  const bsonTypes = ['$oid', '$date', '$numberLong', '$numberInt', '$numberDouble', '$timestamp', '$binary'];
  return bsonTypes.some(type => type in value);
};

// Helper: Get Java type from BSON value
const getBsonJavaType = (value: any): { type: string; imports: Set<string> } => {
  const imports = new Set<string>();
  
  if ('$oid' in value) {
    imports.add('import org.bson.types.ObjectId;');
    return { type: 'ObjectId', imports };
  }
  
  if ('$date' in value) {
    imports.add('import java.time.LocalDateTime;');
    return { type: 'LocalDateTime', imports };
  }
  
  if ('$numberLong' in value) {
    return { type: 'Long', imports };
  }
  
  if ('$numberInt' in value) {
    return { type: 'Integer', imports };
  }
  
  if ('$numberDouble' in value) {
    return { type: 'Double', imports };
  }
  
  if ('$timestamp' in value) {
    imports.add('import java.sql.Timestamp;');
    return { type: 'Timestamp', imports };
  }
  
  if ('$binary' in value) {
    return { type: 'byte[]', imports };
  }
  
  return { type: 'Object', imports };
};

// Helper: Get Java literal for BSON values in util classes
const getBsonJavaLiteral = (value: any): string => {
  if ('$oid' in value) {
    return `new ObjectId("${value.$oid}")`;
  }
  
  if ('$date' in value) {
    return `LocalDateTime.parse("${new Date(value.$date).toISOString().slice(0, -1)}")`;
  }
  
  if ('$numberLong' in value) {
    return `${value.$numberLong}L`;
  }
  
  if ('$numberInt' in value) {
    return `${value.$numberInt}`;
  }
  
  if ('$numberDouble' in value) {
    return `${value.$numberDouble}`;
  }
  
  if ('$timestamp' in value) {
    const timestampValue = value.$timestamp.t * 1000;
    return `new Timestamp(${timestampValue}L)`;
  }
  
  if ('$binary' in value) {
    return `"${value.$binary.base64}".getBytes()`;
  }
  
  return 'null';
};

// Helper: Generate util class with static constants and factory method
function generateUtilClass(
  obj: any,
  className: string,
  packageName: string,
  options: POJOState['options'],
  originalClassName: string
): string {
  const imports = new Set<string>();
  let code = `package ${packageName};\n\n`;

  if (options.useLombok) {
    imports.add('import lombok.Builder;');
  }
  imports.add('import java.util.Arrays;');
  imports.add('import java.util.ArrayList;');

  const constants: string[] = [];
  const factoryParams: string[] = [];

  // Generate constants for each field
  Object.entries(obj).forEach(([key, value]) => {
    const constantName = toSnakeCase(key);
    
    // Handle BSON types first if enabled
    if (options.parseBsonTypes && isBsonType(value)) {
      const bsonResult = getBsonJavaType(value);
      bsonResult.imports.forEach(imp => imports.add(imp));
      const javaValue = getBsonJavaLiteral(value);
      constants.push(`    public static final ${bsonResult.type} ${constantName} = ${javaValue};`);
      factoryParams.push(`${constantName}`);
      return;
    }
    
    const javaValue = toJavaLiteral(value);
    
    if (typeof value === 'string') {
      constants.push(`    public static final String ${constantName} = ${javaValue};`);
      factoryParams.push(`${constantName}`);
    } else if (typeof value === 'number') {
      if (options.usePrimitiveTypes) {
        const type = Number.isInteger(value) ? 'int' : 'double';
        constants.push(`    public static final ${type} ${constantName} = ${javaValue};`);
      } else {
        const type = Number.isInteger(value) ? 'Integer' : 'Double';
        constants.push(`    public static final ${type} ${constantName} = ${javaValue};`);
      }
      factoryParams.push(`${constantName}`);
    } else if (typeof value === 'boolean') {
      const type = options.usePrimitiveTypes ? 'boolean' : 'Boolean';
      constants.push(`    public static final ${type} ${constantName} = ${javaValue};`);
      factoryParams.push(`${constantName}`);
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] !== 'object') {
      // Array of primitives
      const elementType = typeof value[0] === 'string' ? 'String' : 
                         typeof value[0] === 'number' ? (Number.isInteger(value[0]) ? 'Integer' : 'Double') : 'Object';
      constants.push(`    public static final List<${elementType}> ${constantName} = ${javaValue};`);
      imports.add('import java.util.List;');
      factoryParams.push(`${constantName}`);
    }
    // Note: We'll handle nested objects differently - they'll have their own util classes
  });

  // Add imports
  imports.forEach(imp => code += imp + '\n');
  code += '\n';

  // Class declaration
  code += `public class ${className}Util {\n\n`;

  // Add constants
  constants.forEach(constant => {
    code += constant + '\n';
  });

  if (constants.length > 0) {
    code += '\n';
  }

  // Add factory method
  code += `    public static ${originalClassName} get${originalClassName}() {\n`;
  if (options.useBuilder && options.useLombok) {
    code += `        return ${originalClassName}.builder()\n`;
    Object.entries(obj).forEach(([key, value]) => {
      const fieldName = key.match(/^\w+$/) ? key : key.replace(/[^a-zA-Z0-9_]/g, '_');
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(options.parseBsonTypes && isBsonType(value))) {
        // For nested objects, call their util methods - but NOT for BSON types
        const nestedClassName = toPascalCase(singularize(fieldName));
        code += `                .${fieldName}(${nestedClassName}Util.get${nestedClassName}())\n`;
      } else {
        const constantName = toSnakeCase(key);
        code += `                .${fieldName}(${constantName})\n`;
      }
    });
    code += `                .build();\n`;
  } else {
    code += `        ${originalClassName} obj = new ${originalClassName}();\n`;
    Object.entries(obj).forEach(([key, value]) => {
      const fieldName = key.match(/^\w+$/) ? key : key.replace(/[^a-zA-Z0-9_]/g, '_');
      const setterName = 'set' + fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(options.parseBsonTypes && isBsonType(value))) {
        // For nested objects, call their util methods - but NOT for BSON types
        const nestedClassName = toPascalCase(singularize(fieldName));
        code += `        obj.${setterName}(${nestedClassName}Util.get${nestedClassName}());\n`;
      } else {
        const constantName = toSnakeCase(key);
        code += `        obj.${setterName}(${constantName});\n`;
      }
    });
    code += `        return obj;\n`;
  }
  code += `    }\n`;
  code += '}\n';

  return code;
}

// Helper: Generate util class specifically for arrays/lists
function generateArrayUtilClass(
  array: any[],
  className: string,
  packageName: string,
  originalFieldName: string
): string {
  const imports = new Set<string>();
  let code = `package ${packageName};\n\n`;

  imports.add('import java.util.Arrays;');
  imports.add('import java.util.List;');

  // Determine the element type
  const elementType = typeof array[0] === 'string' ? 'String' : 
                     typeof array[0] === 'number' ? (Number.isInteger(array[0]) ? 'Integer' : 'Double') : 'Object';

  // Generate the constant name in SNAKE_CASE  
  const constantName = toSnakeCase(originalFieldName);
  const javaValue = toJavaLiteral(array);

  // Add imports
  imports.forEach(imp => code += imp + '\n');
  code += '\n';

  // Class declaration
  code += `public class ${className}Util {\n\n`;

  // Add the array constant
  code += `    public static final List<${elementType}> ${constantName} = ${javaValue};\n\n`;

  // Add factory method
  code += `    public static List<${elementType}> get${className}() {\n`;
  code += `        return ${constantName};\n`;
  code += `    }\n`;
  code += '}\n';

  return code;
}

// Recursive class generator
function generateClasses(
  obj: any,
  className: string,
  packageName: string,
  options: POJOState['options'],
  classes: Record<string, string> = {},
  seen: Set<string> = new Set(),
  originalObj?: any, // Keep track of original JSON for util generation
  rootClassName?: string // Keep track of root class name
) {
  if (seen.has(className)) return classes;
  seen.add(className);
  
  // Set defaults for root call
  if (!originalObj) originalObj = obj;
  if (!rootClassName) rootClassName = className;
  
  const imports = new Set<string>();
  let code = `package ${packageName};\n\n`;
  
  if (options.useLombok) {
    imports.add('import lombok.Data;');
    imports.add('import lombok.NoArgsConstructor;');
    imports.add('import lombok.AllArgsConstructor;');
    if (options.useBuilder) {
      imports.add('import lombok.Builder;');
    }
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
    
    // Check for BSON types first if enabled
    if (options.parseBsonTypes && isBsonType(value)) {
      const bsonResult = getBsonJavaType(value);
      type = bsonResult.type;
      bsonResult.imports.forEach(imp => imports.add(imp));
    }
    else if (Array.isArray(value)) {
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
    } else if (typeof value === 'object' && value !== null && !(options.parseBsonTypes && isBsonType(value))) {
      // Nested object (recursively generate class) - but NOT if it's a BSON type
      const classFieldName = toPascalCase(singularize(fieldName));
      type = classFieldName;
      nestedFields.push({ key: classFieldName, type: classFieldName, value });
    } else if (typeof value === 'string') {
      type = 'String';
    } else if (typeof value === 'number') {
      if (options.usePrimitiveTypes) {
        type = Number.isInteger(value) ? 'int' : 'double';
      } else {
        type = Number.isInteger(value) ? 'Integer' : 'Double';
      }
    } else if (typeof value === 'boolean') {
      type = options.usePrimitiveTypes ? 'boolean' : 'Boolean';
    }
    
    if (options.useJackson) field += `    @JsonProperty(\"${key}\")\n`;
    if (options.useValidation && type === 'String') field += '    @NotBlank\n';
    if (options.useValidation && !options.usePrimitiveTypes && (type === 'Integer' || type === 'Long' || type === 'Double' || type === 'Boolean')) field += '    @NotNull\n';
    field += `    private ${type} ${javaField};\n`;
    return field;
  });
  
  imports.forEach(imp => code += imp + '\n');
  code += '\n';
  
  if (options.useLombok) {
    code += '@Data\n@NoArgsConstructor\n@AllArgsConstructor\n';
    if (options.useBuilder) {
      code += '@Builder\n';
    }
  }
  code += `public class ${className} {\n\n`;
  code += fields.join('\n');
  code += '}\n';
  classes[className + '.java'] = code;
  
  // Generate util class if option is enabled and this is not a nested class
  if (options.generateDummyUtils && className === rootClassName) {
    const utilCode = generateUtilClass(originalObj, className, packageName, options, className);
    classes[className + 'Util.java'] = utilCode;
  }
  
  // Recursively generate nested classes
  nestedFields.forEach(({ key, value }) => {
    // Only generate nested classes if the value is not a BSON type
    if (!(options.parseBsonTypes && isBsonType(value))) {
      generateClasses(value, key, packageName, options, classes, seen, originalObj, rootClassName);
      
      // Generate util classes for nested objects too
      if (options.generateDummyUtils) {
        const nestedUtilCode = generateUtilClass(value, key, packageName, options, key);
        classes[key + 'Util.java'] = nestedUtilCode;
      }
    }
  });
  
  // Generate util classes for arrays/lists if option is enabled
  if (options.generateDummyUtils && className === rootClassName) {
    Object.entries(obj).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] !== 'object') {
        // Generate utility class for primitive arrays (like hobbies)
        const arrayClassName = toPascalCase(key);
        const arrayUtilCode = generateArrayUtilClass(value, arrayClassName, packageName, key);
        classes[arrayClassName + 'Util.java'] = arrayUtilCode;
      }
    });
  }
  
  return classes;
}

// Helper: Extract package from file path
const extractPackageFromPath = (filePath: string): string => {
  if (!filePath) return '';
  
  // Find "com" in the path and extract the package structure
  const pathParts = filePath.split(/[/\\]/);
  const comIndex = pathParts.findIndex(part => part === 'com');
  
  if (comIndex === -1) return '';
  
  // Extract from "com" until we hit the file name
  const packageParts = pathParts.slice(comIndex, -1); // Exclude the file name
  return packageParts.join('.');
};

// Helper: Update package declaration in generated code
const updatePackageInCode = (code: string, newPackage: string): string => {
  if (!newPackage) return code;
  
  // Replace the existing package declaration
  return code.replace(/^package\s+[^;]+;/m, `package ${newPackage};`);
};

const POJOCreator: React.FC<POJOCreatorProps> = ({ state, setState, editorHeight = '800px' }) => {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const { theme } = useTheme();
  const [inputTouched, setInputTouched] = useState(false);
  const [collapseTimeout, setCollapseTimeout] = useState<NodeJS.Timeout | null>(null);
  const monacoRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null); // To track which file is being saved
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllMessage, setSaveAllMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

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

  // Function to save a single file using Electron's dialog
  const handleSaveFile = async (fileName: string, content: string) => {
    const api = window.electronAPI as unknown as ElectronAPI;
    if (!api || !api.saveFile) {
      console.error('Electron saveFile API not found. Make sure it is exposed in your preload script.');
      setSaveMessage({ type: 'error', text: 'File saving feature not available.' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    setIsSaving(fileName);
    setSaveMessage(null);
    try {
      const result = await api.saveFile(fileName, content);
      if (result.success && result.filePath) {
        console.log('File saved successfully:', result.filePath);
        
        // Extract package from path for next time
        const detectedPackage = extractPackageFromPath(result.filePath);
        if (detectedPackage && detectedPackage !== state.packageName) {
          setSaveMessage({ 
            type: 'success', 
            text: `File saved: ${result.filePath} (detected package: ${detectedPackage})` 
          });
          // Update the package name for future generations
          setState({ packageName: detectedPackage });
        } else {
          setSaveMessage({ type: 'success', text: `File saved: ${result.filePath}` });
        }
      } else if (result.canceled) {
        console.log('File save was canceled.');
      } else {
        console.error('Failed to save file:', result.error);
        setSaveMessage({ type: 'error', text: `Error saving file: ${result.error || 'Unknown error'}` });
      }
    } catch (error: any) {
      console.error('Error calling saveFile API:', error);
      setSaveMessage({ type: 'error', text: `API Error: ${error.message || 'Failed to initiate save'}` });
    } finally {
      setIsSaving(null);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Function to save files by type (pojo or util)
  const handleSaveFilesByType = async (fileType: 'pojo' | 'util') => {
    const api = window.electronAPI as unknown as ElectronAPI;
    if (!api || !api.saveFilesToDirectory) {
      console.error('Electron saveFilesToDirectory API not found.');
      setSaveAllMessage({ type: 'error', text: 'Save All feature not available.' });
      setTimeout(() => setSaveAllMessage(null), 3000);
      return;
    }
    
    // Filter files by type
    const filteredFiles = Object.entries(state.generatedFiles || {}).filter(([fileName]) => {
      if (fileType === 'util') {
        return fileName.includes('Util.java');
      } else {
        return !fileName.includes('Util.java');
      }
    });
    
    if (filteredFiles.length === 0) {
      setSaveAllMessage({ type: 'info', text: `No ${fileType} files to save.` });
      setTimeout(() => setSaveAllMessage(null), 3000);
      return;
    }

    setIsSavingAll(true);
    setSaveAllMessage(null);

    const filesToSave = filteredFiles.map(([fileName, content]) => ({ fileName, content }));

    try {
      const result = await api.saveFilesToDirectory(filesToSave);
      if (result.success && result.directoryPath) {
        const detectedPackage = extractPackageFromPath(result.directoryPath + '/dummy.java');
        
        if (detectedPackage && detectedPackage !== state.packageName) {
          const updatedFiles = filesToSave.map(file => ({
            ...file,
            content: updatePackageInCode(file.content, detectedPackage)
          }));
          
          try {
            await api.saveFilesToDirectory(updatedFiles);
            setSaveAllMessage({ 
              type: 'success', 
              text: `${result.count || 0} ${fileType} files saved with auto-detected package: ${detectedPackage}` 
            });
          } catch (updateError) {
            setSaveAllMessage({ 
              type: 'success', 
              text: `${result.count || 0} ${fileType} files saved to: ${result.directoryPath}` 
            });
          }
        } else {
          setSaveAllMessage({ type: 'success', text: `${result.count || 0} ${fileType} files saved to: ${result.directoryPath}` });
        }
      } else if (result.canceled) {
        console.log(`Save ${fileType} files was canceled.`);
      } else {
        let errorText = result.error || `Failed to save ${fileType} files.`;
        if (result.errors && result.errors.length > 0) {
          errorText += ` (${result.errors.length} individual errors)`;
          console.error('Individual file save errors:', result.errors);
        }
        setSaveAllMessage({ type: 'error', text: errorText, details: JSON.stringify(result.errors) });
      }
    } catch (error: any) {
      console.error(`Error calling saveFilesToDirectory API for ${fileType}:`, error);
      setSaveAllMessage({ type: 'error', text: `API Error: ${error.message || `Failed to initiate save ${fileType} files`}` });
    } finally {
      setIsSavingAll(false);
      setTimeout(() => setSaveAllMessage(null), 5000);
    }
  };

  // Function to download all files as ZIP
  const handleDownloadAsZip = async () => {
    if (!state.generatedFiles || Object.keys(state.generatedFiles).length === 0) {
      return;
    }

    try {
      const zip = new JSZip();
      
      // Add each file to the ZIP
      Object.entries(state.generatedFiles).forEach(([fileName, content]) => {
        zip.file(fileName, content);
      });

      // Generate the ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.className || 'POJOs'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
    }
  };

  const fileList = Object.keys(state.generatedFiles || {});
  const selectedCode = state.generatedFiles?.[state.selectedFile] || '// Select a file to view its code...';

  // Dynamic text color for file names
  const fileNameTextClass = theme === 'dark' ? 'text-gray-100' : 'text-black-800';

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Top: JSON Input and Options (collapsible) */}
      <div className={`flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-500 ease-in-out ${inputCollapsed ? 'h-12 overflow-hidden' : 'h-auto'}`}>
        <div className="flex items-center justify-between px-4 pt-2">
          <button
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none transition-colors duration-200"
            onClick={() => setInputCollapsed(!inputCollapsed)}
            title={inputCollapsed ? 'Expand input section' : 'Collapse input section'}
          >
            <div className="transition-transform duration-300 ease-in-out">
              {inputCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </div>
            <span className="ml-1 text-sm font-medium">Input</span>
          </button>
        </div>
        {!inputCollapsed && (
          <div className="px-4 pb-4 animate-in fade-in duration-300">
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
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {Object.keys(state.options).map((optionKey) => (
                  <div key={optionKey} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {optionKey === 'useLombok' ? 'Use Lombok' : 
                       optionKey === 'useJackson' ? 'Use Jackson Annotations' :
                       optionKey === 'useValidation' ? 'Use Validation Annotations' :
                       optionKey === 'useBuilder' ? 'Use Builder' :
                       optionKey === 'generateDummyUtils' ? 'Generate Dummy Utils' : 
                       optionKey === 'usePrimitiveTypes' ? 'Use Primitive Types' :
                       optionKey === 'parseBsonTypes' ? 'Parse BSON Types' : optionKey}
                    </span>
                    <button
                      type="button"
                      title={`Toggle ${optionKey === 'useLombok' ? 'Lombok' : 
                        optionKey === 'useJackson' ? 'Jackson Annotations' :
                        optionKey === 'useValidation' ? 'Validation Annotations' :
                        optionKey === 'useBuilder' ? 'Builder' :
                        optionKey === 'generateDummyUtils' ? 'Dummy Utils' : 
                        optionKey === 'usePrimitiveTypes' ? 'Primitive Types' :
                        optionKey === 'parseBsonTypes' ? 'BSON Types' : optionKey}`}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        state.options[optionKey as keyof POJOState['options']] 
                          ? 'bg-blue-600' 
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                      onClick={() =>
                        setState({
                          options: {
                            ...state.options,
                            [optionKey]: !state.options[optionKey as keyof POJOState['options']],
                          },
                        })
                      }
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                          state.options[optionKey as keyof POJOState['options']] 
                            ? 'translate-x-6' 
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {state.error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-200">{state.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Main: File Explorer and Editor */}
      <div className="flex-1 flex flex-row min-h-0 overflow-auto">
        {/* Left: Monaco Editor */}
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {state.selectedFile || 'No file selected'}
            </label>
            <div className="flex space-x-2">
              <button
                onClick={handleDownloadAsZip}
                disabled={fileList.length === 0}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download all generated files as ZIP"
              >
                <CloudArrowDownIcon className="w-4 h-4 mr-1" />
                Save as ZIP
              </button>
              <button
                onClick={() => handleSaveFilesByType('pojo')}
                disabled={isSavingAll || fileList.length === 0}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save all POJO classes to a directory"
              >
                {isSavingAll ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                )}
                Save POJOs
              </button>
              <button
                onClick={() => handleSaveFilesByType('util')}
                disabled={isSavingAll || fileList.length === 0}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save all Util classes to a directory"
              >
                {isSavingAll ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                )}
                Save Utils
              </button>
            </div>
          </div>
          <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-auto min-h-96" style={{ height: editorHeight }}>
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
        </div>
        {/* Right: File Explorer as grid */}
        <div className="w-[32rem] flex flex-col p-4 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 max-h-full overflow-y-auto">
          <div className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Generated Files</div>
          {saveMessage && (
            <div className={`p-2 mb-2 rounded-md text-sm ${saveMessage.type === 'success' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'}`}>
              {saveMessage.text}
            </div>
          )}
          {saveAllMessage && (
            <div className={`p-2 mb-2 rounded-md text-sm ${saveAllMessage.type === 'success' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : saveAllMessage.type === 'error' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'}`}>
              {saveAllMessage.text}
              {saveAllMessage.details && <pre className="mt-1 text-xs whitespace-pre-wrap">{saveAllMessage.details}</pre>}
            </div>
          )}
          
          {/* POJO Classes Section */}
          {(() => {
            const pojoFiles = fileList.filter(fileName => !fileName.includes('Util.java'));
            const utilFiles = fileList.filter(fileName => fileName.includes('Util.java'));
            
            return (
              <>
                {pojoFiles.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">POJO Classes ({pojoFiles.length})</h3>
                      <button
                        onClick={() => handleSaveFilesByType('pojo')}
                        disabled={isSavingAll || pojoFiles.length === 0}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Save all POJO classes to a directory"
                      >
                        {isSavingAll ? (
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                        )}
                        Save POJOs
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {pojoFiles.map(fileName => (
                        <div
                          key={fileName}
                          className={`relative flex flex-col items-center gap-2 p-3 rounded cursor-pointer transition-colors ${state.selectedFile === fileName ? 'bg-blue-100 dark:bg-blue-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                          onClick={() => setState({ selectedFile: fileName })}
                          onMouseEnter={() => setHoveredFile(fileName)}
                          onMouseLeave={() => setHoveredFile(null)}
                          title={fileName}
                          style={{ minWidth: 0 }}
                        >
                          <FaJava className="text-orange-600 w-6 h-6" />
                          <span className="truncate max-w-[100px] text-xs text-center font-medium text-black dark:text-white">
                            {fileName}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveFile(fileName, state.generatedFiles[fileName]);
                            }}
                            disabled={isSaving === fileName}
                            className={`absolute top-1 right-1 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50
                              ${state.selectedFile === fileName ? 'text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'}`
                            }
                            title={`Save ${fileName}`}
                          >
                            {isSaving === fileName ? (
                              <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <FolderOpenIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Divider between POJO and Util classes */}
                {pojoFiles.length > 0 && utilFiles.length > 0 && (
                  <div className="flex items-center my-4">
                    <hr className="flex-1 border-gray-300 dark:border-gray-600" />
                    <span className="px-3 text-xs text-gray-500 dark:text-gray-400">UTILITY CLASSES</span>
                    <hr className="flex-1 border-gray-300 dark:border-gray-600" />
                  </div>
                )}
                
                {/* Util Classes Section */}
                {utilFiles.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Util Classes ({utilFiles.length})</h3>
                      <button
                        onClick={() => handleSaveFilesByType('util')}
                        disabled={isSavingAll || utilFiles.length === 0}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Save all Util classes to a directory"
                      >
                        {isSavingAll ? (
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                        )}
                        Save Utils
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {utilFiles.map(fileName => (
                        <div
                          key={fileName}
                          className={`relative flex flex-col items-center gap-2 p-3 rounded cursor-pointer transition-colors ${state.selectedFile === fileName ? 'bg-green-100 dark:bg-green-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                          onClick={() => setState({ selectedFile: fileName })}
                          onMouseEnter={() => setHoveredFile(fileName)}
                          onMouseLeave={() => setHoveredFile(null)}
                          title={fileName}
                          style={{ minWidth: 0 }}
                        >
                          <FaJava className="text-green-600 w-6 h-6" />
                          <span className="truncate max-w-[100px] text-xs text-center font-medium text-black dark:text-white">
                            {fileName}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveFile(fileName, state.generatedFiles[fileName]);
                            }}
                            disabled={isSaving === fileName}
                            className={`absolute top-1 right-1 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50
                              ${state.selectedFile === fileName ? 'text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700' : 'text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'}`
                            }
                            title={`Save ${fileName}`}
                          >
                            {isSaving === fileName ? (
                              <svg className="animate-spin h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <FolderOpenIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default POJOCreator; 