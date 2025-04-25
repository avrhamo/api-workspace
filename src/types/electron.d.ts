export interface ElectronAPI {
  connectToMongoDB: (connectionString: string) => Promise<{ success: boolean; error?: string }>;
  createCursor: (dbName: string, collectionName: string) => Promise<{ success: boolean; cursorId: string; totalCount: number; error?: string }>;
  closeCursor: (cursorId: string) => Promise<{ success: boolean; error?: string }>;
  listDatabases: () => Promise<{ success: boolean; databases?: any[]; error?: string }>;
  listCollections: (dbName: string) => Promise<{ success: boolean; collections?: any[]; error?: string }>;
  executeTest: (config: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;
  findOne: (database: string, collection: string) => Promise<{ success: boolean; document?: any; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 