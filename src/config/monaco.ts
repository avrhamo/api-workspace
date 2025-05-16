import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Initialize Monaco environment
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  }
};

// Set TypeScript defaults
monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

// Keep track of all editor instances
let editorInstances: monaco.editor.IStandaloneCodeEditor[] = [];

// Function to register a new editor instance
export const registerEditor = (editor: monaco.editor.IStandaloneCodeEditor) => {
  editorInstances.push(editor);

};

// Function to unregister an editor instance
export const unregisterEditor = (editor: monaco.editor.IStandaloneCodeEditor) => {
  editorInstances = editorInstances.filter(e => e.getId() !== editor.getId());

};

// Function to update Monaco's global theme
export const updateMonacoTheme = (theme: 'dark' | 'light') => {
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';
  
  // Set the global theme
  monaco.editor.setTheme(monacoTheme);

  // Update all registered editors
  editorInstances.forEach((editor, index) => {
    
    try {
      // Get the editor's DOM element
      const domElement = editor.getContainerDomNode();
      if (domElement) {
        // Force a DOM update by toggling classes
        domElement.classList.remove('vs-dark', 'vs-light');
        domElement.classList.add(monacoTheme);
      }

      // Force a complete editor refresh
      editor.updateOptions({
        // Force a refresh by toggling a setting
        renderWhitespace: editor.getOption(monaco.editor.EditorOption.renderWhitespace) === 'none' ? 'all' : 'none'
      });
      
      // Force a layout update
      editor.layout();
      
      // Update the model if it exists
      const model = editor.getModel();
      if (model) {
        // Force a model refresh by updating its options
        model.setValue(model.getValue());
      }

      // Force a repaint
      editor.render();
      
      console.log(`Editor ${index} update complete`);
    } catch (error) {
      console.error(`Error updating editor ${index}:`, error);
    }
  });
  console.groupEnd();
};

// Function to initialize Monaco with the current theme
export const initializeMonaco = () => {
  // Get the current theme from localStorage or system preference
  const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const currentTheme = savedTheme || systemTheme;
  
  // Set the initial theme
  updateMonacoTheme(currentTheme);
};

export { monaco }; 