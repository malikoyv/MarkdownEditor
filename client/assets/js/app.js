import { initAuth } from './modules/auth.js';
import { initDocuments } from './modules/document.js';
import { initSync } from './modules/sync.js';
import { initOfflineDB } from './modules/offline.js';
import { initHistory, recordChange } from './modules/history.js';
import { initAccessibility, announceDocumentStatus } from './modules/accessibility.js';
import { initEditor } from './modules/editor.js';

// Initialize all modules
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize IndexedDB for offline support
    await initOfflineDB();
    
    // Initialize authentication
    await initAuth();
    
    // Initialize accessibility features
    initAccessibility();
    
    // Initialize document management
    initDocuments();
    
    // Initialize real-time synchronization
    initSync();
    
    // Initialize editor
    initEditor();
    
    // Initialize history
    initHistory();
    
    // Announce initial status
    announceDocumentStatus(null);
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
});

// Handle offline/online events
window.addEventListener('online', () => {
  console.log('Application is online');
  document.dispatchEvent(new CustomEvent('app:online'));
});

window.addEventListener('offline', () => {
  console.log('Application is offline');
  document.dispatchEvent(new CustomEvent('app:offline'));
}); 