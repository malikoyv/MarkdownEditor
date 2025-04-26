import { getCurrentUser } from './auth.js';
import { getCurrentDocument, DOCUMENTS_STORAGE_KEY } from './document.js'; // Changed from documents.js to document.js
import { updateEditorContent, getEditorContent, setEditorContent } from './editor.js';
import { CRDT } from './crdt.js';
import { showCursor, removeCursor } from './cursor.js';
import { bufferOperation, commitOfflineChanges } from './offline.js';
import { showNotification } from './ui.js';

let ws = null;
let crdt = null;
export let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

export const initSync = () => {
  // Listen for editor content changes
  document.addEventListener('editor:contentChange', e => {
    if (!isConnected) {
      bufferOperation({
        type: 'contentChange',
        content: e.detail.content,
        documentId: getCurrentDocument()?.id
      });
      return;
    }
    
    sendOperation({
      type: 'contentChange',
      content: e.detail.content,
      user: e.detail.user
    });
  });
  
  // Listen for title changes
 document.addEventListener('editor:titleChange', e => {
  if (!isConnected) {
    bufferOperation({
      type: 'titleChange',
      title: e.detail.title,
      documentId: getCurrentDocument()?.id
    });
    return;
  }
  
  sendOperation({
    type: 'titleChange',
    title: e.detail.title,
    user: e.detail.user
  });
});

// Listen for cursor position changes
document.addEventListener('cursor:change', e => {
  if (!isConnected) return;
  
  sendOperation({
    type: 'cursorChange',
    position: e.detail.position,
    user: e.detail.user
  });
});

// Listen for network status changes
window.addEventListener('online', () => {
  if (getCurrentDocument()) {
    connectToDocument(getCurrentDocument().id);
    commitOfflineChanges();
  }
});

window.addEventListener('offline', () => {
  showNotification('You are offline. Changes will be synced when you reconnect.', 'warning');
});
};

export const connectToDocument = (documentId) => {
  const user = getCurrentUser();
  if (!user) return;
  
  console.log('Connecting to document:', documentId, 'for user:', user);
  
  // Close existing connection
  if (ws) {
    ws.close();
  }
  
  // Create a new CRDT instance
  crdt = new CRDT(user.id);
  
  // Connect to WebSocket
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsUrl = `${protocol}${window.location.host}/ws?docId=${documentId}&userId=${user.id}`;
    
    console.log('WebSocket URL:', wsUrl);
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      isConnected = true;
      reconnectAttempts = 0;
      console.log('WebSocket connected successfully');
      showNotification('Connected to document', 'success');
      
      // Send join message
      sendOperation({
        type: 'join',
        documentId: documentId,
        user: user
      });
      
      // Request latest document state
      sendOperation({
        type: 'requestContent',
        documentId: documentId
      });
      
      // Check for offline changes
      commitOfflineChanges();
    };
    
    ws.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data);
      const message = JSON.parse(event.data);
      
      // Handle initial document state
      if (message.type === 'init') {
        console.log('Received initial document state:', message);
        handleContentResponse(documentId, message.content);
        if (message.title) {
          document.getElementById('documentTitle').value = message.title;
        }
        return;
      }
      
      handleMessage(message);
    };
    
    ws.onclose = () => {
      isConnected = false;
      console.log('WebSocket connection closed');
      
      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => connectToDocument(documentId), RECONNECT_DELAY);
      } else {
        showNotification('Connection lost. Please refresh the page.', 'error');
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      showNotification('Connection error occurred', 'error');
    };
  } catch (error) {
    console.error('Error connecting to WebSocket:', error);
    showNotification('Failed to connect to document', 'error');
  }
};

export const disconnectFromDocument = (documentId) => {
  if (!ws) return;
  
  const user = getCurrentUser();
  if (user) {
    sendOperation({
      type: 'leave',
      documentId: documentId,
      user: user
    });
  }
  
  ws.close();
  ws = null;
  isConnected = false;
};

export function sendOperation(operation) {
  console.log('Sending operation:', operation);
  
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('WebSocket not ready, buffering operation');
    bufferOperation(operation);
    return;
  }
  
  // Add current user to the operation
  const currentUser = getCurrentUser();
  if (currentUser) {
    operation.user = currentUser;
  }
  
  ws.send(JSON.stringify(operation));
}

function handleMessage(message) {
  console.log('Handling message:', message);
  
  switch (message.type) {
    case 'contentChange':
      console.log('Content change received:', message);
      if (message.user?.id !== getCurrentUser()?.id) {
        console.log('Updating editor content from remote change');
        handleContentChange(message.documentId, message.content);
      }
      break;
      
    case 'requestContent':
      console.log('Content request received:', message);
      if (message.user?.id !== getCurrentUser()?.id) {
        // Send current document content to requesting user
        const currentDoc = getCurrentDocument();
        if (currentDoc && currentDoc.id === message.documentId) {
          sendOperation({
            type: 'contentResponse',
            documentId: message.documentId,
            content: currentDoc.content,
            user: getCurrentUser()
          });
        }
      }
      break;
      
    case 'contentResponse':
      console.log('Content response received:', message);
      if (message.user?.id !== getCurrentUser()?.id) {
        handleContentResponse(message.documentId, message.content);
      }
      break;
      
    case 'titleChange':
      console.log('Title change received:', message);
      if (message.user?.id !== getCurrentUser()?.id) {
        document.getElementById('documentTitle').value = message.title;
      }
      break;
      
    case 'cursorChange':
      console.log('Cursor change received:', message);
      if (message.user?.id !== getCurrentUser()?.id) {
        showCursor(message.position, message.user);
      }
      break;
      
    case 'join':
      console.log('User joined:', message.user);
      showNotification(`${message.user.name} joined the document`, 'info');
      updateActiveUsers(message.activeUsers);
      break;
      
    case 'leave':
      console.log('User left:', message.user);
      showNotification(`${message.user.name} left the document`, 'info');
      removeCursor(message.user.id);
      updateActiveUsers(message.activeUsers);
      break;
      
    case 'error':
      console.log('Error received:', message);
      showNotification(message.message, 'error');
      break;
  }
}

function handleContentResponse(documentId, content) {
  console.log('Handling content response for document:', documentId);
  console.log('Received content:', content);
  
  // Update the document in storage
  const allDocsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  const allDocs = allDocsJson ? JSON.parse(allDocsJson) : [];
  
  const docIndex = allDocs.findIndex(d => d.id === documentId);
  if (docIndex !== -1) {
    console.log('Updating document in storage');
    allDocs[docIndex].content = content;
    allDocs[docIndex].updatedAt = Date.now();
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(allDocs));
    
    // Update UI if this is the current document
    const currentDoc = getCurrentDocument();
    if (currentDoc && currentDoc.id === documentId) {
      console.log('Updating editor content');
      setEditorContent({ ...currentDoc, content });
    }
  }
}

function handleContentChange(documentId, content) {
  console.log('Handling content change for document:', documentId);
  console.log('New content:', content);
  
  // Update the document in storage
  const allDocsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  const allDocs = allDocsJson ? JSON.parse(allDocsJson) : [];
  
  const docIndex = allDocs.findIndex(d => d.id === documentId);
  if (docIndex !== -1) {
    console.log('Updating document in storage');
    allDocs[docIndex].content = content;
    allDocs[docIndex].updatedAt = Date.now();
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(allDocs));
    
    // Update UI if this is the current document
    const currentDoc = getCurrentDocument();
    if (currentDoc && currentDoc.id === documentId) {
      console.log('Updating editor content');
      setEditorContent({ ...currentDoc, content });
    }
  }
}

function updateActiveUsers(users) {
  const activeUsersElement = document.getElementById('activeUsers');
  
  if (!activeUsersElement || !users) return;
  
  const userElements = users.map(user => 
    `<div class="active-user" style="background-color: ${getUserColor(user.id)}">
      ${user.name.charAt(0).toUpperCase()}
    </div>`
  ).join('');
  
  activeUsersElement.innerHTML = userElements;
}

function getUserColor(userId) {
  // Generate a consistent color for a user based on their ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#DFBBB1', '#F7B32B', '#2D7DD2'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

// Mock WebSocket implementation for local testing
function setupMockWebSocket(documentId, userId) {
  // Keep track of all connected users
  if (!window.mockUsers) {
    window.mockUsers = {};
  }
  if (!window.mockActiveUsers) {
    window.mockActiveUsers = [];
  }
  
  // Add current user to mock users
  const currentUser = getCurrentUser();
  window.mockUsers[userId] = currentUser;
  if (!window.mockActiveUsers.some(u => u.id === userId)) {
    window.mockActiveUsers.push(currentUser);
  }
  
  isConnected = true;
  console.log('Connected to document (local mode)');
  console.log('Active users:', window.mockActiveUsers);
  
  // Create a simple mock of the WebSocket behavior
  ws = {
    readyState: WebSocket.OPEN,
    
    send: (data) => {
      const message = JSON.parse(data);
      console.log('Mock WebSocket received:', message);
      
      // Simulate the server broadcasting to all clients
      setTimeout(() => {
        // Handle specific message types
        if (message.type === 'join') {
          handleMessage({
            type: 'join',
            user: message.user,
            activeUsers: window.mockActiveUsers
          });
        }
        else if (message.type === 'leave') {
          delete window.mockUsers[message.user.id];
          window.mockActiveUsers = window.mockActiveUsers.filter(u => u.id !== message.user.id);
          handleMessage({
            type: 'leave',
            user: message.user,
            activeUsers: window.mockActiveUsers
          });
        }
        else if (message.type === 'contentChange') {
          console.log('Handling content change:', message);
          // Update the document in storage
          const allDocsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
          const allDocs = allDocsJson ? JSON.parse(allDocsJson) : [];
          const docIndex = allDocs.findIndex(d => d.id === message.documentId);
          
          if (docIndex !== -1) {
            console.log('Updating document in storage');
            allDocs[docIndex].content = message.content;
            allDocs[docIndex].updatedAt = Date.now();
            localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(allDocs));
            
            // Broadcast the change to all other clients
            window.mockActiveUsers.forEach(user => {
              if (user.id !== message.user?.id) {
                console.log('Broadcasting to user:', user.id);
                handleMessage({
                  type: 'contentChange',
                  content: message.content,
                  documentId: message.documentId,
                  user: message.user
                });
              }
            });
          }
        }
        else {
          // Simply echo back the message in this mock
          handleMessage(message);
        }
      }, 100);
    },
    
    close: () => {
      isConnected = false;
      // Remove user from active users
      const index = window.mockActiveUsers.findIndex(u => u.id === userId);
      if (index !== -1) {
        window.mockActiveUsers.splice(index, 1);
      }
      delete window.mockUsers[userId];
    }
  };
  
  // Simulate a server response for the join event
  setTimeout(() => {
    handleMessage({
      type: 'join',
      user: currentUser,
      activeUsers: window.mockActiveUsers
    });
  }, 300);
}

// Functions to expose for testing
export const getConnectionStatus = () => isConnected;
export const getWebSocket = () => ws;

// markdown.js
export const renderMarkdown = (markdown) => {
  if (!markdown) return '';
  
  // A simple Markdown renderer
  // Replace headings
  let html = markdown
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
    .replace(/^###### (.*$)/gm, '<h6>$1</h6>');
  
  // Replace bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Replace italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Replace links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Replace images
  html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  
  // Replace code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Replace inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Replace lists
  html = html.replace(/^\s*\*\s(.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
  
  // Replace numbered lists
  html = html.replace(/^\s*\d+\.\s(.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gms, match => {
    if (match.includes('</li><li>')) {
      return '<ol>' + match + '</ol>';
    }
    return match;
  });
  
  // Replace blockquotes
  html = html.replace(/^\s*>\s(.*$)/gm, '<blockquote>$1</blockquote>');
  
  // Replace horizontal rules
  html = html.replace(/^\s*---\s*$/gm, '<hr>');
  
  // Replace paragraphs
  html = html.replace(/^([^<].*)\n$/gm, '<p>$1</p>');
  
  // Fix empty lines
  html = html.replace(/^\s*$/gm, '<br>');
  
  return html;
};
