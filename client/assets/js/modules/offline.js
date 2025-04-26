const DB_NAME = 'markdownEditorDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingChanges';

let db = null;

export async function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Error opening IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB opened successfully');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Alias for backward compatibility
export const initOffline = initOfflineDB;

export async function bufferOperation(operation) {
  if (!db) {
    await initOfflineDB();
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.add({
      ...operation,
      timestamp: Date.now()
    });
    
    request.onsuccess = () => {
      console.log('Operation buffered:', operation);
      resolve(request.result);
    };
    
    request.onerror = () => {
      console.error('Error buffering operation:', request.error);
      reject(request.error);
    };
  });
}

export async function getPendingOperations() {
  if (!db) {
    await initOfflineDB();
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      console.error('Error getting pending operations:', request.error);
      reject(request.error);
    };
  });
}

export async function clearPendingOperations() {
  if (!db) {
    await initOfflineDB();
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => {
      console.log('Pending operations cleared');
      resolve();
    };
    
    request.onerror = () => {
      console.error('Error clearing pending operations:', request.error);
      reject(request.error);
    };
  });
}

export async function commitOfflineChanges(sendOperation) {
  try {
    const operations = await getPendingOperations();
    console.log('Committing offline changes:', operations);
    
    for (const operation of operations) {
      await sendOperation(operation);
    }
    
    await clearPendingOperations();
    console.log('Offline changes committed successfully');
  } catch (error) {
    console.error('Error committing offline changes:', error);
    throw error;
  }
}

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log('Online - attempting to sync changes');
  // This will be called from sync.js when the connection is restored
});

window.addEventListener('offline', () => {
  console.log('Offline - changes will be buffered');
});