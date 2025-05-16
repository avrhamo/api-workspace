export interface ElectronAPI {
  connectToMongoDB: (connectionString: string) => Promise<{ success: boolean; error?: string }>;
  createCursor: (dbName: string, collectionName: string) => Promise<{ success: boolean; cursorId: string; totalCount: number; error?: string }>;
  closeCursor: (cursorId: string) => Promise<{ success: boolean; error?: string }>;
  listDatabases: () => Promise<{ success: boolean; databases?: any[]; error?: string }>;
  listCollections: (dbName: string) => Promise<{ success: boolean; collections?: any[]; error?: string }>;
  executeTest: (config: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;
  findOne: (database: string, collection: string, query?: any) => Promise<{ success: boolean; document?: any; error?: string }>;
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

  // Kafka API
  connectToKafka: (config: { brokers: string[]; clientId: string }) => 
    Promise<{ success: boolean; error?: string }>;
  listKafkaTopics: () => 
    Promise<{ success: boolean; topics?: string[]; error?: string }>;
  createKafkaTopic: (config: { topic: string; partitions?: number; replicationFactor?: number }) => 
    Promise<{ success: boolean; error?: string }>;
  produceKafkaMessage: (config: { topic: string; messages: any[]; acks?: number }) => 
    Promise<{ 
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
  stopKafkaConsumer: (consumerId: string) => 
    Promise<{ success: boolean; error?: string }>;
  disconnectFromKafka: () => 
    Promise<{ success: boolean; error?: string }>;

  // File operations
  readFile: (filePath: string) => Promise<{ success: boolean; content?: number[]; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  saveFile: (data: { content: string; path: string; fileName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
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