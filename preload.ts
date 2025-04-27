import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  connectToMongoDB: (connectionString: string) => 
    ipcRenderer.invoke('mongodb:connect', connectionString),
  listDatabases: () => 
    ipcRenderer.invoke('mongodb:listDatabases'),
  listCollections: (dbName: string) => 
    ipcRenderer.invoke('mongodb:listCollections', dbName),
  executeTest: (config: any) => 
    ipcRenderer.invoke('mongodb:executeTest', config),
  findOne: (database: string, collection: string) => 
    ipcRenderer.invoke('mongodb:findOne', database, collection)
}) 