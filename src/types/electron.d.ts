export interface ElectronAPI {
  // MongoDB Connection
  connectToMongoDB: (connectionString: string) => Promise<{ success: boolean; error?: string }>;
  listDatabases: () => Promise<{ success: boolean; databases?: any[]; error?: string }>;
  listCollections: (dbName: string) => Promise<{ success: boolean; collections?: any[]; error?: string }>;
  createMongoCursor: (dbName: string, collectionName: string, query?: any) => Promise<{ success: boolean; cursorId: string; totalCount: number; error?: string }>;
  getNextBatch: (cursorId: string, batchSize: number) => Promise<{ success: boolean; documents?: any[]; hasMore: boolean; error?: string }>;
  closeCursor: (cursorId: string) => Promise<{ success: boolean; error?: string }>;
  executeTest: (config: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;
  findOne: (database: string, collection: string, query?: any) => Promise<{ success: boolean; document?: any; error?: string }>;

  // API Request Execution
  executeRequest: (request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    data: any;
    mappedFields: Record<string, string>;
    connectionConfig: {
      connectionString: string;
      database?: string;
      collection?: string;
      query?: string;
    };
  }) => Promise<{
    success: boolean;
    error?: string;
  }>;

  // System operations
  isDarkMode: () => Promise<boolean>;
  toggleDarkMode: () => Promise<void>;

  // File operations
  readFile: (filePath: string) => Promise<{ success: boolean; content?: number[]; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  saveFile: (data: { content: string; path: string; fileName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;

  // Helm Secrets
  listGpgKeys: () => Promise<{ success: boolean; keys?: any[]; error?: string }>;
  helmSecretsEncrypt: (content: string, keyId: string, sopsConfigPath?: string) => Promise<{ success: boolean; encrypted?: string; error?: string }>;
  helmSecretsDecrypt: (content: string, sopsConfigPath?: string) => Promise<{ success: boolean; decrypted?: string; error?: string }>;

  // Encryption API
  generateEncryptionKey: () => Promise<{ success: boolean; key?: string; error?: string }>;
  encryptSecret: (content: string) => Promise<{ success: boolean; encrypted?: string; error?: string }>;
  decryptSecret: (content: string) => Promise<{ success: boolean; decrypted?: string; error?: string }>;

  // Keytab API
  processKeytab: (content: ArrayBuffer) => Promise<{ success: boolean; entries?: any[]; error?: string }>;
  processCreateKeytab: (data: { principal: string; password: string; encryptionType: string; kvno: number }) => Promise<{ success: boolean; keytab?: ArrayBuffer; error?: string }>;

  // Kafka API
  connectToKafka: (config: KafkaConnectionConfig) => Promise<{ success: boolean; error?: string }>;
  listKafkaTopics: () => Promise<{ success: boolean; topics?: string[]; error?: string }>;
  createKafkaTopic: (config: { topic: string; partitions?: number; replicationFactor?: number }) => Promise<{ success: boolean; error?: string }>;
  produceKafkaMessage: (config: { topic: string; messages: any[]; acks?: number }) => Promise<{ 
    success: boolean; 
    result?: {
      topicName: string;
      partition: number;
      baseOffset: string;
      logAppendTime: string;
    };
    error?: string;
  }>;
  consumeKafkaMessages: (config: { 
    topic: string; 
    groupId: string; 
    fromBeginning?: boolean;
    autoCommit?: boolean;
    maxMessages?: number;
  }) => Promise<{
    success: boolean;
    consumerId?: string;
    messages?: Array<{
      topic: string;
      partition: number;
      offset: string;
      key?: string;
      value?: string;
      headers?: Record<string, string>;
      timestamp: string;
    }>;
    error?: string;
  }>;
  stopKafkaConsumer: (consumerId: string) => Promise<{ success: boolean; error?: string }>;
  disconnectFromKafka: () => Promise<{ success: boolean; error?: string }>;

  // Port Killer API
  killPort: (port: number) => Promise<{ success: boolean; message?: string; error?: string; pids?: number[] }>;
}

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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 