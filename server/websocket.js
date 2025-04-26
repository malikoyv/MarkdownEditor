const WebSocket = require('ws');
const url = require('url');

// Store documents in memory (in production, use a database)
const documents = new Map();
const activeUsers = {};

// Initialize WebSocket server
function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });
  
  wss.on('connection', handleConnection);
  
  return wss;
}

// Handle new WebSocket connections
function handleConnection(ws, req) {
  const params = url.parse(req.url, true).query;
  const documentId = params.docId;
  const userId = params.userId;
  
  if (!documentId || !userId) {
    ws.close(1008, 'Missing document ID or user ID');
    return;
  }
  
  console.log(`User ${userId} connected to document ${documentId}`);
  
  // Initialize document if it doesn't exist
  if (!documents.has(documentId)) {
    documents.set(documentId, {
      content: '',
      title: 'Untitled Document',
      activeUsers: {},
      ownerId: null,
      collaborators: [],
      updatedAt: new Date()
    });
  }
  
  const doc = documents.get(documentId);
  
  // Add user to active users for this document
  if (!doc.activeUsers[userId]) {
    doc.activeUsers[userId] = { id: userId };
  }
  
  // Add ws to user's websocket connections
  if (!activeUsers[userId]) {
    activeUsers[userId] = [];
  }
  activeUsers[userId].push({ ws, documentId });
  
  // Set up event handlers
  ws.on('message', (message) => handleMessage(ws, message, documentId, userId));
  ws.on('close', () => handleDisconnection(ws, documentId, userId));
  ws.on('error', (error) => handleError(ws, error, documentId, userId));
  
  // Send initial document state
  ws.send(JSON.stringify({
    type: 'init',
    content: doc.content,
    title: doc.title,
    ownerId: doc.ownerId,
    collaborators: doc.collaborators,
    updatedAt: doc.updatedAt
  }));
}

// Handle incoming WebSocket messages
function handleMessage(ws, message, documentId, userId) {
  try {
    const data = JSON.parse(message);
    const doc = documents.get(documentId);
    
    if (!doc) {
      throw new Error('Document not found');
    }
    
    // Update document content if necessary
    if (data.type === 'contentChange') {
      console.log('Content change received:', data);
      doc.content = data.content;
      doc.updatedAt = new Date();
      documents.set(documentId, doc);
      
      // Broadcast to all clients except sender
      broadcast(documentId, {
        type: 'contentChange',
        content: data.content,
        documentId: documentId,
        user: data.user
      }, userId);
      
      return; // Don't re-broadcast the original message
    } else if (data.type === 'titleChange') {
      doc.title = data.title;
      doc.updatedAt = new Date();
      documents.set(documentId, doc);
      
      // Broadcast to all clients except sender
      broadcast(documentId, {
        type: 'titleChange',
        title: data.title,
        documentId: documentId,
        user: data.user
      }, userId);
      
      return; // Don't re-broadcast the original message
    } else if (data.type === 'join') {
      doc.activeUsers[userId] = data.user;
      
      // Broadcast join message to all clients
      broadcast(documentId, {
        type: 'join',
        user: data.user,
        activeUsers: Object.values(doc.activeUsers)
      });
      
      return; // Don't re-broadcast the original message
    } else if (data.type === 'leave') {
      delete doc.activeUsers[userId];
      
      // Broadcast leave message to all clients
      broadcast(documentId, {
        type: 'leave',
        user: data.user,
        activeUsers: Object.values(doc.activeUsers)
      });
      
      return; // Don't re-broadcast the original message
    } else if (data.type === 'requestContent') {
      console.log('Content request received:', data);
      // Send current document state to requesting user
      ws.send(JSON.stringify({
        type: 'contentResponse',
        content: doc.content,
        documentId: documentId,
        user: data.user
      }));
      return;
    } else if (data.type === 'contentResponse') {
      console.log('Content response received:', data);
      // Update document content from response
      doc.content = data.content;
      doc.updatedAt = new Date();
      documents.set(documentId, doc);
      
      // Broadcast to all clients except sender
      broadcast(documentId, {
        type: 'contentChange',
        content: data.content,
        documentId: documentId,
        user: data.user
      }, userId);
      
      return;
    }
    
    // For any other message type, broadcast to all clients
    broadcast(documentId, data, userId);
  } catch (error) {
    console.error('Error processing message:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Error processing your message'
    }));
  }
}

// Handle WebSocket disconnections
function handleDisconnection(ws, documentId, userId) {
  console.log(`User ${userId} disconnected from document ${documentId}`);
  
  // Remove user from active users for this document
  if (documents.has(documentId)) {
    const doc = documents.get(documentId);
    if (doc.activeUsers[userId]) {
      const user = doc.activeUsers[userId];
      delete doc.activeUsers[userId];
      
      // Broadcast leave message to all clients
      broadcast(documentId, {
        type: 'leave',
        user: user,
        activeUsers: Object.values(doc.activeUsers)
      });
    }
  }
  
  // Remove this connection from user's active connections
  if (activeUsers[userId]) {
    activeUsers[userId] = activeUsers[userId].filter(conn => conn.ws !== ws);
    if (activeUsers[userId].length === 0) {
      delete activeUsers[userId];
    }
  }
  
  // Clean up empty documents
  if (documents.has(documentId) && 
      Object.keys(documents.get(documentId).activeUsers).length === 0) {
    // Persist document to database before removing from memory
    // This would be handled by a database module in a real application
    console.log(`Document ${documentId} is now inactive, saving state...`);
    
    // For now, we'll just log it
    setTimeout(() => {
      if (documents.has(documentId) && 
          Object.keys(documents.get(documentId).activeUsers).length === 0) {
        documents.delete(documentId);
        console.log(`Document ${documentId} removed from memory`);
      }
    }, 1800000); // 30 minutes
  }
}

// Handle WebSocket errors
function handleError(ws, error, documentId, userId) {
  console.error(`WebSocket error for user ${userId} on document ${documentId}:`, error);
  
  // Handle error appropriately
  try {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Connection error occurred'
    }));
  } catch (e) {
    // Connection might be already closed
    console.log('Could not send error message, connection might be closed');
  }
}

// Broadcast a message to all clients connected to a document
function broadcast(documentId, message, excludeUserId = null) {
  if (!documents.has(documentId)) {
    console.log('Document not found for broadcast:', documentId);
    return;
  }
  
  const doc = documents.get(documentId);
  console.log('Broadcasting message to document:', documentId, 'Message:', message);
  
  Object.keys(doc.activeUsers).forEach(userId => {
    if (excludeUserId && userId === excludeUserId) {
      console.log('Skipping broadcast to sender:', userId);
      return;
    }
    
    const userConnections = activeUsers[userId] || [];
    userConnections.forEach(conn => {
      if (conn.documentId === documentId && conn.ws.readyState === WebSocket.OPEN) {
        console.log('Sending message to user:', userId);
        conn.ws.send(JSON.stringify(message));
      }
    });
  });
}

module.exports = {
  initWebSocketServer,
  broadcast,
  documents,
  activeUsers
};