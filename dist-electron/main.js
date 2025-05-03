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
const mongodb_1 = require("mongodb");
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
let mainWindow = null;
let mongoClient = null;
const activeCursors = new Map();
const isDev = process.env.NODE_ENV === 'development';
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Encryption key management
let encryptionKey = null;
// Load or generate encryption key
async function loadEncryptionKey() {
    try {
        const keyPath = path.join(electron_1.app.getPath('userData'), 'encryption.key');
        if (fs.existsSync(keyPath)) {
            encryptionKey = await fs.promises.readFile(keyPath);
        }
        else {
            // Generate new key if none exists
            encryptionKey = crypto_1.default.randomBytes(32); // 256 bits
            await fs.promises.writeFile(keyPath, encryptionKey);
        }
    }
    catch (error) {
        console.error('Failed to load/generate encryption key:', error);
        throw error;
    }
}
async function createWindow() {
    // Log the preload script path
    const preloadPath = path.join(__dirname, 'preload.js');
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
    });
    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    });
    // Set up error handling
    mainWindow.webContents.on('render-process-gone', () => {
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
    const startTime = Date.now();
    try {
        const { method = 'GET', url, headers = {}, data, mappedFields, connectionConfig } = config;
        // First, fetch a document from MongoDB to get the values
        let mongoValues = {};
        if (Object.keys(mappedFields).length > 0 && connectionConfig.database && connectionConfig.collection) {
            const client = await getMongoClient(connectionConfig.connectionString);
            const db = client.db(connectionConfig.database);
            const collection = db.collection(connectionConfig.collection);
            // Get total count of documents
            const totalCount = await collection.countDocuments();
            // Create a cursor with a query to get a random document
            const randomSkip = Math.floor(Math.random() * totalCount);
            const cursor = collection.find({}).limit(1).skip(randomSkip);
            const doc = await cursor.next();
            if (doc) {
                // Create a map of curl fields to their MongoDB values
                mongoValues = Object.entries(mappedFields).reduce((acc, [curlField, fieldConfig]) => {
                    // Handle special values first
                    if (fieldConfig === 'specialValue') {
                        acc[curlField] = crypto_1.default.randomUUID();
                        return acc;
                    }
                    // Handle MongoDB field paths
                    let value = doc;
                    if (typeof fieldConfig === 'string') {
                        for (const key of fieldConfig.split('.')) {
                            value = value?.[key];
                        }
                    }
                    acc[curlField] = value;
                    return acc;
                }, {});
            }
            // Close the cursor
            await cursor.close();
        }
        // Now populate the request with MongoDB values
        let populatedUrl = url;
        let populatedHeaders = { ...headers };
        let populatedData = data;
        // Replace URL parameters
        Object.entries(mongoValues).forEach(([field, value]) => {
            if (field.startsWith('url.')) {
                const paramName = field.split('.')[1];
                populatedUrl = populatedUrl.replace(`{${paramName}}`, value?.toString() || '');
            }
            else if (field.startsWith('query.')) {
                // Handle query parameters
                const urlObj = new URL(populatedUrl);
                const paramName = field.split('.')[1];
                urlObj.searchParams.set(paramName, value?.toString() || '');
                populatedUrl = urlObj.toString();
            }
        });
        // Replace header values
        Object.entries(mongoValues).forEach(([field, value]) => {
            if (field.startsWith('header.')) {
                const headerName = field.split('.')[1];
                populatedHeaders[headerName] = value?.toString() || '';
            }
        });
        // Replace body values
        if (data) {
            let initialData;
            // First parse or clone the initial data
            if (typeof data === 'string') {
                try {
                    initialData = JSON.parse(data);
                }
                catch (error) {
                    initialData = data;
                }
            }
            else if (typeof data === 'object' && data !== null) {
                initialData = JSON.parse(JSON.stringify(data)); // Deep clone
            }
            else {
                initialData = data;
            }
            // Now apply all the mapped values
            populatedData = initialData;
            Object.entries(mongoValues).forEach(([field, value]) => {
                // Only process body fields (not url., query., or header. prefixed)
                if (!field.startsWith('url.') && !field.startsWith('query.') && !field.startsWith('header.')) {
                    // For body fields, check if it starts with body. prefix
                    const actualField = field.startsWith('body.') ? field.split('.').slice(1).join('.') : field;
                    // For direct fields (no dots), just set them directly
                    if (!actualField.includes('.')) {
                        populatedData[actualField] = value;
                    }
                    else {
                        // Handle nested fields
                        const fieldParts = actualField.split('.');
                        let current = populatedData;
                        // Navigate to the correct nesting level
                        for (let i = 0; i < fieldParts.length - 1; i++) {
                            const part = fieldParts[i];
                            if (!(part in current)) {
                                current[part] = {};
                            }
                            current = current[part];
                        }
                        // Set the value at the final level
                        const finalField = fieldParts[fieldParts.length - 1];
                        current[finalField] = value;
                    }
                }
            });
        }
        const fetchOptions = {
            method,
            headers: populatedHeaders,
        };
        // Only add body for non-GET requests or if we actually have data
        if (populatedData && method.toUpperCase() !== 'GET') {
            if (typeof populatedData === 'string') {
                fetchOptions.body = populatedData;
            }
            else {
                fetchOptions.body = JSON.stringify(populatedData);
            }
            if (!populatedHeaders['Content-Type']) {
                fetchOptions.headers['Content-Type'] = 'application/json';
            }
        }
        const response = await (0, node_fetch_1.default)(populatedUrl, fetchOptions);
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
// Helm Secrets IPC Handlers
electron_1.ipcMain.handle('listGpgKeys', async () => {
    try {
        const { stdout } = await execAsync('gpg --list-secret-keys --keyid-format LONG');
        const keys = stdout
            .split('\n')
            .filter(line => line.includes('sec'))
            .map(line => {
            const match = line.match(/sec\s+\w+\/(\w+)/);
            return match ? match[1] : null;
        })
            .filter(Boolean);
        return { success: true, keys };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list GPG keys'
        };
    }
});
electron_1.ipcMain.handle('helmSecretsEncrypt', async (_, content, _keyId, sopsConfigPath) => {
    try {
        // Create a temporary file with the content
        const tempFile = path.join(electron_1.app.getPath('temp'), `helm-secret-${Date.now()}.yaml`);
        await fs.promises.writeFile(tempFile, content);
        // Prepare environment
        const env = { ...process.env };
        if (sopsConfigPath && sopsConfigPath.trim()) {
            env.SOPS_CONFIG = sopsConfigPath.trim();
        }
        // Run helm secrets encrypt (no --key flag)
        const { stdout } = await execAsync(`helm secrets encrypt ${tempFile}`, { env });
        // Clean up the temporary file
        await fs.promises.unlink(tempFile);
        return { success: true, encrypted: stdout };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to encrypt Helm secret'
        };
    }
});
electron_1.ipcMain.handle('helmSecretsDecrypt', async (_, content, sopsConfigPath) => {
    try {
        // Create a temporary file with the content
        const tempFile = path.join(electron_1.app.getPath('temp'), `helm-secret-${Date.now()}.yaml`);
        await fs.promises.writeFile(tempFile, content);
        // Prepare environment
        const env = { ...process.env };
        if (sopsConfigPath && sopsConfigPath.trim()) {
            env.SOPS_CONFIG = sopsConfigPath.trim();
        }
        // Run helm secrets decrypt
        const { stdout } = await execAsync(`helm secrets decrypt ${tempFile}`, { env });
        // Clean up the temporary file
        await fs.promises.unlink(tempFile);
        return { success: true, decrypted: stdout };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to decrypt Helm secret'
        };
    }
});
// Encryption IPC Handlers
electron_1.ipcMain.handle('generateEncryptionKey', async () => {
    try {
        encryptionKey = crypto_1.default.randomBytes(32);
        const keyPath = path.join(electron_1.app.getPath('userData'), 'encryption.key');
        await fs.promises.writeFile(keyPath, encryptionKey);
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate encryption key'
        };
    }
});
electron_1.ipcMain.handle('encryptSecret', async (_, content) => {
    try {
        if (!encryptionKey) {
            throw new Error('Encryption key not initialized');
        }
        // Generate a random IV
        const iv = crypto_1.default.randomBytes(16);
        // Create cipher
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', encryptionKey, iv);
        // Encrypt the content
        let encrypted = cipher.update(content, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        // Combine IV and encrypted content
        const result = {
            iv: iv.toString('base64'),
            content: encrypted
        };
        // Format as YAML
        const yamlOutput = `# This is an encrypted secret
# DO NOT EDIT THIS FILE MANUALLY
# Generated: ${new Date().toISOString()}

encrypted: |
  ${JSON.stringify(result)}
`;
        return { success: true, encrypted: yamlOutput };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to encrypt secret'
        };
    }
});
electron_1.ipcMain.handle('decryptSecret', async (_, content) => {
    try {
        if (!encryptionKey) {
            throw new Error('Encryption key not initialized');
        }
        // Parse the YAML content
        const lines = content.split('\n');
        const encryptedLine = lines.find(line => line.trim().startsWith('encrypted:'));
        if (!encryptedLine) {
            throw new Error('Invalid encrypted content format');
        }
        // Extract the encrypted data
        const encryptedData = JSON.parse(encryptedLine.split('|')[1].trim());
        // Create decipher
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', encryptionKey, Buffer.from(encryptedData.iv, 'base64'));
        // Decrypt the content
        let decrypted = decipher.update(encryptedData.content, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return { success: true, decrypted };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to decrypt secret'
        };
    }
});
// App lifecycle handlers
electron_1.app.whenReady().then(async () => {
    await loadEncryptionKey();
    createWindow();
});
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
// Helper function to get MongoDB client
async function getMongoClient(connectionString) {
    const client = new mongodb_1.MongoClient(connectionString);
    await client.connect();
    return client;
}
//# sourceMappingURL=main.js.map