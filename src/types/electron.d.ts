export interface ElectronAPI {
  connectToMongoDB: (connectionString: string) => Promise<{ success: boolean; error?: string }>;
  createCursor: (dbName: string, collectionName: string) => Promise<{ success: boolean; cursorId: string; totalCount: number; error?: string }>;
  closeCursor: (cursorId: string) => Promise<{ success: boolean; error?: string }>;
  listDatabases: () => Promise<{ success: boolean; databases?: any[]; error?: string }>;
  listCollections: (dbName: string) => Promise<{ success: boolean; collections?: any[]; error?: string }>;
  executeTest: (config: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;
  findOne: (database: string, collection: string) => Promise<{ success: boolean; document?: any; error?: string }>;
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
    };
  }) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 