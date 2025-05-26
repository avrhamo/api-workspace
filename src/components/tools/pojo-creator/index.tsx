import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '../../common/editor/MonacoEditor';
import { DocumentArrowDownIcon, ChevronDownIcon, ChevronRightIcon, CloudArrowDownIcon, FolderOpenIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
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
  const [showBsonTooltip, setShowBsonTooltip] = useState(false);

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
    <div className="min-h-0 h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POJO Creator</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Generate Java classes from JSON with advanced features</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownloadAsZip}
                disabled={fileList.length === 0}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CloudArrowDownIcon className="w-4 h-4 mr-2" />
                Download ZIP
              </button>
              <button
                onClick={() => handleSaveFilesByType('pojo')}
                disabled={isSavingAll || fileList.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSavingAll ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                )}
                Save POJOs
              </button>
              <button
                onClick={() => handleSaveFilesByType('util')}
                disabled={isSavingAll || fileList.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSavingAll ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                )}
                Save Utils
              </button>
            </div>
          </div>
        </div>

        {/* Basic Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                value={state.packageName}
                onChange={(e) => setState({ packageName: e.target.value })}
                placeholder="com.example"
              />
            </div>
          </div>
        </div>

        {/* JSON Input Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">JSON Input</h2>
          <div className="h-80 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
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
              height="320px"
            />
          </div>
        </div>

        {/* Advanced Options Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setInputCollapsed(!inputCollapsed)}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Options</h2>
              <div className="transition-transform duration-300 ease-in-out">
                {inputCollapsed ? <ChevronRightIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
              </div>
            </button>
          </div>
          
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${inputCollapsed ? 'max-h-0' : 'max-h-96'}`}>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(state.options).map((optionKey) => (
                  <div key={optionKey} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {optionKey === 'useLombok' ? 'Use Lombok' : 
                           optionKey === 'useJackson' ? 'Jackson Annotations' :
                           optionKey === 'useValidation' ? 'Validation Annotations' :
                           optionKey === 'useBuilder' ? 'Builder Pattern' :
                           optionKey === 'generateDummyUtils' ? 'Generate Dummy Utils' : 
                           optionKey === 'usePrimitiveTypes' ? 'Primitive Types' :
                           optionKey === 'parseBsonTypes' ? 'Parse BSON Types' : optionKey}
                        </span>
                        {optionKey === 'parseBsonTypes' && (
                          <div className="relative ml-2">
                            <button
                              onMouseEnter={() => setShowBsonTooltip(true)}
                              onMouseLeave={() => setShowBsonTooltip(false)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              aria-label="BSON types information"
                            >
                              <QuestionMarkCircleIcon className="w-4 h-4" />
                            </button>
                            {showBsonTooltip && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 p-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg z-50">
                                <div className="space-y-2">
                                  <p className="font-semibold">MongoDB BSON Types:</p>
                                  <div className="space-y-1">
                                    <p><span className="font-mono bg-gray-800 dark:bg-gray-200 px-1 rounded">{"$oid"}</span> → ObjectId</p>
                                    <p><span className="font-mono bg-gray-800 dark:bg-gray-200 px-1 rounded">{"$date"}</span> → LocalDateTime</p>
                                    <p><span className="font-mono bg-gray-800 dark:bg-gray-200 px-1 rounded">{"$numberLong"}</span> → Long</p>
                                  </div>
                                  <div className="pt-2 border-t border-gray-700 dark:border-gray-300">
                                    <p className="font-semibold">Get BSON from MongoDB:</p>
                                    <div className="space-y-1 mt-1">
                                      <p className="font-mono bg-gray-800 dark:bg-gray-200 px-1 rounded">
                                        db.collection.findOne()
                                      </p>
                                      <p className="font-mono bg-gray-800 dark:bg-gray-200 px-1 rounded">
                                        db.collection.find().toArray()
                                      </p>
                                      <p className="font-mono bg-gray-800 dark:bg-gray-200 px-1 rounded">
                                        mongoexport --jsonFormat=canonical
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {optionKey === 'useLombok' ? '@Data, @Builder annotations' : 
                         optionKey === 'useJackson' ? '@JsonProperty annotations' :
                         optionKey === 'useValidation' ? '@NotNull, @NotBlank' :
                         optionKey === 'useBuilder' ? 'Builder pattern support' :
                         optionKey === 'generateDummyUtils' ? 'Utility classes with test data' : 
                         optionKey === 'usePrimitiveTypes' ? 'int, boolean vs Integer, Boolean' :
                         optionKey === 'parseBsonTypes' ? 'MongoDB BSON type support' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Toggle ${optionKey === 'useLombok' ? 'Lombok' : 
                        optionKey === 'useJackson' ? 'Jackson Annotations' :
                        optionKey === 'useValidation' ? 'Validation Annotations' :
                        optionKey === 'useBuilder' ? 'Builder Pattern' :
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
          </div>
        </div>

        {/* Generated Files Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Explorer */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generated Files</h2>
            
            <div className="space-y-4">
              {(() => {
                const pojoFiles = fileList.filter(fileName => !fileName.includes('Util.java'));
                const utilFiles = fileList.filter(fileName => fileName.includes('Util.java'));
                
                return (
                  <>
                    {/* POJO Classes */}
                    {pojoFiles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          POJO Classes ({pojoFiles.length})
                        </h4>
                        <div className="space-y-2">
                          {pojoFiles.map(fileName => (
                            <div
                              key={fileName}
                              className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 cursor-pointer ${
                                state.selectedFile === fileName 
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent'
                              }`}
                              onClick={() => setState({ selectedFile: fileName })}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setState({ selectedFile: fileName });
                                }
                              }}
                            >
                              <FaJava className="text-orange-600 w-5 h-5 mr-3 flex-shrink-0" />
                              <span className="text-sm font-medium truncate flex-1">{fileName}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveFile(fileName, state.generatedFiles[fileName]);
                                }}
                                disabled={isSaving === fileName}
                                aria-label={`Save ${fileName}`}
                                className="ml-2 p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 flex-shrink-0 transition-colors"
                              >
                                <FolderOpenIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Util Classes */}
                    {utilFiles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Util Classes ({utilFiles.length})
                        </h4>
                        <div className="space-y-2">
                          {utilFiles.map(fileName => (
                            <div
                              key={fileName}
                              className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 cursor-pointer ${
                                state.selectedFile === fileName 
                                  ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 text-green-900 dark:text-green-100' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent'
                              }`}
                              onClick={() => setState({ selectedFile: fileName })}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setState({ selectedFile: fileName });
                                }
                              }}
                            >
                              <FaJava className="text-green-600 w-5 h-5 mr-3 flex-shrink-0" />
                              <span className="text-sm font-medium truncate flex-1">{fileName}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveFile(fileName, state.generatedFiles[fileName]);
                                }}
                                disabled={isSaving === fileName}
                                aria-label={`Save ${fileName}`}
                                className="ml-2 p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-800 flex-shrink-0 transition-colors"
                              >
                                <FolderOpenIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {fileList.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <FaJava className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No files generated yet.<br />
                          Add JSON input to get started.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Code Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Code Preview
              {state.selectedFile && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  {state.selectedFile}
                </span>
              )}
            </h2>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden" style={{ height: '512px' }}>
              <MonacoEditor
                key={`code-preview-${theme}`}
                value={selectedCode}
                language="java"
                readOnly
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                onMount={(editor, monaco) => {
                  monacoRef.current = { editor, monaco };
                  // Force layout calculation
                  setTimeout(() => {
                    editor.layout();
                  }, 100);
                }}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {(saveMessage || saveAllMessage || state.error) && (
          <div className="space-y-3">
            {saveMessage && (
              <div className={`p-4 rounded-lg border ${saveMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'}`}>
                {saveMessage.text}
              </div>
            )}
            
            {saveAllMessage && (
              <div className={`p-4 rounded-lg border ${saveAllMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-200' : saveAllMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200' : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200'}`}>
                {saveAllMessage.text}
              </div>
            )}

            {state.error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-200">{state.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default POJOCreator; 