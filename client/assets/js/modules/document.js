import { isAuthenticated, getCurrentUser } from './auth.js';
import { showNotification } from './ui.js';
import { getEditorContent, setEditorContent, initNewDocument, closeDocument } from './editor.js';
import { connectToDocument, disconnectFromDocument, isConnected, sendOperation } from './sync.js';

export const DOCUMENTS_STORAGE_KEY = 'markdown_documents';
let currentDocument = null;

export const initDocuments = () => {
  const newDocBtn = document.getElementById('newDocumentBtn');
  const documentList = document.getElementById('documentList');
  const saveBtn = document.getElementById('saveBtn');
  
  // Check for document ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get('doc');
  
  // Create new document
  if (newDocBtn) {
    newDocBtn.addEventListener('click', () => {
      console.log('New document button clicked');
      
      if (!isAuthenticated()) {
        console.log('User not authenticated');
        showNotification('Please login to create documents', 'warning');
        return;
      }
      
      console.log('Creating new document');
      createNewDocument();
    });
  }
  
  // Save document
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (currentDocument) {
        saveDocument(currentDocument.id);
      }
    });
  }
  
  // Listen for auth events
  document.addEventListener('user:login', () => {
    console.log('User logged in, loading documents');
    loadDocumentList();
    
    // If there's a document ID in the URL, open it after login
    if (docId) {
      console.log('Opening document from URL:', docId);
      openDocument(docId);
    }
  });
  
  document.addEventListener('user:logout', () => {
    if (documentList) {
      documentList.innerHTML = '';
    }
    closeDocument();
  });
  
  // Initial document load if user is authenticated
  if (isAuthenticated()) {
    console.log('User is authenticated, loading documents');
    loadDocumentList();
    
    // If there's a document ID in the URL, open it
    if (docId) {
      console.log('Opening document from URL:', docId);
      openDocument(docId);
    }
  }
};

function getDocuments() {
  const user = getCurrentUser();
  console.log('Getting documents for user:', user);
  
  if (!user) return [];
  
  const docsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  const allDocs = docsJson ? JSON.parse(docsJson) : [];
  console.log('All documents in storage:', allDocs);
  
  // Get user's own documents and shared documents
  const userDocs = allDocs.filter(doc => 
    doc.ownerId === user.id || 
    doc.collaborators?.includes(user.id)
  );
  console.log('Filtered documents for user:', userDocs);
  
  return userDocs;
}

function loadDocumentList() {
  const documentList = document.getElementById('documentList');
  const documents = getDocuments();
  
  console.log('Loading document list:', documents);
  
  if (documents.length === 0) {
    documentList.innerHTML = '<p class="empty-list" data-i18n="noDocuments">No documents yet. Create one to get started!</p>';
    return;
  }
  
  // Generate document list HTML
  const docListHTML = documents
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(doc => {
      const date = new Date(doc.updatedAt).toLocaleDateString();
      const isShared = doc.ownerId !== getCurrentUser()?.id;
      return `
        <div class="document-item" data-id="${doc.id}">
          <div class="document-info">
            <h3 class="document-title">${doc.title || 'Untitled'}</h3>
            <p class="document-meta">
              <span data-i18n="updated">Updated</span>: ${date}
              ${isShared ? ' <span class="shared-badge">(Shared)</span>' : ''}
            </p>
          </div>
          <div class="document-actions">
            ${!isShared ? '<button class="btn-icon delete-doc" aria-label="Delete document">🗑️</button>' : ''}
          </div>
        </div>
      `;
    })
    .join('');
  
  documentList.innerHTML = docListHTML;
  
  // Add event listeners to document items
  documentList.querySelectorAll('.document-item').forEach(item => {
    item.addEventListener('click', e => {
      if (!e.target.classList.contains('delete-doc')) {
        const docId = item.getAttribute('data-id');
        openDocument(docId);
      }
    });
  });
  
  // Add event listeners to delete buttons
  documentList.querySelectorAll('.delete-doc').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const docId = btn.closest('.document-item').getAttribute('data-id');
      deleteDocument(docId);
    });
  });
}

function saveAllDocuments(documents) {
  localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
}

export function createNewDocument() {
  const user = getCurrentUser();
  if (!user) return null;
  
  // Close current document if open
  if (currentDocument) {
    disconnectFromDocument(currentDocument.id);
  }
  
  const allDocs = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  const documents = allDocs ? JSON.parse(allDocs) : [];
  
  const newDoc = {
    id: `doc_${Date.now()}`,
    ownerId: user.id,
    title: 'Untitled Document',
    content: '# New Document\n\nStart typing here...',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    collaborators: []
  };
  
  documents.push(newDoc);
  saveAllDocuments(documents);
  
  // Update UI
  loadDocumentList();
  initNewDocument(newDoc);
  currentDocument = newDoc;
  
  // Connect to real-time updates
  connectToDocument(newDoc.id);
  
  return newDoc;
}

export function openDocument(docId) {
  console.log('Opening document:', docId);
  console.log('Current user:', getCurrentUser());
  
  // First, get all documents from storage
  const allDocsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  const allDocs = allDocsJson ? JSON.parse(allDocsJson) : [];
  console.log('All documents in storage:', allDocs);
  
  // Find the document in all documents
  let doc = allDocs.find(d => d.id === docId);
  console.log('Found document in all docs:', doc);
  
  if (!doc) {
    console.log('Document not found in storage, creating new entry');
    doc = {
      id: docId,
      ownerId: null,
      title: 'Shared Document',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      collaborators: []
    };
    
    // Add the document to all documents
    allDocs.push(doc);
    saveAllDocuments(allDocs);
    console.log('Saved new document to storage');
  }
  
  const currentUser = getCurrentUser();
  console.log('Current user for sharing:', currentUser);
  
  // Add current user as collaborator if not already one
  if (currentUser && !doc.collaborators?.includes(currentUser.id)) {
    console.log('Adding current user as collaborator');
    doc.collaborators = doc.collaborators || [];
    doc.collaborators.push(currentUser.id);
    
    // Update the document in all documents
    const docIndex = allDocs.findIndex(d => d.id === docId);
    if (docIndex !== -1) {
      allDocs[docIndex] = doc;
      saveAllDocuments(allDocs);
      console.log('Updated document in all documents');
    }
  }
  
  // Update UI with the document
  setEditorContent(doc);
  currentDocument = doc;
  
  // Disconnect from current document if open
  if (currentDocument) {
    disconnectFromDocument(currentDocument.id);
  }
  
  // Connect to real-time updates
  connectToDocument(docId);
  
  // Reload document list to show the new document
  loadDocumentList();
}

// Add this function to handle content requests
export function handleContentRequest(documentId, requestingUser) {
  if (currentDocument && currentDocument.id === documentId) {
    console.log('Sending content to requesting user:', requestingUser);
    sendOperation({
      type: 'contentResponse',
      documentId: documentId,
      content: currentDocument.content,
      user: getCurrentUser()
    });
  }
}

// Add this function to handle content responses
export function handleContentResponse(documentId, content) {
  if (currentDocument && currentDocument.id === documentId) {
    console.log('Received content from other user, updating editor');
    setEditorContent({ ...currentDocument, content });
    
    // Update the document in storage
    const allDocsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    const allDocs = allDocsJson ? JSON.parse(allDocsJson) : [];
    const docIndex = allDocs.findIndex(d => d.id === documentId);
    
    if (docIndex !== -1) {
      allDocs[docIndex].content = content;
      saveAllDocuments(allDocs);
    }
  }
}

export function handleContentChange(documentId, content) {
  console.log('Handling content change for document:', documentId);
  console.log('New content:', content);
  
  const allDocsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  const allDocs = allDocsJson ? JSON.parse(allDocsJson) : [];
  
  const docIndex = allDocs.findIndex(d => d.id === documentId);
  if (docIndex !== -1) {
    console.log('Updating document in storage');
    allDocs[docIndex].content = content;
    allDocs[docIndex].updatedAt = Date.now();
    saveAllDocuments(allDocs);
    
    // Update UI if this is the current document
    if (currentDocument && currentDocument.id === documentId) {
      console.log('Updating editor content');
      setEditorContent({ ...currentDocument, content });
    }
  }
}

export function saveDocument(docId) {
  console.log('Saving document:', docId);
  
  const allDocsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  const allDocs = allDocsJson ? JSON.parse(allDocsJson) : [];
  
  const docIndex = allDocs.findIndex(d => d.id === docId);
  
  if (docIndex === -1) {
    console.log('Document not found in storage');
    return;
  }
  
  // Update document
  const titleInput = document.getElementById('documentTitle');
  const newContent = getEditorContent();
  console.log('New content to save:', newContent);
  
  allDocs[docIndex].title = titleInput.value || 'Untitled Document';
  allDocs[docIndex].content = newContent;
  allDocs[docIndex].updatedAt = Date.now();
  
  // Save to all documents
  saveAllDocuments(allDocs);
  console.log('Saved document to storage');
  
  // Update current document reference
  currentDocument = allDocs[docIndex];
  
  // Notify other users of the change
  if (isConnected) {
    console.log('Sending content change to other users');
    sendOperation({
      type: 'contentChange',
      content: newContent,
      documentId: docId,
      user: getCurrentUser()
    });
  }
}

export function deleteDocument(docId) {
  if (confirm('Are you sure you want to delete this document?')) {
    const allDocsJson = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    let allDocs = allDocsJson ? JSON.parse(allDocsJson) : [];
    
    // Filter out the document
    allDocs = allDocs.filter(d => d.id !== docId);
    saveAllDocuments(allDocs);
    
    // Update UI
    loadDocumentList();
    
    // If current document is deleted, close editor
    if (currentDocument && currentDocument.id === docId) {
      closeDocument();
      disconnectFromDocument(docId);
      currentDocument = null;
    }
    
    showNotification('Document deleted', 'success');
  }
}

export const getCurrentDocument = () => currentDocument;
