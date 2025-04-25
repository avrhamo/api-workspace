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
  findOne: async (database: string, collection: string) => {
    const response = await fetch('http://localhost:3001/api/mongodb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'findOne',
        database,
        collection,
        connectionString: 'mongodb://localhost:27017' // You might want to store this somewhere else
      })
    });
    return response.json();
  }
}) 