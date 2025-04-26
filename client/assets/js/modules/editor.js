import { renderMarkdown } from './markdown.js';
import { getCurrentUser } from './auth.js';
import { initHistory, recordChange } from './history.js';
import { updateCursorPosition, trackSelections } from './cursor.js';
import { getCurrentDocument, saveDocument } from './document.js';

let editorInitialized = false;

export const initEditor = () => {
  const editorContainer = document.getElementById('editorContainer');
  const welcome = document.getElementById('editorWelcome');
  const editor = document.getElementById('editor');
  const markdownEditor = document.getElementById('markdownEditor');
  const markdownPreview = document.getElementById('markdownPreview');
  const documentTitle = document.getElementById('documentTitle');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  
  if (editorInitialized) return;
  
  // Initialize undo/redo
  initHistory();
  
  // Setup Markdown editor
  if (markdownEditor) {
    markdownEditor.addEventListener('input', e => {
      const content = e.target.value;
      markdownPreview.innerHTML = renderMarkdown(content);
      
      // Record change for undo/redo
      recordChange(content);
      
      // Auto-save document
      const currentDoc = getCurrentDocument();
      if (currentDoc) {
        saveDocument(currentDoc.id);
      }
      
      // Broadcast changes to other users
      document.dispatchEvent(new CustomEvent('editor:contentChange', {
        detail: { content, user: getCurrentUser() }
      }));
    });
    
    // Track cursor and selection changes
    markdownEditor.addEventListener('keyup', updateCursorTracker);
    markdownEditor.addEventListener('click', updateCursorTracker);
    markdownEditor.addEventListener('select', trackSelections);
  }
  
  function updateCursorTracker() {
    const position = markdownEditor.selectionStart;
    updateCursorPosition(position);
  }
  
  // Title change event
  documentTitle.addEventListener('input', e => {
    document.dispatchEvent(new CustomEvent('editor:titleChange', {
      detail: { title: e.target.value, user: getCurrentUser() }
    }));
  });
  
  // Undo/Redo buttons
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('history:undo'));
    });
  }
  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('history:redo'));
    });
  }
  
  // Listen for undo/redo events
  document.addEventListener('history:contentUpdate', e => {
    markdownEditor.value = e.detail.content;
    markdownPreview.innerHTML = renderMarkdown(e.detail.content);
  });
  
  editorInitialized = true;
};

export const initNewDocument = (doc) => {
  const welcome = document.getElementById('editorWelcome');
  const editor = document.getElementById('editor');
  const markdownEditor = document.getElementById('markdownEditor');
  const markdownPreview = document.getElementById('markdownPreview');
  const documentTitle = document.getElementById('documentTitle');
  
  // Set up editor with document content
  if (welcome && editor && markdownEditor && markdownPreview && documentTitle) {
    welcome.classList.add('hidden');
    editor.classList.remove('hidden');
    markdownEditor.value = doc.content;
    markdownPreview.innerHTML = renderMarkdown(doc.content);
    documentTitle.value = doc.title;
  }
  
  // Reset history
  document.dispatchEvent(new CustomEvent('history:reset', {
    detail: { content: doc.content }
  }));
};

export const closeDocument = () => {
  const welcome = document.getElementById('editorWelcome');
  const editor = document.getElementById('editor');
  
  if (welcome && editor) {
    welcome.classList.remove('hidden');
    editor.classList.add('hidden');
  }
};

export const setEditorContent = (doc) => {
  const welcome = document.getElementById('editorWelcome');
  const editor = document.getElementById('editor');
  const markdownEditor = document.getElementById('markdownEditor');
  const markdownPreview = document.getElementById('markdownPreview');
  const documentTitle = document.getElementById('documentTitle');
  
  // Show editor
  if (welcome && editor && markdownEditor && markdownPreview && documentTitle) {
    welcome.classList.add('hidden');
    editor.classList.remove('hidden');
    markdownEditor.value = doc.content;
    markdownPreview.innerHTML = renderMarkdown(doc.content);
    documentTitle.value = doc.title;
  }
  
  // Reset history for this document
  document.dispatchEvent(new CustomEvent('history:reset', {
    detail: { content: doc.content }
  }));
};

export const getEditorContent = () => {
  const markdownEditor = document.getElementById('markdownEditor');
  return markdownEditor ? markdownEditor.value : '';
};

export const updateEditorContent = (content) => {
  const markdownEditor = document.getElementById('markdownEditor');
  const markdownPreview = document.getElementById('markdownPreview');
  
  if (markdownEditor && markdownPreview) {
    markdownEditor.value = content;
    markdownPreview.innerHTML = renderMarkdown(content);
  }
};
