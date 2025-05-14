"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // MongoDB Connection
    connectToMongoDB: (connectionString) => electron_1.ipcRenderer.invoke('mongodb:connect', connectionString),
    // Database Operations
    listDatabases: () => electron_1.ipcRenderer.invoke('mongodb:listDatabases'),
    listCollections: (dbName) => electron_1.ipcRenderer.invoke('mongodb:listCollections', dbName),
    // Cursor Operations
    createMongoCursor: (dbName, collectionName, query = {}) => electron_1.ipcRenderer.invoke('mongodb:createCursor', dbName, collectionName, query),
    getNextBatch: (cursorId, batchSize) => electron_1.ipcRenderer.invoke('mongodb:getNextBatch', cursorId, batchSize),
    closeCursor: (cursorId) => electron_1.ipcRenderer.invoke('mongodb:closeCursor', cursorId),
    // Test Execution
    executeTest: (config) => electron_1.ipcRenderer.invoke('mongodb:executeTest', config),
    // API Request Execution
    executeRequest: (config) => electron_1.ipcRenderer.invoke('api:executeRequest', config),
    // System operations
    isDarkMode: () => electron_1.ipcRenderer.invoke('dark-mode:get'),
    toggleDarkMode: () => electron_1.ipcRenderer.invoke('dark-mode:toggle'),
    // File operations
    readFile: (filePath) => electron_1.ipcRenderer.invoke('file:read', filePath),
    writeFile: (filePath, content) => electron_1.ipcRenderer.invoke('file:write', filePath, content),
    // New method
    findOne: (database, collection) => {
        return electron_1.ipcRenderer.invoke('mongodb:findOne', database, collection);
    },
    // Helm Secrets
    listGpgKeys: () => electron_1.ipcRenderer.invoke('listGpgKeys'),
    helmSecretsEncrypt: (content, keyId, sopsConfigPath) => electron_1.ipcRenderer.invoke('helmSecretsEncrypt', content, keyId, sopsConfigPath),
    helmSecretsDecrypt: (content, sopsConfigPath) => electron_1.ipcRenderer.invoke('helmSecretsDecrypt', content, sopsConfigPath),
    // Encryption API
    generateEncryptionKey: () => electron_1.ipcRenderer.invoke('generateEncryptionKey'),
    encryptSecret: (content) => electron_1.ipcRenderer.invoke('encryptSecret', content),
    decryptSecret: (content) => electron_1.ipcRenderer.invoke('decryptSecret', content),
    // Keytab API
    processKeytab: (content) => electron_1.ipcRenderer.invoke('keytab:process', content),
    processCreateKeytab: (data) => electron_1.ipcRenderer.invoke('keytab:create', data),
});
//# sourceMappingURL=preload.js.map