import { app, BrowserWindow, ipcMain } from 'electron'
import { MongoClient } from 'mongodb'

let mongoClient: MongoClient | null = null;

// ... your existing main process code ...

ipcMain.handle('mongodb:connect', async (_, connectionString: string) => {
  try {
    mongoClient = new MongoClient(connectionString);
    await mongoClient.connect();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mongodb:listDatabases', async () => {
  try {
    if (!mongoClient) throw new Error('Not connected to MongoDB');
    const admin = mongoClient.db().admin();
    const result = await admin.listDatabases();
    return { success: true, databases: result.databases };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mongodb:listCollections', async (_, dbName: string) => {
  try {
    if (!mongoClient) throw new Error('Not connected to MongoDB');
    const db = mongoClient.db(dbName);
    const collections = await db.listCollections().toArray();
    return { success: true, collections };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mongodb:executeTest', async (_, config: any) => {
  try {
    if (!mongoClient) throw new Error('Not connected to MongoDB');
    // Implement your test execution logic here
    return { success: true, results: [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}); 