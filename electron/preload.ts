import { contextBridge, ipcRenderer } from 'electron';

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
    saveFile: (data: { content: string; path: string; fileName: string }) =>
      ipcRenderer.invoke('saveFile', data),

    // New method
    findOne: (database: string, collection: string, query?: any) => {
      return ipcRenderer.invoke('mongodb:findOne', database, collection, query);
    },

    // Helm Secrets
    listGpgKeys: () => ipcRenderer.invoke('listGpgKeys'),
    helmSecretsEncrypt: (content: string, keyId: string, sopsConfigPath?: string) => 
      ipcRenderer.invoke('helmSecretsEncrypt', content, keyId, sopsConfigPath),
    helmSecretsDecrypt: (content: string, sopsConfigPath?: string) => 
      ipcRenderer.invoke('helmSecretsDecrypt', content, sopsConfigPath),

    // Encryption API
    generateEncryptionKey: () => ipcRenderer.invoke('generateEncryptionKey'),
    encryptSecret: (content: string) => ipcRenderer.invoke('encryptSecret', content),
    decryptSecret: (content: string) => ipcRenderer.invoke('decryptSecret', content),

    // Keytab API
    processKeytab: (content: ArrayBuffer) => ipcRenderer.invoke('keytab:process', content),
    processCreateKeytab: (data: { principal: string; password: string; encryptionType: string; kvno: number }) =>
      ipcRenderer.invoke('keytab:create', data),

    // Kafka API
    connectToKafka: (config: { brokers: string[]; clientId: string }) => 
      ipcRenderer.invoke('kafka:connect', config),
    listKafkaTopics: () => 
      ipcRenderer.invoke('kafka:listTopics'),
    createKafkaTopic: (config: { topic: string; partitions?: number; replicationFactor?: number }) => 
      ipcRenderer.invoke('kafka:createTopic', config),
    produceKafkaMessage: (config: { topic: string; messages: any[]; acks?: number }) => 
      ipcRenderer.invoke('kafka:produce', config),
    consumeKafkaMessages: (config: { 
      topic: string; 
      groupId: string; 
      fromBeginning?: boolean;
      autoCommit?: boolean;
      maxMessages?: number;
    }) => 
      ipcRenderer.invoke('kafka:consume', config),
    stopKafkaConsumer: (consumerId: string) => 
      ipcRenderer.invoke('kafka:stopConsumer', consumerId),
    disconnectFromKafka: () => 
      ipcRenderer.invoke('kafka:disconnect'),

    // Port Killer API
    killPort: (port: number) => 
      ipcRenderer.invoke('port:kill', port),
  }
);

interface KafkaConnectionConfig {
  brokers: string[];
  clientId: string;
  securityProtocol?: 'PLAINTEXT' | 'SSL' | 'SASL_PLAINTEXT' | 'SASL_SSL';
  saslMechanism?: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512' | 'GSSAPI';
  ssl?: {
    caLocation?: string;
    certLocation?: string;
    keyLocation?: string;
    keyPassword?: string;
  };
  kerberos?: {
    keytabLocation?: string;
    krb5ConfigLocation?: string;
    serviceName?: string;
    principal?: string;
  };
  sasl?: {
    username?: string;
    password?: string;
  };
}
