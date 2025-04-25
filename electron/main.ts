import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { MongoClient, Db, Collection } from 'mongodb';

let mainWindow: BrowserWindow | null = null;
let mongoClient: MongoClient | null = null;
const activeCursors = new Map();

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });
  // Set up error handling
  mainWindow.webContents.on('render-process-gone', () => {
    console.error('Renderer process crashed');
  });

  if (isDev) {
    // In development, use the Vite dev server
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// MongoDB IPC Handlers
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred' };
  }
});

ipcMain.handle('mongodb:listCollections', async (_, dbName: string) => {
  try {
    if (!mongoClient) throw new Error('Not connected to MongoDB');
    const db = mongoClient.db(dbName);
    const collections = await db.listCollections().toArray();
    return { success: true, collections };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred' };
  }
});

// Cursor Management
ipcMain.handle('mongodb:createCursor', async (_, dbName: string, collectionName: string, query = {}) => {
  try {
    if (!mongoClient) throw new Error('Not connected to MongoDB');
    
    const db: Db = mongoClient.db(dbName);
    const collection: Collection = db.collection(collectionName);
    const cursor = collection.find(query);
    
    // Generate a unique cursor ID
    const cursorId = Date.now().toString();
    activeCursors.set(cursorId, cursor);
    
    return { 
      success: true, 
      cursorId,
      totalCount: await cursor.count()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mongodb:getNextBatch', async (_, cursorId: string, batchSize: number) => {
  try {
    const cursor = activeCursors.get(cursorId);
    if (!cursor) throw new Error('Cursor not found');
    
    const documents = await cursor.next(batchSize);
    return { 
      success: true, 
      documents,
      hasMore: await cursor.hasNext()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mongodb:closeCursor', async (_, cursorId: string) => {
  try {
    const cursor = activeCursors.get(cursorId);
    if (cursor) {
      await cursor.close();
      activeCursors.delete(cursorId);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App lifecycle handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('quit', async () => {
  for (const [_, cursor] of activeCursors) {
    await cursor.close();
  }
  activeCursors.clear();
  
  if (mongoClient) {
    await mongoClient.close();
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
