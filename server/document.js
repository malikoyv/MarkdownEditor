const { v4: uuidv4 } = require('uuid');

// In-memory document store for demo purposes
// In a real app, you would use a database
const documents = new Map();

// Create a new document
function createDocument(ownerId, title = 'Untitled Document', content = '') {
  const docId = `doc_${uuidv4()}`;
  
  const document = {
    id: docId,
    ownerId,
    title,
    content,
    collaborators: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  documents.set(docId, document);
  
  return document;
}

// Get document by ID
function getDocumentById(docId) {
  return documents.get(docId);
}

// Get all documents for a user
function getDocumentsByUserId(userId) {
  const userDocs = [];
  
  for (const doc of documents.values()) {
    if (doc.ownerId === userId || doc.collaborators.includes(userId)) {
      userDocs.push(doc);
    }
  }
  
  return userDocs;
}

// Update a document
function updateDocument(docId, updates, userId) {
  const doc = documents.get(docId);
  
  if (!doc) {
    throw new Error('Document not found');
  }
  
  // Check if user has permission to edit
  if (doc.ownerId !== userId && !doc.collaborators.includes(userId)) {
    throw new Error('Unauthorized');
  }
  
  // Apply updates
  if (updates.title !== undefined) {
    doc.title = updates.title;
  }
  
  if (updates.content !== undefined) {
    doc.content = updates.content;
  }
  
  doc.updatedAt = new Date();
  
  // Save updated document
  documents.set(docId, doc);
  
  return doc;
}

// Delete a document
function deleteDocument(docId, userId) {
  const doc = documents.get(docId);
  
  if (!doc) {
    throw new Error('Document not found');
  }
  
  // Only the owner can delete
  if (doc.ownerId !== userId) {
    throw new Error('Unauthorized');
  }
  
  documents.delete(docId);
  
  return { success: true };
}

// Add a collaborator to a document
function addCollaborator(docId, ownerId, collaboratorId) {
  const doc = documents.get(docId);
  
  if (!doc) {
    throw new Error('Document not found');
  }
  
  // Check if user is the owner
  if (doc.ownerId !== ownerId) {
    throw new Error('Unauthorized');
  }
  
  // Check if collaborator is already added
  if (doc.collaborators.includes(collaboratorId)) {
    return doc;
  }
  
  doc.collaborators.push(collaboratorId);
  doc.updatedAt = new Date();
  
  documents.set(docId, doc);
  
  return doc;
}

// Remove a collaborator from a document
function removeCollaborator(docId, ownerId, collaboratorId) {
  const doc = documents.get(docId);
  
  if (!doc) {
    throw new Error('Document not found');
  }
  
  // Check if user is the owner
  if (doc.ownerId !== ownerId) {
    throw new Error('Unauthorized');
  }
  
  doc.collaborators = doc.collaborators.filter(id => id !== collaboratorId);
  doc.updatedAt = new Date();
  
  documents.set(docId, doc);
  
  return doc;
}

module.exports = {
  createDocument,
  getDocumentById,
  getDocumentsByUserId,
  updateDocument,
  deleteDocument,
  addCollaborator,
  removeCollaborator
};