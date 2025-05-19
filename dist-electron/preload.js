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
    executeRequests: (configs) => electron_1.ipcRenderer.invoke('api:executeRequests', configs),
    // System operations
    isDarkMode: () => electron_1.ipcRenderer.invoke('dark-mode:get'),
    toggleDarkMode: () => electron_1.ipcRenderer.invoke('dark-mode:toggle'),
    // File operations
    readFile: (filePath) => electron_1.ipcRenderer.invoke('file:read', filePath),
    writeFile: (filePath, content) => electron_1.ipcRenderer.invoke('file:write', filePath, content),
    saveFile: (data) => electron_1.ipcRenderer.invoke('saveFile', data),
    // New method
    findOne: (database, collection, query) => {
        return electron_1.ipcRenderer.invoke('mongodb:findOne', database, collection, query);
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
    // Kafka API
    connectToKafka: (config) => electron_1.ipcRenderer.invoke('kafka:connect', config),
    listKafkaTopics: () => electron_1.ipcRenderer.invoke('kafka:listTopics'),
    createKafkaTopic: (config) => electron_1.ipcRenderer.invoke('kafka:createTopic', config),
    produceKafkaMessage: (config) => electron_1.ipcRenderer.invoke('kafka:produce', config),
    consumeKafkaMessages: (config) => electron_1.ipcRenderer.invoke('kafka:consume', config),
    stopKafkaConsumer: (consumerId) => electron_1.ipcRenderer.invoke('kafka:stopConsumer', consumerId),
    disconnectFromKafka: () => electron_1.ipcRenderer.invoke('kafka:disconnect'),
    // Port Killer API
    killPort: (port) => electron_1.ipcRenderer.invoke('port:kill', port),
    // MongoDB operations
    mongodb: {
        initializeBatch: (config) => electron_1.ipcRenderer.invoke('mongodb:initializeBatch', config),
        getNextDocument: (batchId) => electron_1.ipcRenderer.invoke('mongodb:getNextDocument', batchId),
        closeBatch: (batchId) => electron_1.ipcRenderer.invoke('mongodb:closeBatch', batchId),
    },
});
//# sourceMappingURL=preload.js.map