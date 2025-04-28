"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const mongodb_1 = require("mongodb");
const node_fetch_1 = __importDefault(require("node-fetch"));
let mainWindow = null;
let mongoClient = null;
const activeCursors = new Map();
const isDev = process.env.NODE_ENV === 'development';
async function createWindow() {
    // Log the preload script path
    const preloadPath = path.join(__dirname, 'preload.js');
    console.log('Preload script path:', preloadPath);
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath
        },
    });
    // Add debugging for preload script loading
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window loaded successfully');
    });
    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
        console.error('Preload script error:', error);
    });
    // Set up error handling
    mainWindow.webContents.on('render-process-gone', () => {
        console.error('Renderer process crashed');
    });
    if (isDev) {
        // In development, use the Vite dev server
        await mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production, load the built files
        await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}
// MongoDB IPC Handlers
electron_1.ipcMain.handle('mongodb:connect', async (_, connectionString) => {
    try {
        mongoClient = new mongodb_1.MongoClient(connectionString);
        await mongoClient.connect();
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('mongodb:findOne', async (_, database, collection) => {
    try {
        if (!mongoClient)
            throw new Error('Not connected to MongoDB');
        const db = mongoClient.db(database);
        const col = db.collection(collection);
        const document = await col.findOne({});
        return { success: true, document };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
});
electron_1.ipcMain.handle('mongodb:listDatabases', async () => {
    try {
        if (!mongoClient)
            throw new Error('Not connected to MongoDB');
        const admin = mongoClient.db().admin();
        const result = await admin.listDatabases();
        return { success: true, databases: result.databases };
    }
    catch (error) {
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred' };
    }
});
electron_1.ipcMain.handle('mongodb:listCollections', async (_, dbName) => {
    try {
        if (!mongoClient)
            throw new Error('Not connected to MongoDB');
        const db = mongoClient.db(dbName);
        const collections = await db.listCollections().toArray();
        return { success: true, collections };
    }
    catch (error) {
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred' };
    }
});
// Cursor Management
electron_1.ipcMain.handle('mongodb:createCursor', async (_, dbName, collectionName, query = {}) => {
    try {
        if (!mongoClient)
            throw new Error('Not connected to MongoDB');
        const db = mongoClient.db(dbName);
        const collection = db.collection(collectionName);
        const cursor = collection.find(query);
        // Generate a unique cursor ID
        const cursorId = Date.now().toString();
        activeCursors.set(cursorId, cursor);
        return {
            success: true,
            cursorId,
            totalCount: await cursor.count()
        };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('mongodb:getNextBatch', async (_, cursorId, batchSize) => {
    try {
        const cursor = activeCursors.get(cursorId);
        if (!cursor)
            throw new Error('Cursor not found');
        const documents = await cursor.next(batchSize);
        return {
            success: true,
            documents,
            hasMore: await cursor.hasNext()
        };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('mongodb:closeCursor', async (_, cursorId) => {
    try {
        const cursor = activeCursors.get(cursorId);
        if (cursor) {
            await cursor.close();
            activeCursors.delete(cursorId);
        }
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// API Request Execution Handler
electron_1.ipcMain.handle('api:executeRequest', async (_, config) => {
    const { method = 'GET', url, headers = {}, data, mappedFields, connectionConfig } = config;
    const startTime = Date.now();
    try {
        const fetchOptions = {
            method,
            headers,
        };
        if (data) {
            fetchOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
            if (!headers['Content-Type']) {
                fetchOptions.headers['Content-Type'] = 'application/json';
            }
        }
        const response = await (0, node_fetch_1.default)(url, fetchOptions);
        const responseBody = await response.text();
        const duration = Date.now() - startTime;
        return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            body: responseBody,
            duration,
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration,
        };
    }
});
// App lifecycle handlers
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
electron_1.app.on('quit', async () => {
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
//# sourceMappingURL=main.js.map