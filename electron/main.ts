import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { MongoClient, Db, Collection } from 'mongodb';
import { Kafka, Producer, Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import * as path from 'path';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let mongoClient: MongoClient | null = null;
let kafkaClient: Kafka | null = null;
let kafkaProducer: Producer | null = null;
let kafkaConsumer: Consumer | null = null;
const activeCursors = new Map();
const activeConsumers = new Map();

const isDev = process.env.NODE_ENV === 'development';

const execAsync = promisify(exec);

// Encryption key management
let encryptionKey: Buffer | null = null;

// Load or generate encryption key
async function loadEncryptionKey() {
  try {
    const keyPath = path.join(app.getPath('userData'), 'encryption.key');
    if (fs.existsSync(keyPath)) {
      encryptionKey = await fs.promises.readFile(keyPath);
    } else {
      // Generate new key if none exists
      encryptionKey = crypto.randomBytes(32); // 256 bits
      await fs.promises.writeFile(keyPath, encryptionKey);
    }
  } catch (error) {
    console.error('Failed to load/generate encryption key:', error);
    throw error;
  }
}

async function createWindow() {
  // Log the preload script path
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
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
  } else {
    // In production, load the built files
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Helper function to deeply convert ObjectId fields to strings
function convertObjectIds(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertObjectIds);
  } else if (obj && typeof obj === 'object') {
    // Handle native ObjectId
    if (obj._bsontype === 'ObjectID' && typeof obj.toString === 'function') {
      return obj.toString();
    }
    // Handle buffer-like ObjectId (from serialization)
    if (obj.buffer && Object.keys(obj.buffer).length === 12) {
      try {
        // Try to reconstruct ObjectId from buffer if needed
        const { ObjectId } = require('mongodb');
        return new ObjectId(Buffer.from(Object.values(obj.buffer))).toString();
      } catch {
        // Fallback: return as is
        return obj;
      }
    }
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertObjectIds(obj[key]);
    }
    return newObj;
  }
  return obj;
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

ipcMain.handle('mongodb:findOne', async (_, database: string, collection: string, query?: any) => {
  try {
    if (!mongoClient) throw new Error('Not connected to MongoDB');
    const db = mongoClient.db(database);
    const col = db.collection(collection);
    const document = await col.findOne(query || {});
    const cleanDoc = convertObjectIds(document);
    return { success: true, document: cleanDoc };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
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

// API Request Execution Handler
ipcMain.handle('api:executeRequest', async (_, config) => {
  const startTime = Date.now();
  try {
    const { method = 'GET', url, headers = {}, data, mappedFields, connectionConfig } = config;
    
    // First, fetch a document from MongoDB to get the values
    let mongoValues: Record<string, any> = {};
    if (Object.keys(mappedFields).length > 0 && connectionConfig.database && connectionConfig.collection) {
      const client = await getMongoClient(connectionConfig.connectionString);
      const db = client.db(connectionConfig.database);
      const collection = db.collection(connectionConfig.collection);
      
      // Parse the query if provided
      let query = {};
      if (connectionConfig.query) {
        try {
          query = JSON.parse(connectionConfig.query);
        } catch (e) {
          console.warn('Failed to parse query:', e);
        }
      }
      
      // Get total count of documents matching the query
      const totalCount = await collection.countDocuments(query);
      
      // Create a cursor with the query to get a random document
      const randomSkip = Math.floor(Math.random() * totalCount);
      const cursor = collection.find(query).limit(1).skip(randomSkip);
      const doc = await cursor.next();
      
      if (doc) {
        // Create a map of curl fields to their MongoDB values
        mongoValues = Object.entries(mappedFields).reduce((acc, [curlField, fieldConfig]) => {
          // Handle special values first
          if (fieldConfig === 'specialValue') {
            acc[curlField] = crypto.randomUUID();
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
        }, {} as Record<string, any>);
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
      } else if (field.startsWith('query.')) {
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
      let initialData: any;
      
      // First parse or clone the initial data
      if (typeof data === 'string') {
        try {
          initialData = JSON.parse(data);
        } catch (error) {
          initialData = data;
        }
      } else if (typeof data === 'object' && data !== null) {
        initialData = JSON.parse(JSON.stringify(data)); // Deep clone
      } else {
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
          } else {
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

    const fetchOptions: any = {
      method,
      headers: populatedHeaders,
    };

    // Only add body for non-GET requests or if we actually have data
    if (populatedData && method.toUpperCase() !== 'GET') {
      if (typeof populatedData === 'string') {
        fetchOptions.body = populatedData;
      } else {
        fetchOptions.body = JSON.stringify(populatedData);
      }
      
      if (!populatedHeaders['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(populatedUrl, fetchOptions);
    const responseBody = await response.text();
    const duration = Date.now() - startTime;

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
});

// Helm Secrets IPC Handlers
ipcMain.handle('listGpgKeys', async () => {
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
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to list GPG keys' 
    };
  }
});

ipcMain.handle('helmSecretsEncrypt', async (_, content: string, _keyId: string, sopsConfigPath?: string) => {
  try {
    // Create a temporary file with the content
    const tempFile = path.join(app.getPath('temp'), `helm-secret-${Date.now()}.yaml`);
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
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to encrypt Helm secret' 
    };
  }
});

ipcMain.handle('helmSecretsDecrypt', async (_, content: string, sopsConfigPath?: string) => {
  try {
    // Create a temporary file with the content
    const tempFile = path.join(app.getPath('temp'), `helm-secret-${Date.now()}.yaml`);
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
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to decrypt Helm secret' 
    };
  }
});

// Encryption IPC Handlers
ipcMain.handle('generateEncryptionKey', async () => {
  try {
    encryptionKey = crypto.randomBytes(32);
    const keyPath = path.join(app.getPath('userData'), 'encryption.key');
    await fs.promises.writeFile(keyPath, encryptionKey);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate encryption key' 
    };
  }
});

ipcMain.handle('encryptSecret', async (_, content: string) => {
  try {
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    // Generate a random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    
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
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to encrypt secret' 
    };
  }
});

ipcMain.handle('decryptSecret', async (_, content: string) => {
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
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      encryptionKey,
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    // Decrypt the content
    let decrypted = decipher.update(encryptedData.content, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return { success: true, decrypted };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to decrypt secret' 
    };
  }
});

// Keytab IPC Handlers
ipcMain.handle('keytab:process', async (_, content: ArrayBuffer) => {
  try {
    // Create a temporary file to store the keytab content
    const tempFile = path.join(app.getPath('temp'), `keytab-${Date.now()}`);
    await fs.promises.writeFile(tempFile, Buffer.from(content));

    // Use klist to read the keytab contents
    const { stdout } = await execAsync(`/opt/homebrew/Cellar/krb5/1.21.3/bin/klist -k ${tempFile}`);

    // Parse the output
    const entries = stdout
      .split('\n')
      .filter(line => line.includes('@'))
      .map(line => {
        const [kvno, principal] = line.trim().split(/\s+/);
        return {
          principal: principal.trim(),
          kvno: parseInt(kvno, 10),
          timestamp: new Date().toISOString(), // klist doesn't provide timestamp
          encryptionType: 'arcfour-hmac' // We'll use the encryption type we used to create the keytab
        };
      });

    // Clean up the temporary file
    await fs.promises.unlink(tempFile);

    return { 
      success: true, 
      entries 
    };
  } catch (error) {
    console.error('Keytab processing error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process keytab file' 
    };
  }
});

// IPC handler: create keytab
ipcMain.handle('keytab:create', async (_, { principal, password, encryptionType, kvno }) => {
  try {
    console.log('Creating keytab with:', { principal, password, encryptionType, kvno });
    if (encryptionType !== 'arcfour-hmac') {
      throw new Error('Only arcfour-hmac is supported in this version.');
    }
    const keytabBuf = createArcfourKeytab(principal, password, kvno);
    console.log('Generated keytabBuf (hex):', keytabBuf.toString('hex'));
    // Show save dialog
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Keytab File',
      defaultPath: `${principal.replace(/[@/]/g, '_')}.keytab`,
      filters: [{ name: 'Keytab Files', extensions: ['keytab'] }]
    });
    if (canceled || !filePath) {
      return { success: false, error: 'Save canceled' };
    }
    await fs.promises.writeFile(filePath, keytabBuf);
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create keytab' };
  }
});

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

// Kafka IPC Handlers
ipcMain.handle('kafka:connect', async (_, config: KafkaConnectionConfig) => {
  try {
    // Prepare Kafka client configuration
    const kafkaConfig: any = {
      clientId: config.clientId,
      brokers: config.brokers,
    };

    // Add SSL configuration if needed
    if (config.securityProtocol === 'SSL' || config.securityProtocol === 'SASL_SSL') {
      kafkaConfig.ssl = {
        rejectUnauthorized: true,
      };

      if (config.ssl?.caLocation) {
        kafkaConfig.ssl.ca = [await fs.promises.readFile(config.ssl.caLocation)];
      }

      if (config.ssl?.certLocation && config.ssl?.keyLocation) {
        kafkaConfig.ssl.cert = await fs.promises.readFile(config.ssl.certLocation);
        kafkaConfig.ssl.key = await fs.promises.readFile(config.ssl.keyLocation);
        
        if (config.ssl.keyPassword) {
          kafkaConfig.ssl.passphrase = config.ssl.keyPassword;
        }
      }
    }

    // Add SASL configuration if needed
    if (config.securityProtocol === 'SASL_PLAINTEXT' || config.securityProtocol === 'SASL_SSL') {
      if (config.saslMechanism === 'GSSAPI' && config.kerberos) {
        // Set Kerberos environment variables if krb5.conf is provided
        if (config.kerberos.krb5ConfigLocation) {
          process.env.KRB5_CONFIG = config.kerberos.krb5ConfigLocation;
        }

        // Set Kerberos keytab if provided
        if (config.kerberos.keytabLocation) {
          process.env.KRB5_CLIENT_KTNAME = config.kerberos.keytabLocation;
        }

        kafkaConfig.sasl = {
          mechanism: 'GSSAPI',
          authenticationProvider: {
            serviceName: config.kerberos.serviceName || 'kafka',
            principal: config.kerberos.principal,
          },
        };
      } else if (config.saslMechanism && config.sasl) {
        kafkaConfig.sasl = {
          mechanism: config.saslMechanism,
          username: config.sasl.username,
          password: config.sasl.password,
        };
      }
    }

    // Create Kafka client with the configuration
    kafkaClient = new Kafka(kafkaConfig);
    
    // Test the connection by getting metadata
    const admin = kafkaClient.admin();
    await admin.listTopics();
    await admin.disconnect();
    
    return { success: true };
  } catch (error) {
    console.error('Kafka connection error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to connect to Kafka' 
    };
  }
});

ipcMain.handle('kafka:listTopics', async () => {
  try {
    if (!kafkaClient) throw new Error('Not connected to Kafka');
    const admin = kafkaClient.admin();
    const topics = await admin.listTopics();
    await admin.disconnect();
    return { success: true, topics };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to list topics' 
    };
  }
});

ipcMain.handle('kafka:createTopic', async (_, { topic, partitions = 1, replicationFactor = 1 }) => {
  try {
    if (!kafkaClient) throw new Error('Not connected to Kafka');
    const admin = kafkaClient.admin();
    await admin.createTopics({
      topics: [{
        topic,
        numPartitions: partitions,
        replicationFactor: replicationFactor,
      }],
    });
    await admin.disconnect();
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create topic' 
    };
  }
});

ipcMain.handle('kafka:produce', async (_, { topic, messages, acks = -1 }) => {
  try {
    if (!kafkaClient) throw new Error('Not connected to Kafka');
    
    // Create producer if it doesn't exist
    if (!kafkaProducer) {
      kafkaProducer = kafkaClient.producer();
      await kafkaProducer.connect();
    }
    
    // Send messages
    const result = await kafkaProducer.send({
      topic,
      messages: messages.map((msg: any) => ({
        key: msg.key ? Buffer.from(msg.key) : undefined,
        value: msg.value ? Buffer.from(msg.value) : undefined,
        headers: msg.headers,
      })),
      acks,
    });
    
    return { 
      success: true, 
      result: {
        topicName: result[0].topicName,
        partition: result[0].partition,
        baseOffset: result[0].baseOffset,
        logAppendTime: result[0].logAppendTime,
      }
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to produce message' 
    };
  }
});

ipcMain.handle('kafka:consume', async (_, { 
  topic, 
  groupId, 
  fromBeginning = false,
  autoCommit = true,
  maxMessages = 100,
}) => {
  try {
    if (!kafkaClient) throw new Error('Not connected to Kafka');
    
    // Create consumer if it doesn't exist
    if (!kafkaConsumer) {
      kafkaConsumer = kafkaClient.consumer({ groupId });
      await kafkaConsumer.connect();
    }
    
    // Subscribe to topic
    await kafkaConsumer.subscribe({ 
      topic, 
      fromBeginning 
    });
    
    // Start consuming
    const messages: KafkaMessage[] = [];
    let messageCount = 0;
    
    await kafkaConsumer.run({
      autoCommit,
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        if (messageCount >= maxMessages) {
          await kafkaConsumer?.disconnect();
          return;
        }
        
        messages.push({
          ...message,
          topic,
          partition,
        });
        
        messageCount++;
        
        if (messageCount >= maxMessages) {
          await kafkaConsumer?.disconnect();
        }
      },
    });
    
    // Store consumer for later cleanup
    const consumerId = crypto.randomUUID();
    activeConsumers.set(consumerId, kafkaConsumer);
    
    return { 
      success: true, 
      consumerId,
      messages: messages.map(msg => ({
        topic: msg.topic,
        partition: msg.partition,
        offset: msg.offset,
        key: msg.key?.toString(),
        value: msg.value?.toString(),
        headers: msg.headers,
        timestamp: msg.timestamp,
      }))
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to consume messages' 
    };
  }
});

ipcMain.handle('kafka:stopConsumer', async (_, consumerId: string) => {
  try {
    const consumer = activeConsumers.get(consumerId);
    if (consumer) {
      await consumer.disconnect();
      activeConsumers.delete(consumerId);
    }
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to stop consumer' 
    };
  }
});

ipcMain.handle('kafka:disconnect', async () => {
  try {
    // Disconnect producer
    if (kafkaProducer) {
      await kafkaProducer.disconnect();
      kafkaProducer = null;
    }
    
    // Disconnect all consumers
    for (const [_, consumer] of activeConsumers) {
      await consumer.disconnect();
    }
    activeConsumers.clear();
    
    // Clear client
    kafkaClient = null;
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to disconnect from Kafka' 
    };
  }
});

// App lifecycle handlers
app.whenReady().then(async () => {
  await loadEncryptionKey();
  createWindow();
});

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
  // Clean up MongoDB
  for (const [_, cursor] of activeCursors) {
    await cursor.close();
  }
  activeCursors.clear();
  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  // Clean up Kafka
  if (kafkaProducer) {
    await kafkaProducer.disconnect();
  }
  
  for (const [_, consumer] of activeConsumers) {
    await consumer.disconnect();
  }
  activeConsumers.clear();
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Helper function to get MongoDB client
async function getMongoClient(connectionString: string) {
  const client = new MongoClient(connectionString);
  await client.connect();
  return client;
}

// New IPC handler for 'file:read'
ipcMain.handle('file:read', async (_, filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath);
    return { success: true, content: Array.from(content) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to read file' };
  }
});

// Add saveFile handler
ipcMain.handle('saveFile', async (_, { content, path, fileName }) => {
  try {
    // Show save dialog
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Java File',
      defaultPath: fileName,
      filters: [{ name: 'Java Files', extensions: ['java'] }]
    });

    if (canceled || !filePath) {
      return { success: false, error: 'Save canceled' };
    }

    // Create directory if it doesn't exist
    const dirPath = path.dirname(filePath);
    await fs.promises.mkdir(dirPath, { recursive: true });

    // Write the file
    await fs.promises.writeFile(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save file' 
    };
  }
});

// Port Killer IPC Handler
ipcMain.handle('port:kill', async (_, port: number) => {
  try {
    // For macOS, we'll use lsof to find the process and kill it
    const { stdout: lsofOutput } = await execAsync(`lsof -i :${port} -t`);
    if (!lsofOutput.trim()) {
      return { success: false, error: `No process found using port ${port}` };
    }

    const pids = lsofOutput.trim().split('\n');
    for (const pid of pids) {
      await execAsync(`kill -9 ${pid}`);
    }

    return { 
      success: true, 
      message: `Successfully killed process(es) on port ${port}`,
      pids: pids.map(pid => parseInt(pid.trim()))
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to kill process on port' 
    };
  }
});
