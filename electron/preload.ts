import { contextBridge, ipcRenderer } from 'electron';

// Add debugging
console.log('Preload script is running');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    // MongoDB Connection
    connectToMongoDB: (connectionString: string) => 
      ipcRenderer.invoke('mongodb:connect', connectionString),
    
    // Database Operations
    listDatabases: () => 
      ipcRenderer.invoke('mongodb:listDatabases'),
    listCollections: (dbName: string) => 
      ipcRenderer.invoke('mongodb:listCollections', dbName),
    
    // Cursor Operations
    createMongoCursor: (dbName: string, collectionName: string, query = {}) =>
      ipcRenderer.invoke('mongodb:createCursor', dbName, collectionName, query),
    getNextBatch: (cursorId: string, batchSize: number) =>
      ipcRenderer.invoke('mongodb:getNextBatch', cursorId, batchSize),
    closeCursor: (cursorId: string) =>
      ipcRenderer.invoke('mongodb:closeCursor', cursorId),
    
    // Test Execution
    executeTest: (config: any) =>
      ipcRenderer.invoke('mongodb:executeTest', config),

    // API Request Execution
    executeRequest: (config: any) =>
      ipcRenderer.invoke('api:executeRequest', config),
    
    // System operations
    isDarkMode: () => 
      ipcRenderer.invoke('dark-mode:get'),
    toggleDarkMode: () => 
      ipcRenderer.invoke('dark-mode:toggle'),
    
    // File operations
    readFile: (filePath: string) => 
      ipcRenderer.invoke('file:read', filePath),
    writeFile: (filePath: string, content: string) => 
      ipcRenderer.invoke('file:write', filePath, content),

    // New method
    findOne: (database: string, collection: string) => {
      console.log('findOne called with:', { database, collection });
      return ipcRenderer.invoke('mongodb:findOne', database, collection);
    }
  }
);

// Add debugging
console.log('Preload script finished');
